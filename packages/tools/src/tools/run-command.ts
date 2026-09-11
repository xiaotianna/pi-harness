import type { AgentTool, AgentToolUpdateCallback } from "@earendil-works/pi-agent-core";
import { truncateTail } from "@earendil-works/pi-agent-core";
import { readSandboxPolicy, SandboxProfile } from "@pi-harness/policy";
import { runSandboxedCommand } from "@pi-harness/sandbox";
import { execa } from "execa";
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
const MAX_APPROVAL_PREVIEW_CHARS = 65_536;
const UPDATE_THROTTLE_MS = 100;
const HOST_ENVIRONMENT_NAMES = [
  "APPDATA",
  "COMSPEC",
  "HOME",
  "LANG",
  "LC_ALL",
  "LOCALAPPDATA",
  "PATH",
  "PATHEXT",
  "SYSTEMROOT",
  "TEMP",
  "TERM",
  "TMP",
  "TMPDIR",
  "USER",
  "USERPROFILE",
] as const;

const RunCommandParameters = Type.Object({
  command: Type.String({
    description: "在 workspace 根目录执行的 Shell 命令",
    minLength: 1,
    maxLength: 65_536,
  }),
  prefixRule: Type.Optional(
    Type.Array(Type.String({ maxLength: 256, minLength: 1 }), {
      description:
        "仅在命令安全、非破坏且可按类别复用时提供有序 argv 前缀，供用户选择允许类似命令；不要为 Shell、解释器或 rm 类命令建议规则",
      maxItems: 16,
      minItems: 1,
    }),
  ),
  timeoutMs: Type.Optional(
    Type.Integer({
      description: "超时时间，默认 120000ms",
      maximum: MAX_TIMEOUT_MS,
      minimum: 1,
    }),
  ),
});

interface RunCommandProgressDetails {
  stage: "awaiting_approval" | "collecting_changes" | "preparing" | "running";
}

interface RunCommandCompletedDetails {
  durationMs: number;
  exitCode: number | null;
  fileChanges: readonly FileChangeDetails[];
  fileChangesTruncated: boolean;
  stage: "completed";
  sandbox: {
    elevated: boolean;
    level: "host" | "isolated";
    network: "host" | "policy";
    outputBytes: number;
    target: ".";
    violations: readonly string[];
  };
  truncated: boolean;
}

export type RunCommandDetails = RunCommandProgressDetails | RunCommandCompletedDetails;

function runHostCommand(input: {
  command: string;
  maxOutputBytes: number;
  onOutput: (chunk: string) => void;
  signal?: AbortSignal;
  timeoutMs: number;
  workspaceRoot: string;
}) {
  const subprocess = execa(input.command, {
    all: true,
    cwd: input.workspaceRoot,
    env: Object.fromEntries(
      HOST_ENVIRONMENT_NAMES.flatMap((name) =>
        process.env[name] === undefined ? [] : [[name, process.env[name]]],
      ),
    ),
    extendEnv: false,
    killSignal: "SIGKILL",
    maxBuffer: input.maxOutputBytes,
    reject: false,
    shell: true,
    timeout: input.timeoutMs,
    ...(input.signal === undefined ? {} : { cancelSignal: input.signal }),
  });
  subprocess.all?.on("data", (chunk: Buffer | string) => input.onOutput(chunk.toString()));
  return subprocess;
}

/**
 * run_command 工具
 * 调度：串行（executionMode：sequential）
 * 实际执行：在固定 workspace 根目录用 Shell 执行命令，通过独立 SRT 进程限制文件与网络访问，支持取消、超时和 1MB 输出限制。
 */
