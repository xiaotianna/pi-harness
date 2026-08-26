import { ChatMessage as ChatMessagePrimitive } from "@agile-avocation/ui-pro";
import { AssistantMarkdown } from "../../../../components/ai/assistant-markdown";
import type { ChatAssistantMessage } from "../../data/chat";
import { MessageActions } from "../message-actions";

export function AssistantThreadMessage({ message }: { message: ChatAssistantMessage }) {
  return (
    <ChatMessagePrimitive.Assistant>
      <ChatMessagePrimitive.Body>
        <ChatMessagePrimitive.Content>
          <AssistantMarkdown>{message.content}</AssistantMarkdown>
        </ChatMessagePrimitive.Content>
        {message.actions ? (
          <MessageActions content={message.content} variant={message.actions} />
        ) : null}
      </ChatMessagePrimitive.Body>
    </ChatMessagePrimitive.Assistant>
  );
}
