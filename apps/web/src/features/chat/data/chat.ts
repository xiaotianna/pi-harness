import { Compass, Images, MessageCirclePlus } from "lucide-react";
import type { ComponentType } from "react";

export type {
  ChatAssistantMessage,
  ChatCodeMessage,
  ChatErrorMessage,
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
} from "./chat-message";
export { ChatMessageType } from "./chat-message";

import type { ChatMessage } from "./chat-message";

export type ChatNavItemId = "new" | "library" | "explore";

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

export type LibraryItem = {
  id: string;
  title: string;
  description: string;
  updatedAt: string;
  tags: readonly string[];
  threadId?: string;
};

export type ExplorePrompt = {
  id: string;
  title: string;
  description: string;
};

export type ExploreCategory = {
  id: string;
  title: string;
  subtitle: string;
  prompts: readonly ExplorePrompt[];
};

export const CHAT_NAV_ITEMS: readonly ChatNavItem[] = [
  { href: "/new", icon: MessageCirclePlus, id: "new", label: "新对话" },
  { href: "/library", icon: Images, id: "library", label: "资料库" },
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

export const CHAT_WORKSPACES: readonly ChatWorkspace[] = [
  {
    createdAt: "2026-08-14T11:21:00+08:00",
    id: "pi-harness",
    name: "pi-workbench",
    path: "/Users/lantianyu/Desktop/pi-workbench",
  },
] as const;

export const LIBRARY_ITEMS: readonly LibraryItem[] = [
  {
    description: "包含上下文读取、工具调用、审批、写入和最终交付的 Agent 会话。",
    id: "lib-agent-session-workflow",
    tags: ["Agent", "组件"],
    threadId: "agent-session-workflow",
    title: "Agent 会话时间线",
    updatedAt: "刚刚",
  },
  {
    description: "展示 Markdown、思维链、加载状态和消息操作的示例对话。",
    id: "lib-pro-ai-showcase",
    tags: ["演示", "组件"],
    threadId: "pro-ai-showcase",
    title: "Pro AI 组件展示",
    updatedAt: "刚刚",
  },
  {
    description: "适合工作日晚餐的快手食谱、语气预设和示例。",
    id: "lib-quick-dinners",
    tags: ["烹饪", "日常"],
    threadId: "quick-recipes-for-dinner",
    title: "工作日快手晚餐",
    updatedAt: "昨天",
  },
  {
    description: "可复用的软件发布计划框架，涵盖对齐、内测、物料和评估。",
    id: "lib-launch-plan",
    tags: ["产品", "市场推广"],
    threadId: "launch-plan-for-q3-rollout",
    title: "发布计划框架",
    updatedAt: "3 天前",
  },
  {
    description: "面向产品团队、适合审慎决策者的多版首页定位文案。",
    id: "lib-homepage-copy",
    tags: ["营销", "文案"],
    threadId: "rewrite-homepage-value-prop",
    title: "首页定位文案方案",
    updatedAt: "上周",
  },
  {
    description: "将进展、风险和下一步整理成便于直接使用的每周状态模板。",
    id: "lib-weekly-status",
    tags: ["团队", "运营"],
    threadId: "weekly-team-update-summary",
    title: "每周状态模板",
    updatedAt: "上周",
  },
  {
    description: "兼顾成长、阻碍和工作状态的一对一会议议程提示词。",
    id: "lib-one-on-ones",
    tags: ["管理"],
    title: "管理者一对一会议议程",
    updatedAt: "本月早些时候",
  },
  {
    description: "适用于按量、按席位和混合 SaaS 模式的定价比较框架。",
    id: "lib-pricing-models",
    tags: ["商业", "定价"],
    title: "定价模式比较",
    updatedAt: "本月早些时候",
  },
] as const;

export const EXPLORE_CATEGORIES: readonly ExploreCategory[] = [
  {
    id: "work",
    prompts: [
      {
        description: "把零散更新整理成可直接发给团队的每周进展说明。",
        id: "explore-work-1",
        title: "撰写团队每周更新",
      },
      {
        description: "制作包含问题、方案和范围的单页产品简报。",
        id: "explore-work-2",
        title: "单页产品简报",
      },
      {
        description: "为新功能发布起草一份可直接发送的版本说明。",
        id: "explore-work-3",
        title: "功能版本说明",
      },
    ],
    subtitle: "进展说明、规格文档和规划助手。",
    title: "工作",
  },
  {
    id: "writing",
    prompts: [
      {
        description: "为持审慎态度的管理者改写一段粗略文案。",
        id: "explore-writing-1",
        title: "面向管理者改写",
      },
      {
        description: "把会议记录整理成包含决策和负责人的紧凑叙事摘要。",
        id: "explore-writing-2",
        title: "会议记录转叙事摘要",
      },
      {
        description: "用具体、突出收益的表达，为产品团队精简营销文案。",
        id: "explore-writing-3",
        title: "优化营销文案",
      },
    ],
    subtitle: "表达更清晰、更高效、更具体。",
    title: "写作与编辑",
  },
  {
    id: "planning",
    prompts: [
      {
        description: "把产品简报转化为按周安排、包含负责人的发布清单。",
        id: "explore-planning-1",
        title: "从简报生成发布清单",
      },
      {
        description: "为产品团队新成员制定包含明确里程碑的 30/60/90 天计划。",
        id: "explore-planning-2",
        title: "新成员 30/60/90 天计划",
      },
      {
        description: "起草一份兼顾路线图和指标的季度规划议程。",
        id: "explore-planning-3",
        title: "季度规划议程",
      },
    ],
    subtitle: "真正可用的结构化计划和议程。",
    title: "规划与运营",
  },
] as const;

export type ChatPageKind = "thread" | "new" | "library" | "explore";

export type ChatActivePage =
  | { kind: "thread"; thread: ChatThread }
  | { kind: "new" }
  | { kind: "library" }
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
  if (firstSegment === "library") return { kind: "library" };
  if (firstSegment === "explore") return { kind: "explore" };

  const thread = threads.find((item) => item.id === firstSegment) ?? threads[0];

  if (!thread) return { kind: "new" };

  return { kind: "thread", thread };
}
