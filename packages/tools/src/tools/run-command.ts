import type { AgentTool } from "@earendil-works/pi-agent-core";
import { truncateTail } from "@earendil-works/pi-agent-core";
import { execaCommand } from "execa";
import { Type } from "typebox";
import { resolveToolPath, type WorkspaceToolContext } from "../lib/tool-context.js";

const DEFAULT_TIMEOUT_MS = 120_000;
const MAX_TIMEOUT_MS = 600_000;
const MAX_CAPTURE_BYTES = 1024 * 1024;

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

export interface RunCommandDetails {
  durationMs: number;
  exitCode: number | null;
  truncated: boolean;
}

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
    async execute(_toolCallId, input, signal) {
      const workspaceRoot = await resolveToolPath(context, ".");
      const result = await execaCommand(input.command, {
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
      const output = truncateTail(result.all);

      if (result.isCanceled) throw new Error("命令已取消");
      if (result.timedOut)
        throw new Error(`命令执行超过 ${input.timeoutMs ?? DEFAULT_TIMEOUT_MS}ms`);
      if (result.failed) {
        throw new Error(`${result.shortMessage || "命令执行失败"}\n\n${output.content}`.trim());
      }

      return {
        content: [{ type: "text", text: output.content || "(no output)" }],
        details: {
          durationMs: result.durationMs,
          exitCode: result.exitCode ?? null,
          truncated: output.truncated,
        },
      };
    },
  };
}
