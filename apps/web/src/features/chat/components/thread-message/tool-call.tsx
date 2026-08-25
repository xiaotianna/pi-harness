import { ChatTool } from "@agile-avocation/ui-pro/chat-tool";
import type { ChatMessageTool } from "../../data/chat";

export function ToolCall({ tool }: { tool: ChatMessageTool }) {
  const isAwaitingApproval = tool.state === "requires-action";
  return (
    <ChatTool
      defaultExpanded={tool.state === "output-error"}
      state={tool.state}
      toolName={tool.toolName}
      triggerPrefix={isAwaitingApproval ? "等待审批：" : "已使用工具："}
      {...(isAwaitingApproval
        ? {}
        : {
            ...(tool.argsText !== undefined ? { argsText: tool.argsText } : {}),
            ...(tool.errorText !== undefined ? { errorText: tool.errorText } : {}),
            ...(tool.input !== undefined ? { input: tool.input } : {}),
            ...(tool.output !== undefined ? { output: tool.output } : {}),
            ...(tool.toolCallId !== undefined ? { toolCallId: tool.toolCallId } : {}),
          })}
    />
  );
}
