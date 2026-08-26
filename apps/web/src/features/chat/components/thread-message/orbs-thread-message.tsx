import { ChatMessage as ChatMessagePrimitive } from "@agile-avocation/ui-pro";
import { GenerationLoader } from "../../../../components/ai/generation-loader";
import type { ChatOrbsMessage } from "../../data/chat";

export function OrbsThreadMessage({ message }: { message: ChatOrbsMessage }) {
  return (
    <ChatMessagePrimitive.Assistant className="!py-0">
      <ChatMessagePrimitive.Body>
        <GenerationLoader label={message.label} />
      </ChatMessagePrimitive.Body>
    </ChatMessagePrimitive.Assistant>
  );
}
