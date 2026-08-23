"use client";

import { ChatConversation } from "@agile-avocation/ui-pro";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { AgentTraceView } from "../../trace";
import { ChatComposer } from "../components/chat-composer";
import { ThreadMessageList } from "../components/thread-message-list";
import { ChatPageView } from "../constants/chat-page-view";
import type { ChatThread } from "../data/chat";
import { useChatPageViewStore } from "../state/chat-page-view-store";

const CHAT_VIEW_TRANSITION = {
  duration: 0.18,
  ease: [0.22, 1, 0.36, 1],
} as const;

export interface ChatPageProps {
  thread: ChatThread;
}

export function ChatPage({ thread }: ChatPageProps) {
  const activeView = useChatPageViewStore((state) => state.activeView);
  const shouldReduceMotion = useReducedMotion();
  const transition = shouldReduceMotion ? { duration: 0 } : CHAT_VIEW_TRANSITION;

  return (
    <div className="flex h-[calc(100svh-var(--chat-navbar-height,64px))] flex-col overflow-hidden">
      <div className="min-h-0 flex-1 overflow-hidden">
        <AnimatePresence initial={false} mode="wait">
          <motion.div
            animate={{ opacity: 1, y: 0 }}
            className="h-full"
            exit={{ opacity: 0, y: -4 }}
            initial={{ opacity: 0, y: 4 }}
            key={activeView}
            transition={transition}
          >
            {activeView === ChatPageView.CONVERSATION ? (
              <ChatConversation className="h-full min-h-0">
                <ChatConversation.Content className="flex flex-col">
                  <ThreadMessageList messages={thread.messages} />
                </ChatConversation.Content>
                <ChatConversation.ScrollButton aria-label="滚动到底部" />
                <ChatConversation.ScrollAnchor />
              </ChatConversation>
            ) : (
              <AgentTraceView />
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="relative z-10 shrink-0 bg-background px-4 pb-2">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 bottom-full h-16 bg-linear-to-b from-transparent to-background"
        />
        <div className="mx-auto w-full max-w-[714px]">
          <ChatComposer
            className="w-full"
            conversationId={thread.id}
            modelId={thread.modelId}
            providerId={thread.providerId}
          />
        </div>
      </div>
    </div>
  );
}
