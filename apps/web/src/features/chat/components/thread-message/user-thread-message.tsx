import { ChatMessage as ChatMessagePrimitive } from "@agile-avocation/ui-pro";
import { renderSkillMentions } from "../../../../components/ai/skill-mention";
import type { ChatUserMessage } from "../../data/chat";
import { renderChatContextMentions } from "../chat-context-mention";
import { MessageActions } from "../message-actions";
import { MessageAttachments } from "./message-attachments";

export function UserThreadMessage({ message }: { message: ChatUserMessage }) {
  return (
    <ChatMessagePrimitive.User>
      <MessageAttachments message={message} />
      {message.content ? (
        <ChatMessagePrimitive.Bubble>
          <ChatMessagePrimitive.Content>
            {renderChatContextMentions(renderSkillMentions(message.content))}
          </ChatMessagePrimitive.Content>
        </ChatMessagePrimitive.Bubble>
      ) : null}
      <MessageActions
        content={message.content}
        {...(message.timestamp === undefined ? {} : { timestamp: message.timestamp })}
        timestampPosition="start"
        variant="minimal"
      />
    </ChatMessagePrimitive.User>
  );
}
