import {
  Compass,
  FolderFlows as FolderKanban,
  CommentPlus as MessageCirclePlus,
} from "@gravity-ui/icons";
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

export type ChatNavItemId = "new" | "board" | "explore";

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
  { href: "/explore", icon: Compass, id: "explore", label: "探索" },
] as const;

export const CHAT_SEARCH_MODES: readonly ChatSearchMode[] = [
  { id: "deep-search", label: "深度搜索" },
  { id: "quick-search", label: "快速搜索" },
] as const;

export const SUGGESTED_PROMPTS: readonly string[] = [
  "把本周产品和设计更新整理成可发给团队的进展说明。",
  "把粗略的产品简报整理成包含负责人和截止时间的发布清单。",
  "面向关注投资回报率且持审慎态度的管理者改写这段文字。",
  "为一款数据密集型分析产品构思新手引导流程的名称。",
  "起草一份能发现阻碍和成长目标的每周一对一会议议程。",
  "比较三种定价模式，并为按量计费的 SaaS 推荐一种。",
] as const;

export type ChatPageKind = "thread" | "new" | "board" | "explore";

export type ChatActivePage =
  | { kind: "thread"; thread: ChatThread }
  | { kind: "new" }
  | { kind: "board" }
  | { kind: "explore" };

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
  if (firstSegment === "explore") return { kind: "explore" };

  const thread = threads.find((item) => item.id === firstSegment) ?? threads[0];

  if (!thread) return { kind: "new" };

  return { kind: "thread", thread };
}
