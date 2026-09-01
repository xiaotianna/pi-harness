import { ChatMessage as ChatMessagePrimitive } from "@agile-avocation/ui-pro";
import { AssistantMarkdown } from "../../../../components/ai/assistant-markdown";
import type { ChatAssistantMessage } from "../../data/chat";
import { MessageActions } from "../message-actions";
import { TurnFileChanges } from "../turn-file-changes";

export function AssistantThreadMessage({ message }: { message: ChatAssistantMessage }) {
  return (
    <ChatMessagePrimitive.Assistant className={message.content ? undefined : "!py-0"}>
      <ChatMessagePrimitive.Body>
        {message.content ? (
          <ChatMessagePrimitive.Content>
            <AssistantMarkdown>{message.content}</AssistantMarkdown>
          </ChatMessagePrimitive.Content>
        ) : null}
        {message.fileChanges?.length && message.turnId ? (
          <TurnFileChanges
            files={message.fileChanges}
            isReverted={message.areFileChangesReverted ?? false}
            sessionId={message.sessionId}
            turnId={message.turnId}
          />
        ) : null}
        {message.actions ? (
          <MessageActions
            content={message.actionContent ?? message.content}
            {...(message.timestamp === undefined ? {} : { timestamp: message.timestamp })}
            timestampPosition="end"
            variant={message.actions}
          />
        ) : null}
      </ChatMessagePrimitive.Body>
    </ChatMessagePrimitive.Assistant>
  );
}
