"use client";

import { memo } from "react";
import type { ChatMessage } from "../../data/chat";
import { MESSAGE_RENDER_STRATEGIES } from "./message-render-strategies";

export interface ThreadMessageProps {
  message: ChatMessage;
}

export const ThreadMessage = memo(function ThreadMessage({ message }: ThreadMessageProps) {
  return MESSAGE_RENDER_STRATEGIES[message.type](message);
});
