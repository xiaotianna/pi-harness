"use client";

import { ChatMessage as ChatMessagePrimitive } from "@agile-avocation/ui-pro";
import { Button, TextArea } from "@heroui/react";
import { useState } from "react";
import { renderSkillMentions } from "../../../../components/ai/skill-mention";
import { SearchHighlightedText } from "../../../../components/ui/search-highlighted-text";
import type { ChatUserMessage } from "../../data/chat";
import { renderChatContextMentions } from "../chat-context-mention";
import { MessageActions } from "../message-actions";
import { MessageAttachments } from "./message-attachments";

export function UserThreadMessage({
  isLastUserMessage,
  message,
}: {
  isLastUserMessage: boolean;
  message: ChatUserMessage;
}) {
  const [content, setContent] = useState(message.content);
  const [draft, setDraft] = useState<string | null>(null);

  const handleSave = () => {
    if (draft === null || !draft.trim()) return;
    setContent(draft);
    setDraft(null);
  };

  return (
    <ChatMessagePrimitive.User>
      <MessageAttachments message={message} />
      {content || draft !== null ? (
        <ChatMessagePrimitive.Bubble className={draft === null ? undefined : "w-full"}>
          <ChatMessagePrimitive.Content className={draft === null ? undefined : "w-full"}>
            {draft === null ? (
              <SearchHighlightedText>
                {renderChatContextMentions(renderSkillMentions(content))}
              </SearchHighlightedText>
            ) : (
              <>
                <TextArea
                  autoFocus
                  fullWidth
                  aria-label="改写消息"
                  className="resize-none p-1 [--textarea-bg-focus:transparent] [--textarea-bg-hover:transparent] [--textarea-bg:transparent]"
                  rows={2}
                  value={draft}
                  variant="secondary"
                  onChange={(event) => setDraft(event.target.value)}
                />
                <div className="flex justify-end gap-2 pt-2">
                  <Button size="sm" type="button" variant="tertiary" onPress={() => setDraft(null)}>
                    取消
                  </Button>
                  <Button
                    isDisabled={!draft.trim() || draft === content}
                    size="sm"
                    type="button"
                    variant="primary"
                    onPress={handleSave}
                  >
                    发送
                  </Button>
                </div>
              </>
            )}
          </ChatMessagePrimitive.Content>
        </ChatMessagePrimitive.Bubble>
      ) : null}
      {draft === null ? (
        <MessageActions
          content={content}
          {...(isLastUserMessage && content ? { onEdit: () => setDraft(content) } : {})}
          {...(message.timestamp === undefined ? {} : { timestamp: message.timestamp })}
          timestampPosition="start"
          variant="minimal"
        />
      ) : null}
    </ChatMessagePrimitive.User>
  );
}