export function createRunCommandTool(
  context: WorkspaceToolContext,
  getSkillReadPaths: () => readonly string[] = () => [],
): AgentTool<typeof RunCommandParameters, RunCommandDetails> {
  return {
    name: "run_command",
    label: "Run command",
    description:
      "在沙箱内以固定 workspace 根目录执行 Shell 命令；网络由用户策略控制，允许列表为空时放行未被拒绝的目标，HOME 和临时文件按调用隔离。支持取消、超时和输出限制；安全且适合复用审批的单条命令应同时提供 prefixRule。",
    parameters: RunCommandParameters,
    executionMode: "sequential",
    async execute(toolCallId, input, signal, onUpdate) {
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
      let liveOutput = "";
      let updateTimer: ReturnType<typeof setTimeout> | undefined;
      let lastUpdateAt = 0;
      const emitOutput = () => {
        updateTimer = undefined;
        lastUpdateAt = Date.now();
        update("running", truncateTail(liveOutput).content || "命令已启动，等待输出…");
      };
      const sandboxPolicy = await readSandboxPolicy(context.globalRoot, signal);
      const sandboxResult = await runSandboxedCommand({
        command: input.command,
        commandId: toolCallId,
        workspaceRoot,
        protectedPaths: [...(context.protectedPaths ?? []), context.globalRoot],
        allowedDomains: sandboxPolicy.network.allowedDomains,
        deniedDomains: sandboxPolicy.network.deniedDomains,
        credentials: context.getSandboxCredentials?.() ?? [],
        isWorkspaceWritable: sandboxPolicy.profile === SandboxProfile.WORKSPACE_WRITE,
        onNetworkApproval: ({ host, port }) =>
          context.onNetworkAccessRequested?.(
            { host, ...(port === undefined ? {} : { port }), toolCallId },
            signal,
          ) ?? Promise.resolve(false),
        readPaths: getSkillReadPaths(),
        timeoutMs: input.timeoutMs ?? DEFAULT_TIMEOUT_MS,
        maxOutputBytes: MAX_CAPTURE_BYTES,
        ...(signal === undefined ? {} : { signal }),
        onOutput(chunk) {
          liveOutput = (liveOutput + chunk).slice(-MAX_CAPTURE_BYTES);
          const delay = UPDATE_THROTTLE_MS - (Date.now() - lastUpdateAt);
          if (delay <= 0) emitOutput();
          else updateTimer ??= setTimeout(emitOutput, delay);
        },
      }).finally(() => {
        if (updateTimer) clearTimeout(updateTimer);
      });
      const sandboxViolations = sandboxResult.violations;
      let result:
        | Awaited<ReturnType<typeof runHostCommand>>
        | Awaited<ReturnType<typeof runSandboxedCommand>> = sandboxResult;
      let output = truncateTail(result.all ?? "");
      let totalDurationMs = result.durationMs;
      let isElevated = false;

      const collectChanges = async (status: string): Promise<WorkspaceFileChanges> => {
        update("collecting_changes", status);
        if (beforeSnapshot === null) return { changes: [], truncated: true };
        try {
          return await collectWorkspaceFileChanges(context, beforeSnapshot, signal);
        } catch (error: unknown) {
          if (signal?.aborted) throw error;
          return { changes: [], truncated: true };
        }
      };
      const recordFailedChanges = (fileChanges: WorkspaceFileChanges) => {
        context.onCommandFileChangesDetected?.({
          changes: fileChanges.changes,
          toolCallId,
        });
      };

      if (result.isCanceled) throw new Error("命令已取消");
      if (result.failed && sandboxViolations.length > 0) {
        const sandboxChanges = await collectChanges("沙箱已阻止命令，正在确认已产生的文件变化…");
        const reason =
          truncateTail(sandboxViolations.join("\n")).content.slice(-MAX_APPROVAL_PREVIEW_CHARS) ||
          "SRT 已阻止命令访问受限资源。";
        update(
          "awaiting_approval",
          `${output.content || "命令被沙箱阻止"}\n\n沙箱原因：\n${reason}`,
        );
        let approved = false;
        try {
          approved =
            (await context.onHostExecutionRequested?.(
              {
                changedFileCount: sandboxChanges.changes.length,
                command: input.command,
                reason,
                toolCallId,
              },
              signal,
            )) ?? false;
        } catch (error: unknown) {
          recordFailedChanges(sandboxChanges);
          throw error;
        }
        if (!approved) {
          recordFailedChanges(sandboxChanges);
          throw new Error(
            `SANDBOX_ESCALATION_REJECTED: 未批准在宿主机重新执行。\nSANDBOX_VIOLATIONS: ${JSON.stringify(sandboxViolations)}`,
          );
        }

        const currentWorkspaceRoot = await resolveToolPath(context, ".");
        liveOutput = "";
        update("running", "已批准提升权限，正在宿主机重新执行命令…");
        result = await runHostCommand({
          command: input.command,
          maxOutputBytes: MAX_CAPTURE_BYTES,
          onOutput(chunk) {
            liveOutput = (liveOutput + chunk).slice(-MAX_CAPTURE_BYTES);
            const delay = UPDATE_THROTTLE_MS - (Date.now() - lastUpdateAt);
            if (delay <= 0) emitOutput();
            else updateTimer ??= setTimeout(emitOutput, delay);
          },
          ...(signal === undefined ? {} : { signal }),
          timeoutMs: input.timeoutMs ?? DEFAULT_TIMEOUT_MS,
          workspaceRoot: currentWorkspaceRoot,
        }).finally(() => {
          if (updateTimer) clearTimeout(updateTimer);
        });
        isElevated = true;
        totalDurationMs += result.durationMs;
        output = truncateTail(result.all ?? "");
      }

      if (result.isCanceled) throw new Error("命令已取消");
      const fileChanges = await collectChanges(
        result.failed
          ? "命令执行失败，正在统计已产生的文件变化…"
          : output.content
            ? `${output.content}\n\n正在统计文件变化…`
            : "命令执行完成，正在统计文件变化…",
      );
      const trackingNotice = fileChanges.truncated ? "\n\n[文件变更统计可能不完整]" : "";

      if (result.timedOut) {
        recordFailedChanges(fileChanges);
        throw new Error(`TOOL_TIMEOUT: 命令执行超过 ${input.timeoutMs ?? DEFAULT_TIMEOUT_MS}ms`);
      }
      if (result.isMaxBuffer) {
        recordFailedChanges(fileChanges);
        throw new Error("TOOL_OUTPUT_LIMIT: 命令输出超过 1MB 限制");
      }
      if (result.failed) {
        recordFailedChanges(fileChanges);
        const violation =
          sandboxViolations.length === 0
            ? ""
            : `\nSANDBOX_VIOLATIONS: ${JSON.stringify(sandboxViolations)}`;
        throw new Error(
          `TOOL_COMMAND_FAILED: ${output.content || "命令执行失败"}${violation}${trackingNotice}`,
        );
      }

      return {
        content: [{ type: "text", text: (output.content || "(no output)") + trackingNotice }],
        details: {
          durationMs: totalDurationMs,
          exitCode: result.exitCode ?? null,
          fileChanges: fileChanges.changes,
          fileChangesTruncated: fileChanges.truncated,
          stage: "completed",
          sandbox: {
            elevated: isElevated,
            level: isElevated ? "host" : "isolated",
            target: ".",
            network: isElevated ? "host" : "policy",
            outputBytes: Buffer.byteLength(result.all ?? ""),
            violations: sandboxViolations,
          },
          truncated: output.truncated,
        },
      };
    },
  };
}
