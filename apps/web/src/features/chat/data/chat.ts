import { Compass, Images, MessageCirclePlus } from "lucide-react";
import type { ComponentType } from "react";
import { ModelId, type ModelIdValue } from "../../models";
import { AGENT_SESSION_THREAD } from "./agent-session-thread";
import { ChatMessageType } from "./chat-message";

export type {
  ChatAssistantMessage,
  ChatCodeMessage,
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
export { ChatMessageType };

import type { ChatMessage } from "./chat-message";
import { SHOWCASE_THREAD } from "./showcase-thread";

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
  modelId: ModelIdValue;
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
    name: "pi-harness",
    path: "/Users/lantianyu/Desktop/pi-harness",
  },
] as const;

export const CHAT_THREADS: readonly ChatThread[] = [
  AGENT_SESSION_THREAD,
  SHOWCASE_THREAD,
  {
    id: "quick-recipes-for-dinner",
    messages: [
      {
        content: "今晚时间不多，有什么快手晚餐推荐吗？",
        id: "msg-1",
        type: ChatMessageType.USER,
      },
      {
        actions: "full",
        content: "当然！你是只做自己的一份，还是要给多人准备？",
        id: "msg-2",
        type: ChatMessageType.ASSISTANT,
      },
      {
        content: "只做我自己的。想要简单但不无聊的。",
        id: "msg-3",
        type: ChatMessageType.USER,
      },
      {
        actions: "full",
        content: `明白了。这里有几个 15～20 分钟就能完成的选择：

1. 蒜香鸡肉炒蔬菜。用鸡胸肉、大蒜、酱油和冷冻蔬菜快炒，搭配米饭或卷饼。
2. 升级版蒜香橄榄油意面。用意面、橄榄油、大蒜和辣椒碎，有虾仁或蘑菇也可以加进去。
3. 鸡蛋卷饼或欧姆蛋。把鸡蛋、奶酪和手边的蔬菜搭配起来，也可以卷进饼皮。`,
        id: "msg-4",
        type: ChatMessageType.ASSISTANT,
      },
      {
        content: "第三种看起来是什么样？我想看看自己会不会喜欢。",
        id: "msg-5",
        type: ChatMessageType.USER,
      },
      {
        actions: "minimal",
        content: "当然！大概是这样的：",
        id: "msg-6",
        image: {
          alt: "搭配小番茄和欧芹的欧姆蛋",
          src: "https://heroui-assets.nyc3.cdn.digitaloceanspaces.com/images/egg.webp",
        },
        type: ChatMessageType.ASSISTANT,
      },
    ],
    modelId: ModelId.OPENAI_GPT_5_4,
    providerId: "openai",
    preview: "使用简单食材和一口锅完成的快手晚餐。",
    searchModeId: "deep-search",
    title: "快手晚餐食谱",
    updatedAt: new Date(Date.now() - 2 * 60_000).toISOString(),
    workspaceId: "pi-harness",
    user: {
      avatar: "https://heroui-assets.nyc3.cdn.digitaloceanspaces.com/avatars/blue-light.jpg",
      email: "darnell@email.com",
      name: "达内尔·豪",
    },
  },
  {
    id: "launch-plan-for-q3-rollout",
    messages: [
      {
        content: "帮我为第三季度上线分析仪表盘起草一份发布计划。",
        id: "msg-1",
        type: ChatMessageType.USER,
      },
      {
        actions: "full",
        content:
          "可以。为了让计划切实可行，我会拆分为内部对齐、内测验证、发布物料和上线后评估四个部分。",
        id: "msg-2",
        type: ChatMessageType.ASSISTANT,
      },
      {
        actions: "full",
        content: `下面是一份简洁的四周发布计划：

1. 第 1 周：让产品、销售和支持团队就产品定位达成一致。
2. 第 2 周：邀请设计合作伙伴参与内测，并归纳主要异议。
3. 第 3 周：完成发布物料、版本说明和新手引导。
4. 第 4 周：正式发布，并监测激活率、留存率和支持请求量。`,
        id: "msg-3",
        type: ChatMessageType.ASSISTANT,
      },
    ],
    modelId: ModelId.OPENAI_GPT_5_4,
    providerId: "openai",
    preview: "包含发布时间线和关键指标的第三季度分析仪表盘发布计划。",
    searchModeId: "deep-search",
    title: "第三季度发布计划",
    updatedAt: new Date(Date.now() - 18 * 60_000).toISOString(),
    workspaceId: "pi-harness",
    user: {
      avatar: "https://heroui-assets.nyc3.cdn.digitaloceanspaces.com/avatars/blue-light.jpg",
      email: "darnell@email.com",
      name: "达内尔·豪",
    },
  },
  {
    id: "rewrite-homepage-value-prop",
    messages: [
      {
        content: "你能改写首页的价值主张，让它更贴合产品团队吗？",
        id: "msg-1",
        type: ChatMessageType.USER,
      },
      {
        actions: "full",
        content:
          "可以。最快的改进方式是不再把工具描述成泛化的 AI，而是聚焦产品工作流、效率和决策清晰度。",
        id: "msg-2",
        type: ChatMessageType.ASSISTANT,
      },
      {
        actions: "full",
        content: `这里有三个更有力的定位方向：

1. 把客户反馈转化为明确优先级的产品决策。
2. 为产品经理和设计团队提供一个用于研究、归纳和发布规划的共享工作区。
3. 借助 AI 摘要和行动计划，缩短从洞察到路线图的时间。`,
        id: "msg-3",
        type: ChatMessageType.ASSISTANT,
      },
    ],
    modelId: ModelId.ANTHROPIC_CLAUDE_SONNET_4_6,
    providerId: "anthropic",
    preview: "聚焦产品经理工作流和更快决策的首页文案。",
    searchModeId: "quick-search",
    title: "改写首页价值主张",
    updatedAt: new Date(Date.now() - 60 * 60_000).toISOString(),
    workspaceId: "pi-harness",
    user: {
      avatar: "https://heroui-assets.nyc3.cdn.digitaloceanspaces.com/avatars/blue-light.jpg",
      email: "darnell@email.com",
      name: "达内尔·豪",
    },
  },
  {
    id: "weekly-team-update-summary",
    messages: [
      {
        content: "把本周设计和工程更新整理成可发给团队的进展说明。",
        id: "msg-1",
        type: ChatMessageType.USER,
      },
      {
        actions: "full",
        content: "已完成。我将内容精简并按进展、风险和下一步分组，可以直接粘贴到 Slack 或 Notion。",
        id: "msg-2",
        type: ChatMessageType.ASSISTANT,
      },
      {
        actions: "full",
        content: `每周进展摘要：

- 进展：仪表盘筛选功能已部署到预发布环境，新手引导流程正在验收。
- 风险：一个 API 延迟回归问题仍在调查中。
- 下一步：完善计费边界情况，并在下周启动设计系统审查。`,
        id: "msg-3",
        type: ChatMessageType.ASSISTANT,
      },
    ],
    modelId: ModelId.GOOGLE_GEMINI_3_1_PRO,
    providerId: "google",
    preview: "面向团队的产品、设计和工程更新摘要。",
    searchModeId: "quick-search",
    title: "团队每周更新摘要",
    updatedAt: new Date(Date.now() - 24 * 60 * 60_000).toISOString(),
    workspaceId: "pi-harness",
    user: {
      avatar: "https://heroui-assets.nyc3.cdn.digitaloceanspaces.com/avatars/blue-light.jpg",
      email: "darnell@email.com",
      name: "达内尔·豪",
    },
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

export const DEFAULT_CHAT_THREAD_ID = CHAT_THREADS[0]?.id ?? "";

export function getChatThread(chatId: string, threads: readonly ChatThread[] = CHAT_THREADS) {
  return threads.find((thread) => thread.id === chatId);
}

export type ChatPageKind = "thread" | "new" | "library" | "explore";

export type ChatActivePage =
  | { kind: "thread"; thread: ChatThread }
  | { kind: "new" }
  | { kind: "library" }
  | { kind: "explore" };

export function resolveChatActivePage(
  pathname: string,
  basePath: string,
  threads: readonly ChatThread[] = CHAT_THREADS,
): ChatActivePage {
  const trimmedBase = basePath.replace(/\/$/, "");
  const raw = pathname.startsWith(trimmedBase) ? pathname.slice(trimmedBase.length) : pathname;
  const relative = raw || "/";
  const firstSegment = relative.replace(/^\//, "").split("/")[0] ?? "";

  if (firstSegment === "new") return { kind: "new" };
  if (firstSegment === "library") return { kind: "library" };
  if (firstSegment === "explore") return { kind: "explore" };

  const threadId = firstSegment || DEFAULT_CHAT_THREAD_ID;
  const thread = getChatThread(threadId, threads) ?? threads[0];

  if (!thread) return { kind: "new" };

  return { kind: "thread", thread };
}
