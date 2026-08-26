import { ChatMessage as ChatMessagePrimitive } from "@agile-avocation/ui-pro";
import { AssistantMarkdown } from "../../../../components/ai/assistant-markdown";
import type { ChatAssistantMessage } from "../../data/chat";
import { useTypewriterText } from "../../hooks/use-typewriter-text";
import { MessageActions } from "../message-actions";

export function AssistantThreadMessage({ message }: { message: ChatAssistantMessage }) {
  const [content, isTyping] = useTypewriterText(message.content, message.shouldTypewrite ?? false);

  return (
    <ChatMessagePrimitive.Assistant>
      <ChatMessagePrimitive.Body>
        <ChatMessagePrimitive.Content>
          <AssistantMarkdown>{content}</AssistantMarkdown>
        </ChatMessagePrimitive.Content>
        {message.actions && !isTyping ? (
          <MessageActions content={message.content} variant={message.actions} />
        ) : null}
      </ChatMessagePrimitive.Body>
    </ChatMessagePrimitive.Assistant>
  );
}
