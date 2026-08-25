import { ChatMessage as ChatMessagePrimitive, TextShimmer } from "@agile-avocation/ui-pro";
import { Orbs } from "../../../../components/ai/aicss/aicss-components";
import type { ChatStreamingMessage } from "../../data/chat";

export function StreamingThreadMessage({ message }: { message: ChatStreamingMessage }) {
  return (
    <ChatMessagePrimitive.Assistant aria-live="polite" className="!py-0">
      <ChatMessagePrimitive.Body>
        <TextShimmer className="text-muted">{message.label}</TextShimmer>
        <Orbs label={message.label} />
      </ChatMessagePrimitive.Body>
    </ChatMessagePrimitive.Assistant>
  );
}
