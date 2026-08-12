"use client";

import type { ChatStatus } from "@agile-avocation/ui-pro";
import { PromptInput } from "@agile-avocation/ui-pro";
import { ListBox, Select } from "@heroui/react";
import { Globe, Paperclip } from "lucide-react";
import type { ChangeEvent } from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { CHAT_MODELS } from "../data/chat";
import { chatStrings } from "../i18n/strings";
import type { ChatAttachmentListItem } from "./chat-attachment-list";
import { ChatAttachmentList } from "./chat-attachment-list";

type PendingAttachment = {
  id: string;
  mimeType?: string;
  name: string;
  src?: string;
};

function createAttachmentId(file: File): string {
  return `${file.name}-${file.lastModified}-${
    globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2)
  }`;
}

function revokeAttachmentUrl(attachment: PendingAttachment) {
  if (attachment.src?.startsWith("blob:")) URL.revokeObjectURL(attachment.src);
}

function revokeAttachmentUrls(items: readonly PendingAttachment[]) {
  items.forEach((item) => {
    revokeAttachmentUrl(item);
  });
}

export interface ChatComposerProps {
  className?: string;
  modelId?: string;
  placeholder?: string;
}

export function ChatComposer({
  className,
  modelId = CHAT_MODELS[0]?.id ?? "gpt-5.4",
  placeholder = "What do you want to know?",
}: ChatComposerProps) {
  const [attachments, setAttachments] = useState<PendingAttachment[]>([]);
  const [status, setStatus] = useState<ChatStatus>("ready");
  const [value, setValue] = useState("");
  const attachmentsRef = useRef<PendingAttachment[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const timersRef = useRef<number[]>([]);

  const clearTimers = useCallback(() => {
    timersRef.current.forEach((timer) => {
      window.clearTimeout(timer);
    });
    timersRef.current = [];
  }, []);

  useEffect(() => {
    attachmentsRef.current = attachments;
  }, [attachments]);

  useEffect(() => {
    return () => {
      clearTimers();
      revokeAttachmentUrls(attachmentsRef.current);
    };
  }, [clearTimers]);

  const handleStop = () => {
    clearTimers();
    setStatus("ready");
  };

  const handleSubmit = () => {
    const trimmed = value.trim();
    const hasAttachments = attachments.length > 0;

    if (status !== "ready" || (!trimmed && !hasAttachments)) return;

    revokeAttachmentUrls(attachments);
    setValue("");
    setAttachments([]);
    setStatus("submitted");
    clearTimers();

    timersRef.current.push(
      window.setTimeout(() => setStatus("streaming"), 350),
      window.setTimeout(() => setStatus("ready"), 1600),
    );
  };

  const isGenerating = status === "submitted" || status === "streaming";
  const canSend = Boolean(value.trim() || attachments.length);
  const sendLabel = isGenerating ? chatStrings.composer.stop : chatStrings.composer.send;

  const handleFilesSelected = (files: File[]) => {
    setAttachments((current) => [
      ...current,
      ...files.map((file) => {
        const attachment: PendingAttachment = {
          id: createAttachmentId(file),
          mimeType: file.type,
          name: file.name,
        };

        if (file.type.startsWith("image/")) {
          attachment.src = URL.createObjectURL(file);
        }

        return attachment;
      }),
    ]);
  };

  const handleFileInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.currentTarget.files ?? []);

    if (files.length) handleFilesSelected(files);

    event.currentTarget.value = "";
  };

  const handleRemoveAttachment = (attachment: ChatAttachmentListItem) => {
    if (!attachment.id) return;

    setAttachments((current) => {
      const removed = current.find((item) => item.id === attachment.id);

      if (removed) revokeAttachmentUrl(removed);

      return current.filter((item) => item.id !== attachment.id);
    });
  };

  return (
    <PromptInput
      className={className}
      status={status}
      value={value}
      variant="primary"
      onStop={handleStop}
      onSubmit={handleSubmit}
      onValueChange={setValue}
    >
      <PromptInput.Shell>
        <PromptInput.Content>
          {attachments.length ? (
            <PromptInput.Attachments>
              <ChatAttachmentList
                attachments={attachments}
                removeLabel={chatStrings.composer.removeAttachment}
                onRemove={handleRemoveAttachment}
              />
            </PromptInput.Attachments>
          ) : null}
          <PromptInput.TextArea placeholder={placeholder} />
        </PromptInput.Content>
        <PromptInput.Toolbar>
          <PromptInput.ToolbarStart>
            <input
              ref={fileInputRef}
              aria-hidden
              multiple
              className="sr-only"
              disabled={isGenerating}
              tabIndex={-1}
              type="file"
              onChange={handleFileInputChange}
            />
            <PromptInput.Action
              aria-label={chatStrings.composer.attach}
              isDisabled={isGenerating}
              tooltip={chatStrings.composer.attach}
              onPress={() => fileInputRef.current?.click()}
            >
              <Paperclip className="size-4" />
            </PromptInput.Action>
            <Select
              aria-label={chatStrings.composer.model}
              defaultValue={modelId}
              isDisabled={isGenerating}
              placeholder="Select model"
              variant="secondary"
            >
              <Select.Trigger className="flex items-center gap-2">
                <Globe className="size-4 shrink-0" />
                <Select.Value />
                <Select.Indicator />
              </Select.Trigger>
              <Select.Popover>
                <ListBox>
                  {CHAT_MODELS.map((model) => (
                    <ListBox.Item key={model.id} id={model.id} textValue={model.label}>
                      {model.label}
                      <ListBox.ItemIndicator />
                    </ListBox.Item>
                  ))}
                </ListBox>
              </Select.Popover>
            </Select>
          </PromptInput.ToolbarStart>
          <PromptInput.ToolbarEnd>
            <PromptInput.Send aria-label={sendLabel} isDisabled={!canSend && !isGenerating} />
          </PromptInput.ToolbarEnd>
        </PromptInput.Toolbar>
      </PromptInput.Shell>
      <PromptInput.Footer>{chatStrings.disclaimer}</PromptInput.Footer>
    </PromptInput>
  );
}
