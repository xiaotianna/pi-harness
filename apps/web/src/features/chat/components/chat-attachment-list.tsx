"use client";

import { Button } from "@heroui/react";
import { FileText, X } from "lucide-react";

export type ChatAttachmentListItem = {
  id?: string;
  mimeType?: string;
  name: string;
  src?: string;
};

export interface ChatAttachmentListProps {
  attachments: readonly ChatAttachmentListItem[];
  className?: string;
  removeLabel?: string;
  onRemove?: (attachment: ChatAttachmentListItem) => void;
}

function isImageAttachment(attachment: ChatAttachmentListItem) {
  return Boolean(attachment.src && attachment.mimeType?.startsWith("image/"));
}

function composeClassName(...values: Array<string | false | undefined>) {
  return values.filter(Boolean).join(" ");
}

export function ChatAttachmentList({
  attachments,
  className,
  onRemove,
  removeLabel = "Remove attachment",
}: ChatAttachmentListProps) {
  if (!attachments.length) return null;

  return (
    <div className={composeClassName("flex flex-wrap gap-2", className)}>
      {attachments.map((attachment, index) => (
        <div
          key={attachment.id ?? `${attachment.name}-${index}`}
          className="flex h-10 max-w-64 min-w-0 items-center gap-2 rounded-lg border border-border bg-default/60 px-1.5 pr-2 text-foreground"
        >
          {isImageAttachment(attachment) ? (
            <img alt="" className="size-7 shrink-0 rounded-md object-cover" src={attachment.src} />
          ) : (
            <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-background text-muted">
              <FileText className="size-4" />
            </span>
          )}
          <span className="min-w-0 flex-1 truncate text-sm">{attachment.name}</span>
          {onRemove ? (
            <Button
              isIconOnly
              aria-label={`${removeLabel}: ${attachment.name}`}
              className="-mr-1 size-6 min-w-6"
              size="sm"
              variant="ghost"
              onPress={() => onRemove(attachment)}
            >
              <X className="size-3.5" />
            </Button>
          ) : null}
        </div>
      ))}
    </div>
  );
}
