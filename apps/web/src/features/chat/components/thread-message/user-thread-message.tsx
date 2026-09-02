"use client";

import { ChatMessage as ChatMessagePrimitive } from "@agile-avocation/ui-pro";
import { Button, TextArea, toast } from "@heroui/react";
import { useCallback, useState } from "react";
import { renderSkillMentions } from "../../../../components/ai/skill-mention";
import { SearchHighlightedText } from "../../../../components/ui/search-highlighted-text";
import type { ChatUserMessage } from "../../data/chat";
import { renderChatContextMentions } from "../chat-context-mention";
import { MessageActions } from "../message-actions";
import { MessageAttachments } from "./message-attachments";

export function UserThreadMessage({
  isLastUserMessage,
  message,
  onEditingChange,
  onRetryUserMessage,
}: {
  isLastUserMessage: boolean;
  message: ChatUserMessage;
  onEditingChange?: (isEditing: boolean) => void;
  onRetryUserMessage?: (messageEventId: string, prompt: string) => Promise<void>;
}) {
  const [content, setContent] = useState(message.content);
  const [draft, setDraft] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);

  const setDraftTextAreaRef = useCallback((textArea: HTMLTextAreaElement | null) => {
    if (!textArea) return;
    textArea.focus({ preventScroll: true });
    const end = textArea.value.length;
    textArea.setSelectionRange(end, end);
  }, []);

  const handleSave = async () => {
    if (draft === null || !draft.trim()) return;
    setIsSending(true);
    try {
      if (onRetryUserMessage) await onRetryUserMessage(message.sourceEventId ?? message.id, draft);
      else setContent(draft);
      setDraft(null);
      window.requestAnimationFrame(() => onEditingChange?.(false));
    } catch (error: unknown) {
      toast.danger(error instanceof Error ? error.message : "重新发送消息失败");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <ChatMessagePrimitive.User>
      <MessageAttachments message={message} />
      {content || draft !== null ? (
        <ChatMessagePrimitive.Bubble className={draft === null ? "min-w-0 max-w-[80%]" : "w-full"}>
          <ChatMessagePrimitive.Content
            className={draft === null ? "[overflow-wrap:anywhere]" : "w-full"}
          >
            {draft === null ? (
              <SearchHighlightedText>
                {renderChatContextMentions(renderSkillMentions(content))}
              </SearchHighlightedText>
            ) : (
              <>
                <TextArea
                  fullWidth
                  aria-label="改写消息"
                  className="resize-none p-1 [--textarea-bg-focus:transparent] [--textarea-bg-hover:transparent] [--textarea-bg:transparent]"
                  ref={setDraftTextAreaRef}
                  rows={2}
                  value={draft}
                  variant="secondary"
                  onChange={(event) => setDraft(event.target.value)}
                />
                <div className="flex justify-end gap-2 px-1 pt-2 pb-1">
                  <Button
                    isDisabled={isSending}
                    size="sm"
                    type="button"
                    variant="tertiary"
                    onPress={() => {
                      setDraft(null);
                      window.requestAnimationFrame(() => onEditingChange?.(false));
                    }}
                  >
                    取消
                  </Button>
                  <Button
                    isDisabled={!draft.trim() || draft === content}
                    isPending={isSending}
                    size="sm"
                    type="button"
                    variant="primary"
                    onPress={() => void handleSave()}
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
          {...(isLastUserMessage && content && onRetryUserMessage
            ? {
                onEdit: () => {
                  onEditingChange?.(true);
                  setDraft(content);
                },
              }
            : {})}
          {...(message.timestamp === undefined ? {} : { timestamp: message.timestamp })}
          timestampPosition="start"
          variant="minimal"
        />
      ) : null}
    </ChatMessagePrimitive.User>
  );
}
