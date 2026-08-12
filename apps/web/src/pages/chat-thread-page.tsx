import type { ChatThread } from "../features/chat/data/chat";
import { ChatPage } from "../features/chat/views/chat-page";

export interface ChatThreadPageProps {
  thread: ChatThread;
}

export function ChatThreadPage({ thread }: ChatThreadPageProps) {
  return <ChatPage thread={thread} />;
}
