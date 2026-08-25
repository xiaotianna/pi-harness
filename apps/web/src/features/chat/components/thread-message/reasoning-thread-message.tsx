import { ChatMessage as ChatMessagePrimitive } from "@agile-avocation/ui-pro";
import { ThinkingReasoning } from "../../../../components/ai/aicss/aicss-components";
import type { ChatReasoningMessage } from "../../data/chat";

export function ReasoningThreadMessage({ message }: { message: ChatReasoningMessage }) {
  return (
    <ChatMessagePrimitive.Assistant className="!py-0">
      <ChatMessagePrimitive.Body>
        <ThinkingReasoning
          defaultExpanded={message.defaultExpanded ?? false}
          isStreaming={message.isStreaming ?? false}
          steps={message.steps}
          trigger={message.trigger}
        />
      </ChatMessagePrimitive.Body>
    </ChatMessagePrimitive.Assistant>
  );
}
