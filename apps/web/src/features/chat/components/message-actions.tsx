"use client";

import { ChatMessageActions } from "@agile-avocation/ui-pro";
import { toast } from "@heroui/react";

interface MessageActionsProps {
  content: string;
  variant: "full" | "minimal";
}

export function MessageActions({ content, variant }: MessageActionsProps) {
  const handleCopy = () => {
    if (!navigator.clipboard) {
      toast.danger("复制失败，请重试");
      return;
    }
    void navigator.clipboard.writeText(content).catch(() => {
      toast.danger("复制失败，请重试");
    });
  };

  return (
    <ChatMessageActions>
      <ChatMessageActions.Copy aria-label="复制消息" tooltip="复制" onPress={handleCopy} />
      {variant === "full" ? (
        <>
          <ChatMessageActions.Regenerate aria-label="重新生成" tooltip="重新生成" />
          <ChatMessageActions.ThumbsUp aria-label="有帮助" tooltip="有帮助" />
          <ChatMessageActions.ThumbsDown aria-label="没有帮助" tooltip="没有帮助" />
        </>
      ) : null}
    </ChatMessageActions>
  );
}
