"use client";

import { FileText, Xmark as X } from "@gravity-ui/icons";
import { Button } from "@heroui/react";

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
  variant?: "card" | "token";
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
  removeLabel = "移除附件",
  variant = "card",
}: ChatAttachmentListProps) {
  if (!attachments.length) return null;

  const isToken = variant === "token";

  return (
    <div className={composeClassName("flex flex-wrap", isToken ? "gap-1" : "gap-2", className)}>
      {attachments.map((attachment, index) => (
        <div
          key={attachment.id ?? `${attachment.name}-${index}`}
          className={composeClassName(
            "flex max-w-64 min-w-0 items-center text-foreground",
            isToken
              ? "h-6 gap-1 rounded-md bg-background/80 ps-2 pe-0.5 text-xs"
              : "h-10 gap-2 rounded-lg border border-border bg-default/60 px-1.5 pr-2",
          )}
        >
          {isToken ? null : isImageAttachment(attachment) ? (
            <img alt="" className="size-7 shrink-0 rounded-md object-cover" src={attachment.src} />
          ) : (
            <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-background text-muted">
              <FileText className="size-4" />
            </span>
          )}
          <span className={composeClassName("min-w-0 flex-1 truncate", !isToken && "text-sm")}>
            {attachment.name}
          </span>
          {onRemove ? (
            <Button
              isIconOnly
              aria-label={`${removeLabel}: ${attachment.name}`}
              className={isToken ? "size-5 min-w-5" : "-mr-1 size-6 min-w-6"}
              size="sm"
              variant="ghost"
              onPress={() => onRemove(attachment)}
            >
              <X className={isToken ? "size-3" : "size-3.5"} />
            </Button>
          ) : null}
        </div>
      ))}
    </div>
  );
}
