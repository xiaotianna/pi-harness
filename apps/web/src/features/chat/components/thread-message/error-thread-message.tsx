import { ChatMessage as ChatMessagePrimitive } from "@agile-avocation/ui-pro";
import { ErrorState } from "../../../../components/ai/error-state";
import type { ChatErrorMessage } from "../../data/chat";

export function ErrorThreadMessage({ message }: { message: ChatErrorMessage }) {
  return (
    <ChatMessagePrimitive.Assistant className="!py-0">
      <ChatMessagePrimitive.Body>
        <ErrorState detail={message.content} title="回复生成失败" />
      </ChatMessagePrimitive.Body>
    </ChatMessagePrimitive.Assistant>
  );
}
