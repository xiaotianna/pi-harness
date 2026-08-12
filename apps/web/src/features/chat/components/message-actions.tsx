"use client";

import { ChatMessageActions } from "@agile-avocation/ui-pro";
import { chatStrings } from "../i18n/strings";

interface MessageActionsProps {
  variant: "full" | "minimal";
}

export function MessageActions({ variant }: MessageActionsProps) {
  return (
    <ChatMessageActions>
      <ChatMessageActions.Copy
        aria-label={chatStrings.actions.copy}
        tooltip={chatStrings.actions.copy}
      />
      {variant === "full" ? (
        <>
          <ChatMessageActions.ThumbsUp
            aria-label={chatStrings.actions.thumbsUp}
            tooltip={chatStrings.actions.thumbsUp}
          />
          <ChatMessageActions.ThumbsDown
            aria-label={chatStrings.actions.thumbsDown}
            tooltip={chatStrings.actions.thumbsDown}
          />
          <ChatMessageActions.Regenerate
            aria-label={chatStrings.actions.regenerate}
            tooltip={chatStrings.actions.regenerate}
          />
        </>
      ) : null}
      <ChatMessageActions.Menu
        aria-label={chatStrings.actions.menu}
        tooltip={chatStrings.actions.menuTooltip}
      />
    </ChatMessageActions>
  );
}
