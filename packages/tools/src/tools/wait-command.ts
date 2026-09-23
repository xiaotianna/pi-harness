import type { AgentTool } from "@earendil-works/pi-agent-core";
import { Type } from "typebox";
import type { WorkspaceToolContext } from "../lib/tool-context.js";

const WaitCommandParameters = Type.Object({
  processId: Type.String({ format: "uuid" }),
  yieldTimeMs: Type.Optional(Type.Integer({ maximum: 30_000, minimum: 250 })),
});

export function createWaitCommandTool(
  context: WorkspaceToolContext,
): AgentTool<typeof WaitCommandParameters> {
  return {
    name: "wait_command",
    label: "Wait for command",
    description:
      "等待受监管后台命令产生新状态。返回 running 时命令尚未完成；只有 completed 且 exitCode 为 0 才表示成功。",
    parameters: WaitCommandParameters,
    executionMode: "parallel",
    async execute(_toolCallId, input, signal) {
      const manager = context.commandProcesses;
      if (!manager) throw new Error("COMMAND_PROCESS_UNAVAILABLE: 后台命令管理器不可用");
      signal?.throwIfAborted();
      const snapshot = await manager.wait(input.processId, input.yieldTimeMs ?? 30_000);
      signal?.throwIfAborted();
      return {
        content: [
          {
            type: "text",
            text: `${snapshot.output || "命令暂时没有输出。"}\n\nstatus: ${snapshot.status}\nexitCode: ${snapshot.exitCode ?? "null"}\nsignal: ${snapshot.signal ?? "null"}`,
          },
        ],
        details: { process: snapshot },
      };
    },
  };
}
