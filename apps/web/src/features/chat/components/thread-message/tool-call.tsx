import { useState } from "react";
import { ToolCall as ToolCallElement } from "../../../../components/ai/tool-call";
import { type ChatMessageTool, ChatToolState } from "../../data/chat";

export function ToolCall({ tool }: { tool: ChatMessageTool }) {
  const isAwaitingApproval = tool.state === ChatToolState.REQUIRES_ACTION;
  const isFailed = tool.state === ChatToolState.OUTPUT_ERROR;
  const isRunning = tool.state === ChatToolState.INPUT_AVAILABLE || isAwaitingApproval;
  const [isOpen, setIsOpen] = useState(false);

  return (
    <ToolCallElement
      activeLabel={isAwaitingApproval ? "等待审批" : "正在使用工具"}
      failed={isFailed}
      label={isFailed ? "工具调用失败" : "已使用工具"}
      onOpenChange={setIsOpen}
      open={isOpen}
      query={tool.toolName}
      request={tool.argsText ?? JSON.stringify(tool.input ?? {}, null, 2) ?? ""}
      result={tool.errorText ?? JSON.stringify(tool.output ?? {}, null, 2) ?? ""}
      running={isRunning}
    />
  );
}
