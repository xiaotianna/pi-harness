import { ChatMessage as ChatMessagePrimitive } from "@agile-avocation/ui-pro";
import { GenerationLoader } from "../../../../components/ai/generation-loader";
import type { ChatLoadingMessage } from "../../data/chat";

export function LoadingThreadMessage({ message }: { message: ChatLoadingMessage }) {
  return (
    <ChatMessagePrimitive.Assistant aria-busy="true" aria-live="polite" className="!py-0">
      <ChatMessagePrimitive.Body>
        <GenerationLoader label={message.label} />
      </ChatMessagePrimitive.Body>
    </ChatMessagePrimitive.Assistant>
  );
}
