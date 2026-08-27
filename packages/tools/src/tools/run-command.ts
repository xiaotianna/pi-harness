import type { AgentTool, AgentToolUpdateCallback } from "@earendil-works/pi-agent-core";
import { truncateTail } from "@earendil-works/pi-agent-core";
import { execaCommand } from "execa";
import { Type } from "typebox";
import { resolveToolPath, type WorkspaceToolContext } from "../lib/tool-context.js";
import type { FileChangeDetails } from "../utils/file.js";
import {
  captureWorkspaceTextSnapshot,
  collectWorkspaceFileChanges,
  type WorkspaceFileChanges,
  type WorkspaceTextSnapshot,
} from "../utils/workspace-file-changes.js";

const DEFAULT_TIMEOUT_MS = 120_000;
const MAX_TIMEOUT_MS = 600_000;
const MAX_CAPTURE_BYTES = 1024 * 1024;
const UPDATE_THROTTLE_MS = 100;

const RunCommandParameters = Type.Object({
  command: Type.String({ description: "在 workspace 根目录执行的 Shell 命令", minLength: 1 }),
  timeoutMs: Type.Optional(
    Type.Integer({
      description: "超时时间，默认 120000ms",
      maximum: MAX_TIMEOUT_MS,
      minimum: 1,
    }),
  ),
});

interface RunCommandProgressDetails {
  stage: "collecting_changes" | "preparing" | "running";
}

interface RunCommandCompletedDetails {
  durationMs: number;
  exitCode: number | null;
  fileChanges: readonly FileChangeDetails[];
  fileChangesTruncated: boolean;
  stage: "completed";
  truncated: boolean;
}

export type RunCommandDetails = RunCommandProgressDetails | RunCommandCompletedDetails;

const PASSTHROUGH_ENV_NAMES = [
  "HOME",
  "LANG",
  "LC_ALL",
  "PATH",
  "SHELL",
  "TERM",
  "TMPDIR",
  "USER",
] as const;

function commandEnvironment(): NodeJS.ProcessEnv {
  return Object.fromEntries(
    PASSTHROUGH_ENV_NAMES.flatMap((name) => {
      const value = process.env[name];
      return value === undefined ? [] : [[name, value]];
    }),
  );
}

/**
 * run_command 工具
 * 调度：串行（executionMode：sequential）
 * 实际执行：在固定 workspace 根目录用 Shell 执行命令，只传递白名单环境变量，支持取消、超时和 1MB 输出限制。
 */
export function createRunCommandTool(
  context: WorkspaceToolContext,
): AgentTool<typeof RunCommandParameters, RunCommandDetails> {
  return {
    name: "run_command",
    label: "Run command",
    description: "在固定的 workspace 根目录执行 Shell 命令，支持取消、超时和输出限制。",
    parameters: RunCommandParameters,
    executionMode: "sequential",
    async execute(_toolCallId, input, signal, onUpdate) {
      const workspaceRoot = await resolveToolPath(context, ".");
      const update = (
        stage: RunCommandProgressDetails["stage"],
        text: string,
        callback: AgentToolUpdateCallback<RunCommandDetails> | undefined = onUpdate,
      ) => callback?.({ content: [{ type: "text", text }], details: { stage } });

      update("preparing", "正在扫描命令前的文件状态…");
      let beforeSnapshot: WorkspaceTextSnapshot | null = null;
      try {
        beforeSnapshot = await captureWorkspaceTextSnapshot(context, signal);
      } catch (error: unknown) {
        if (signal?.aborted) throw error;
      }

      update("running", "命令已启动，等待输出…");
      const subprocess = execaCommand(input.command, {
        all: true,
        cwd: workspaceRoot,
        env: commandEnvironment(),
        extendEnv: false,
        maxBuffer: MAX_CAPTURE_BYTES,
        reject: false,
        shell: true,
        timeout: input.timeoutMs ?? DEFAULT_TIMEOUT_MS,
        ...(signal === undefined ? {} : { cancelSignal: signal }),
      });
      let liveOutput = "";
      let updateTimer: ReturnType<typeof setTimeout> | undefined;
      let lastUpdateAt = 0;
      const emitOutput = () => {
        updateTimer = undefined;
        lastUpdateAt = Date.now();
        update("running", truncateTail(liveOutput).content || "命令已启动，等待输出…");
      };
      subprocess.all?.on("data", (chunk: Buffer | string) => {
        liveOutput += chunk.toString();
        const delay = UPDATE_THROTTLE_MS - (Date.now() - lastUpdateAt);
        if (delay <= 0) emitOutput();
        else updateTimer ??= setTimeout(emitOutput, delay);
      });

      const result = await subprocess.finally(() => {
        if (updateTimer) clearTimeout(updateTimer);
      });
      const output = truncateTail(result.all);

      if (result.isCanceled) throw new Error("命令已取消");
      if (result.timedOut)
        throw new Error(`TOOL_TIMEOUT: 命令执行超过 ${input.timeoutMs ?? DEFAULT_TIMEOUT_MS}ms`);
      if (result.isMaxBuffer) throw new Error("TOOL_OUTPUT_LIMIT: 命令输出超过 1MB 限制");
      if (result.failed) {
        throw new Error(`TOOL_COMMAND_FAILED: ${output.content || "命令执行失败"}`);
      }

      update(
        "collecting_changes",
        output.content
          ? `${output.content}\n\n正在统计文件变化…`
          : "命令执行完成，正在统计文件变化…",
      );
      let fileChanges: WorkspaceFileChanges = { changes: [], truncated: true };
      if (beforeSnapshot !== null) {
        try {
          fileChanges = await collectWorkspaceFileChanges(context, beforeSnapshot, signal);
        } catch (error: unknown) {
          if (signal?.aborted) throw error;
        }
      }
      const trackingNotice = fileChanges.truncated ? "\n\n[文件变更统计可能不完整]" : "";

      return {
        content: [{ type: "text", text: (output.content || "(no output)") + trackingNotice }],
        details: {
          durationMs: result.durationMs,
          exitCode: result.exitCode ?? null,
          fileChanges: fileChanges.changes,
          fileChangesTruncated: fileChanges.truncated,
          stage: "completed",
          truncated: output.truncated,
        },
      };
    },
  };
}
