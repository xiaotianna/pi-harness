import { FolderFlows as FolderKanban, CommentPlus as MessageCirclePlus } from "@gravity-ui/icons";
import type { ComponentType } from "react";

export type {
  ChatAssistantMessage,
  ChatCodeMessage,
  ChatContextCompactionMessage,
  ChatErrorMessage,
  ChatFileChange,
  ChatImageGenerationMessage,
  ChatLoadingMessage,
  ChatMessage,
  ChatMessageAttachment,
  ChatMessageSource,
  ChatMessageTool,
  ChatOrbsMessage,
  ChatReasoningMessage,
  ChatSourcesMessage,
  ChatStreamingMessage,
  ChatTaskListMessage,
  ChatToolGroupMessage,
  ChatToolMessage,
  ChatUserMessage,
  ChatWebSearchMessage,
  ResolveChatToolApproval,
} from "./chat-message";
export { ChatFileChangeStatus, ChatMessageType, ChatToolState } from "./chat-message";

import type { ChatMessage } from "./chat-message";

export type ChatNavItemId = "new" | "board";

export type ChatNavItem = {
  id: ChatNavItemId;
  icon: ComponentType<{ className?: string }>;
  label: string;
  /**
   * Route to navigate to (relative to the template base path) when the item is clicked.
   */
  href: string;
  shortcut?: string;
};

export type ChatSearchMode = {
  id: string;
  label: string;
};

export type ChatThread = {
  id: string;
  workspaceId: string;
  title: string;
  preview: string;
  updatedAt: string;
  modelId: string;
  providerId: string;
  searchModeId: string;
  user: {
    avatar: string;
    email: string;
    name: string;
  };
  messages: readonly ChatMessage[];
};

export type ChatWorkspace = {
  id: string;
  name: string;
  path: string;
  createdAt: string;
};

export const CHAT_NAV_ITEMS: readonly ChatNavItem[] = [
  { href: "/new", icon: MessageCirclePlus, id: "new", label: "新对话" },
  { href: "/board", icon: FolderKanban, id: "board", label: "项目看板" },
] as const;

export const CHAT_SEARCH_MODES: readonly ChatSearchMode[] = [
  { id: "deep-search", label: "深度搜索" },
  { id: "quick-search", label: "快速搜索" },
] as const;

export type ChatPageKind = "thread" | "new" | "board";

export type ChatActivePage =
  | { kind: "thread"; thread: ChatThread }
  | { kind: "new" }
  | { kind: "board" };

export function resolveChatActivePage(
  pathname: string,
  basePath: string,
  threads: readonly ChatThread[],
): ChatActivePage {
  const trimmedBase = basePath.replace(/\/$/, "");
  const raw = pathname.startsWith(trimmedBase) ? pathname.slice(trimmedBase.length) : pathname;
  const relative = raw || "/";
  const firstSegment = relative.replace(/^\//, "").split("/")[0] ?? "";

  if (firstSegment === "new") return { kind: "new" };
  if (firstSegment === "board") return { kind: "board" };

  const thread = threads.find((item) => item.id === firstSegment) ?? threads[0];

  if (!thread) return { kind: "new" };

  return { kind: "thread", thread };
}
