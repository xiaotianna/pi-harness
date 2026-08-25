import { ChatMessage as ChatMessagePrimitive } from "@agile-avocation/ui-pro";
import { Orbs } from "../../../../components/ai/aicss/aicss-components";
import type { ChatLoadingMessage } from "../../data/chat";

export function LoadingThreadMessage({ message }: { message: ChatLoadingMessage }) {
  return (
    <ChatMessagePrimitive.Assistant aria-busy="true" aria-live="polite" className="!py-0">
      <ChatMessagePrimitive.Body>
        <Orbs label={message.label} />
      </ChatMessagePrimitive.Body>
    </ChatMessagePrimitive.Assistant>
  );
}
