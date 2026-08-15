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
        <ChatMessageActions.Regenerate aria-label="重新生成" tooltip="重新生成" />
      ) : null}
      <ChatMessageActions.Menu aria-label="更多操作" tooltip="更多" />
    </ChatMessageActions>
  );
}
