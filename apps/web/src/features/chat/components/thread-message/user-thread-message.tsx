import { ChatMessage as ChatMessagePrimitive } from "@agile-avocation/ui-pro";
import type { ChatUserMessage } from "../../data/chat";
import { MessageActions } from "../message-actions";
import { MessageAttachments } from "./message-attachments";

export function UserThreadMessage({ message }: { message: ChatUserMessage }) {
  return (
    <ChatMessagePrimitive.User>
      <MessageAttachments message={message} />
      <ChatMessagePrimitive.Bubble>
        <ChatMessagePrimitive.Content>{message.content}</ChatMessagePrimitive.Content>
      </ChatMessagePrimitive.Bubble>
      <MessageActions content={message.content} variant="minimal" />
    </ChatMessagePrimitive.User>
  );
}
