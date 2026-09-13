"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

export const CHAT_NAVBAR_ACTIONS_ID = "chat-navbar-actions";

export function ChatNavbarActions({ children }: { children: ReactNode }) {
  const [container, setContainer] = useState<HTMLElement | null>(null);

  useEffect(() => {
    setContainer(document.getElementById(CHAT_NAVBAR_ACTIONS_ID));
  }, []);

  return container ? createPortal(children, container) : null;
}
