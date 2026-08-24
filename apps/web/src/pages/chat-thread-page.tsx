import { ChatPage } from "../features/chat/views/chat-page";

export interface ChatThreadPageProps {
  sessionId: string;
}

export function ChatThreadPage({ sessionId }: ChatThreadPageProps) {
  return <ChatPage sessionId={sessionId} />;
}
