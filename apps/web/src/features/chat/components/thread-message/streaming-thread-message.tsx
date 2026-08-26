import { ChatMessage as ChatMessagePrimitive } from "@agile-avocation/ui-pro";
import { ThinkingIndicator } from "../../../../components/ai/thinking-indicator";
import type { ChatStreamingMessage } from "../../data/chat";

export function StreamingThreadMessage({ message }: { message: ChatStreamingMessage }) {
  return (
    <ChatMessagePrimitive.Assistant aria-live="polite" className="!py-0">
      <ChatMessagePrimitive.Body>
        <ThinkingIndicator label={message.label} />
      </ChatMessagePrimitive.Body>
    </ChatMessagePrimitive.Assistant>
  );
}
