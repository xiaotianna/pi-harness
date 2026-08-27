import { ChatMessage as ChatMessagePrimitive } from "@agile-avocation/ui-pro";
import { ErrorState } from "../../../../components/ai/error-state";
import { CHAT_RESPONSE_FAILED_LABEL } from "../../constants/chat-response";
import type { ChatErrorMessage } from "../../data/chat";

export function ErrorThreadMessage({ message }: { message: ChatErrorMessage }) {
  return (
    <ChatMessagePrimitive.Assistant className="!py-0">
      <ChatMessagePrimitive.Body>
        <ErrorState detail={message.content} title={CHAT_RESPONSE_FAILED_LABEL} />
      </ChatMessagePrimitive.Body>
    </ChatMessagePrimitive.Assistant>
  );
}
