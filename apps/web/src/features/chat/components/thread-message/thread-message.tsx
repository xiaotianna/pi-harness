"use client";

import { memo } from "react";
import type { ChatMessage } from "../../data/chat";
import { MESSAGE_RENDER_STRATEGIES } from "./message-render-strategies";

export interface ThreadMessageProps {
  isLastUserMessage?: boolean;
  message: ChatMessage;
  onEditingChange?: (isEditing: boolean) => void;
}

export const ThreadMessage = memo(function ThreadMessage({
  isLastUserMessage = false,
  message,
  onEditingChange,
}: ThreadMessageProps) {
  return MESSAGE_RENDER_STRATEGIES[message.type](message, {
    isLastUserMessage,
    ...(onEditingChange ? { onEditingChange } : {}),
  });
});
