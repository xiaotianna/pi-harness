export const ChatPageView = {
  CONVERSATION: "conversation",
  FILES: "files",
  TRACE: "trace",
} as const;

export type ChatPageView = (typeof ChatPageView)[keyof typeof ChatPageView];

export function isChatPageView(value: unknown): value is ChatPageView {
  return Object.values(ChatPageView).includes(value as ChatPageView);
}
