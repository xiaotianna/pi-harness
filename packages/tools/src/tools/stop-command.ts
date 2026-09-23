import type { AgentTool } from "@earendil-works/pi-agent-core";
import { Type } from "typebox";
import type { WorkspaceToolContext } from "../lib/tool-context.js";

const StopCommandParameters = Type.Object({
  processId: Type.String({ format: "uuid" }),
});

export function createStopCommandTool(
  context: WorkspaceToolContext,
): AgentTool<typeof StopCommandParameters> {
  return {
    name: "stop_command",
    label: "Stop command",
    description: "停止当前 Session 中指定的受监管后台命令及其进程树。",
    parameters: StopCommandParameters,
    executionMode: "sequential",
    async execute(_toolCallId, input) {
      const manager = context.commandProcesses;
      if (!manager) throw new Error("COMMAND_PROCESS_UNAVAILABLE: 后台命令管理器不可用");
      if (!(await manager.stop(input.processId))) {
        throw new Error("COMMAND_PROCESS_NOT_RUNNING: 后台命令不存在或已经结束");
      }
      return {
        content: [{ type: "text", text: `已停止后台命令 ${input.processId}` }],
        details: { processId: input.processId, status: "stopped" },
      };
    },
  };
}
