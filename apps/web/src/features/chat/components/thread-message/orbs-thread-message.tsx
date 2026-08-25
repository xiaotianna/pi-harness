import { ChatMessage as ChatMessagePrimitive } from "@agile-avocation/ui-pro";
import { Orbs } from "../../../../components/ai/aicss/aicss-components";
import type { ChatOrbsMessage } from "../../data/chat";

export function OrbsThreadMessage({ message }: { message: ChatOrbsMessage }) {
  return (
    <ChatMessagePrimitive.Assistant className="!py-0">
      <ChatMessagePrimitive.Body>
        <Orbs label={message.label} />
      </ChatMessagePrimitive.Body>
    </ChatMessagePrimitive.Assistant>
  );
}
