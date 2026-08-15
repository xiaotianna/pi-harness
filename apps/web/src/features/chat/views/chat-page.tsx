"use client";

import { ChatConversation } from "@agile-avocation/ui-pro";
import { ChatComposer } from "../components/chat-composer";
import { ThreadMessageList } from "../components/thread-message-list";
import type { ChatThread } from "../data/chat";

export interface ChatPageProps {
  thread: ChatThread;
}

export function ChatPage({ thread }: ChatPageProps) {
  return (
    <div className="flex h-[calc(100svh-var(--chat-navbar-height,64px))] flex-col overflow-hidden">
      <ChatConversation className="min-h-0 flex-1">
        <ChatConversation.Content className="flex flex-col">
          <ThreadMessageList messages={thread.messages} />
        </ChatConversation.Content>
        <ChatConversation.ScrollButton aria-label="滚动到底部" />
        <ChatConversation.ScrollAnchor />
      </ChatConversation>

      <div className="shrink-0 bg-background px-4 pb-2">
        <div className="mx-auto w-full max-w-[714px]">
          <ChatComposer className="w-full" modelId={thread.modelId} />
        </div>
      </div>
    </div>
  );
}
