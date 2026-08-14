"use client";

import { ChatMessageActions } from "@agile-avocation/ui-pro";

interface MessageActionsProps {
  variant: "full" | "minimal";
}

export function MessageActions({ variant }: MessageActionsProps) {
  return (
    <ChatMessageActions>
      <ChatMessageActions.Copy aria-label="复制" tooltip="复制" />
      {variant === "full" ? (
        <>
          <ChatMessageActions.ThumbsUp aria-label="回答有帮助" tooltip="回答有帮助" />
          <ChatMessageActions.ThumbsDown aria-label="回答需改进" tooltip="回答需改进" />
          <ChatMessageActions.Regenerate aria-label="重新生成" tooltip="重新生成" />
        </>
      ) : null}
      <ChatMessageActions.Menu aria-label="更多操作" tooltip="更多" />
    </ChatMessageActions>
  );
}
