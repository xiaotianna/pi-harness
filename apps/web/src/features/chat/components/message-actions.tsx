"use client";

import { ChatMessageActions } from "@agile-avocation/ui-pro";
import { toast } from "@heroui/react";
import { formatMessageTimestamp } from "../utils/format-message-timestamp";

interface MessageActionsProps {
  content: string;
  timestamp?: number;
  timestampPosition: "start" | "end";
  variant: "full" | "minimal" | "timestamp";
}

export function MessageActions({
  content,
  timestamp,
  timestampPosition,
  variant,
}: MessageActionsProps) {
  const handleCopy = () => {
    if (!navigator.clipboard) {
      toast.danger("复制失败，请重试");
      return;
    }
    void navigator.clipboard.writeText(content).catch(() => {
      toast.danger("复制失败，请重试");
    });
  };

  const timestampDate = timestamp === undefined ? null : new Date(timestamp);
  const timestampLabel = timestamp === undefined ? "" : formatMessageTimestamp(timestamp);
  const timestampElement =
    timestampDate && timestampLabel ? (
      <time
        className="mx-1 self-center text-xs font-normal tabular-nums text-foreground/40"
        dateTime={timestampDate.toISOString()}
      >
        {timestampLabel}
      </time>
    ) : null;

  return (
    <ChatMessageActions>
      {timestampPosition === "start" ? timestampElement : null}
      {variant === "timestamp" ? null : (
        <ChatMessageActions.Copy aria-label="复制消息" tooltip="复制" onPress={handleCopy} />
      )}
      {variant === "full" ? (
        <>
          <ChatMessageActions.Regenerate aria-label="重新生成" tooltip="重新生成" />
          <ChatMessageActions.ThumbsUp aria-label="有帮助" tooltip="有帮助" />
          <ChatMessageActions.ThumbsDown aria-label="没有帮助" tooltip="没有帮助" />
        </>
      ) : null}
      {timestampPosition === "end" ? timestampElement : null}
    </ChatMessageActions>
  );
}
