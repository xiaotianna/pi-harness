import { ChatMessage as ChatMessagePrimitive } from "@agile-avocation/ui-pro";
import { Markdown } from "@agile-avocation/ui-pro/markdown";
import type { ChatAssistantMessage } from "../../data/chat";
import { MessageActions } from "../message-actions";

export function AssistantThreadMessage({ message }: { message: ChatAssistantMessage }) {
  return (
    <ChatMessagePrimitive.Assistant>
      <ChatMessagePrimitive.Body>
        <ChatMessagePrimitive.Content>
          <Markdown>{message.content}</Markdown>
        </ChatMessagePrimitive.Content>
        {message.actions ? (
          <MessageActions content={message.content} variant={message.actions} />
        ) : null}
      </ChatMessagePrimitive.Body>
    </ChatMessagePrimitive.Assistant>
  );
}
