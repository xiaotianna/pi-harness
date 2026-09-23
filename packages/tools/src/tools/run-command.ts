import type { AgentTool, AgentToolUpdateCallback } from "@earendil-works/pi-agent-core";
import { Type } from "typebox";
import type { CommandProcessSnapshot } from "../command-process.js";
import type { WorkspaceToolContext } from "../lib/tool-context.js";
import type { FileChangeDetails } from "../utils/file.js";
import {
  captureWorkspaceTextSnapshot,
  type WorkspaceTextSnapshot,
} from "../utils/workspace-file-changes.js";

const DEFAULT_TIMEOUT_MS = 4 * 60 * 60_000;
const MAX_TIMEOUT_MS = 24 * 60 * 60_000;
const DEFAULT_YIELD_TIME_MS = 10_000;
const MAX_YIELD_TIME_MS = 30_000;

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
      description: "进程总生存时间，默认 4 小时，最长 24 小时",
      maximum: MAX_TIMEOUT_MS,
      minimum: 1,
    }),
  ),
  yieldTimeMs: Type.Optional(
    Type.Integer({
      description: "等待命令退出的时间；超过后返回 processId 并转为受监管后台任务",
      maximum: MAX_YIELD_TIME_MS,
      minimum: 250,
    }),
  ),
});

interface RunCommandProgressDetails {
  stage: "preparing" | "running";
}

interface RunCommandBackgroundDetails {
  process: CommandProcessSnapshot;
  stage: "background";
}

interface RunCommandCompletedDetails {
  fileChanges: readonly FileChangeDetails[];
  fileChangesTruncated: boolean;
  process: CommandProcessSnapshot;
  stage: "completed";
}

export type RunCommandDetails =
  | RunCommandProgressDetails
  | RunCommandBackgroundDetails
  | RunCommandCompletedDetails;

function terminalFailure(snapshot: CommandProcessSnapshot): Error {
  const output = snapshot.output.trim();
  const suffix = output ? `\n${output}` : "";
  if (snapshot.status === "timed_out") {
    return new Error(`TOOL_TIMEOUT: 命令执行超时${suffix}`);
  }
  if (snapshot.status === "aborted" || snapshot.status === "stopped") {
    return new Error(`TOOL_COMMAND_STOPPED: 命令已停止${suffix}`);
  }
  if (snapshot.status === "daemon_stopped") {
    return new Error(`TOOL_COMMAND_STOPPED: daemon 已停止命令${suffix}`);
  }
  return new Error(`TOOL_COMMAND_FAILED: 命令退出码 ${snapshot.exitCode ?? "未知"}${suffix}`);
}

export function createRunCommandTool(
  context: WorkspaceToolContext,
): AgentTool<typeof RunCommandParameters, RunCommandDetails> {
  return {
    name: "run_command",
    label: "Run command",
    description:
      "在固定 workspace 根目录执行 Shell 命令。命令在 yieldTimeMs 内退出时返回最终结果；仍在运行时返回 processId 并作为受监管后台任务继续执行。后台运行只表示进程仍存活，不表示命令已成功；安装、登录和其他必须完成的任务应调用 wait_command 等待退出码。",
    parameters: RunCommandParameters,
    executionMode: "sequential",
    async execute(toolCallId, input, signal, onUpdate) {
      const manager = context.commandProcesses;
      const runId = context.getActiveRunId?.();
      if (!manager || !runId) throw new Error("COMMAND_PROCESS_UNAVAILABLE: 当前没有活动 Run");
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
      const started = await manager.start({
        beforeSnapshot,
        command: input.command,
        runId,
        ...(signal === undefined ? {} : { signal }),
        timeoutMs: input.timeoutMs ?? DEFAULT_TIMEOUT_MS,
        toolCallId,
      });
      const abort = () => {
        void manager.stop(started.processId);
      };
      signal?.addEventListener("abort", abort, { once: true });
      try {
        const snapshot = await manager.wait(
          started.processId,
          input.yieldTimeMs ?? DEFAULT_YIELD_TIME_MS,
        );
        signal?.throwIfAborted();
        if (snapshot.status === "running") {
          manager.detach(snapshot.processId);
          return {
            content: [
              {
                type: "text",
                text: `${snapshot.output || "命令已启动，暂时没有输出。"}\n\n后台任务仍在运行，processId: ${snapshot.processId}`,
              },
            ],
            details: { process: snapshot, stage: "background" },
          };
        }

        const completed = manager.consumeFileChanges(snapshot.processId);
        context.onCommandFileChangesDetected?.({
          changes: completed.fileChanges,
          toolCallId,
        });
        if (snapshot.status !== "completed") throw terminalFailure(snapshot);
        const trackingNotice = completed.fileChangesTruncated ? "\n\n[文件变更统计可能不完整]" : "";
        return {
          content: [
            {
              type: "text",
              text: (snapshot.output || "(no output)") + trackingNotice,
            },
          ],
          details: {
            fileChanges: completed.fileChanges,
            fileChangesTruncated: completed.fileChangesTruncated,
            process: snapshot,
            stage: "completed",
          },
        };
      } finally {
        signal?.removeEventListener("abort", abort);
      }
    },
  };
}
