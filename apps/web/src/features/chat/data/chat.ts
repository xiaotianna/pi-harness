import type { ToolPartState } from "@agile-avocation/ui-pro/chat-tool";
import { Compass, Library, SquarePen } from "lucide-react";
import type { ComponentType } from "react";
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

export type ChatModel = {
  id: string;
  label: string;
};

export type ChatSearchMode = {
  id: string;
  label: string;
};

export type ChatMessageImage = {
  alt: string;
  src: string;
};

export type ChatMessageReasoningStep = {
  content: string;
  label: string;
};

export type ChatMessageReasoning = {
  defaultExpanded?: boolean;
  steps: readonly ChatMessageReasoningStep[];
  trigger: string;
};

export type ChatMessageTool = {
  argsText?: string;
  errorText?: string;
  input?: unknown;
  output?: unknown;
  state: ToolPartState;
  toolName: string;
};

export type ChatMessageToolGroup = {
  active?: boolean;
  label: string;
  tools: readonly ChatMessageTool[];
};

export type ChatMessageSource =
  | {
      description?: string;
      sourceType: "url";
      title?: string;
      url: string;
    }
  | {
      sourceType: "document";
      title: string;
    };

export type ChatMessageSourceGroup = {
  label: string;
  sources: readonly ChatMessageSource[];
};

export type ChatMessageAttachment = {
  mimeType?: string;
  name: string;
  src?: string;
};

export type ChatAssistantStatus = "complete" | "skeleton" | "streaming";

export type ChatMessage = {
  id: string;
  role: "assistant" | "user";
  actions?: "full" | "minimal";
  attachments?: readonly ChatMessageAttachment[];
  avatar?: {
    alt?: string;
    fallback?: string;
    src?: string;
  };
  image?: ChatMessageImage;
  /** Rich markdown body for assistant messages. */
  loaderLabel?: string;
  markdown?: string;
  listItems?: string[];
  reasoning?: ChatMessageReasoning;
  showAvatar?: boolean;
  sourceGroup?: ChatMessageSourceGroup;
  sources?: readonly ChatMessageSource[];
  status?: ChatAssistantStatus;
  text?: string;
  toolGroup?: ChatMessageToolGroup;
  tools?: readonly ChatMessageTool[];
};

export type ChatThread = {
  id: string;
  title: string;
  preview: string;
  updatedAt: string;
  modelId: string;
  searchModeId: string;
  user: {
    avatar: string;
    email: string;
    name: string;
  };
  messages: readonly ChatMessage[];
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
  { href: "/new", icon: SquarePen, id: "new", label: "New Chat" },
  { href: "/library", icon: Library, id: "library", label: "Library" },
  { href: "/explore", icon: Compass, id: "explore", label: "Explore" },
] as const;

export const CHAT_MODELS: readonly ChatModel[] = [
  { id: "gpt-5.4", label: "GPT-5.4" },
  { id: "claude-4.6-opus", label: "Claude 4.6 Opus" },
  { id: "claude-4.6-sonnet", label: "Claude 4.6 Sonnet" },
  { id: "gemini-3.1-pro", label: "Gemini 3.1 Pro" },
] as const;

export const CHAT_SEARCH_MODES: readonly ChatSearchMode[] = [
  { id: "deep-search", label: "Deep Search" },
  { id: "quick-search", label: "Quick Search" },
] as const;

export const SUGGESTED_PROMPTS: readonly string[] = [
  "Summarize this week's product and design updates into a team-ready status note.",
  "Turn a rough product brief into a launch checklist with owners and deadlines.",
  "Rewrite this paragraph for a skeptical executive who cares about ROI.",
  "Brainstorm onboarding flow names for a data-heavy analytics product.",
  "Draft a weekly 1:1 agenda that surfaces blockers and growth goals.",
  "Compare three pricing models and recommend one for a usage-based SaaS.",
] as const;

export const CHAT_THREADS: readonly ChatThread[] = [
  SHOWCASE_THREAD,
  {
    id: "quick-recipes-for-dinner",
    messages: [
      {
        id: "msg-1",
        role: "user",
        text: "I don't have much time tonight. Any quick dinner ideas?",
      },
      {
        actions: "full",
        id: "msg-2",
        role: "assistant",
        text: "Sure! Are you cooking for yourself or more people?",
      },
      {
        id: "msg-3",
        role: "user",
        text: "Just for me. Something easy but not boring 😅",
      },
      {
        actions: "full",
        id: "msg-4",
        listItems: [
          "Garlic chicken stir-fry. Chicken breast, garlic, soy sauce, and frozen veggies. Serve with rice or tortillas.",
          "Pasta aglio e olio with a twist. Pasta, olive oil, garlic, chili flakes - add shrimp or mushrooms if you have them.",
          "Egg wrap or omelette. Eggs, cheese, whatever veggies you have, wrapped in a tortilla.",
        ],
        role: "assistant",
        text: "Got it. Here are a few quick options (15-20 min):",
      },
      {
        id: "msg-5",
        role: "user",
        text: "how it looks option 3? i want to see if i would like it",
      },
      {
        actions: "minimal",
        id: "msg-6",
        image: {
          alt: "Omelette with cherry tomatoes and parsley",
          src: "https://heroui-assets.nyc3.cdn.digitaloceanspaces.com/images/egg.webp",
        },
        role: "assistant",
        text: "Sure! It looks like this:",
      },
    ],
    modelId: "gpt-5.4",
    preview: "Quick dinner ideas with simple ingredients and one-pan options.",
    searchModeId: "deep-search",
    title: "Quick recipes for dinner",
    updatedAt: "2m ago",
    user: {
      avatar: "https://heroui-assets.nyc3.cdn.digitaloceanspaces.com/avatars/blue-light.jpg",
      email: "darnell@email.com",
      name: "Darnell Howe",
    },
  },
  {
    id: "launch-plan-for-q3-rollout",
    messages: [
      {
        id: "msg-1",
        role: "user",
        text: "Help me draft a launch plan for our Q3 rollout of the analytics dashboard.",
      },
      {
        actions: "full",
        id: "msg-2",
        role: "assistant",
        text: "Absolutely. To make it realistic, I'll break it into internal alignment, beta validation, launch assets, and post-launch measurement.",
      },
      {
        actions: "full",
        id: "msg-3",
        listItems: [
          "Week 1: align product, sales, and support on positioning.",
          "Week 2: run a beta with design partners and collect objection themes.",
          "Week 3: finalize launch assets, release notes, and onboarding tours.",
          "Week 4: launch publicly and monitor activation, retention, and support volume.",
        ],
        role: "assistant",
        text: "Here's a concise four-week rollout plan:",
      },
    ],
    modelId: "gpt-5.4",
    preview: "Q3 analytics dashboard rollout plan with launch timeline and KPIs.",
    searchModeId: "deep-search",
    title: "Launch plan for Q3 rollout",
    updatedAt: "18m ago",
    user: {
      avatar: "https://heroui-assets.nyc3.cdn.digitaloceanspaces.com/avatars/blue-light.jpg",
      email: "darnell@email.com",
      name: "Darnell Howe",
    },
  },
  {
    id: "rewrite-homepage-value-prop",
    messages: [
      {
        id: "msg-1",
        role: "user",
        text: "Can you rewrite our homepage value proposition to be more specific for product teams?",
      },
      {
        actions: "full",
        id: "msg-2",
        role: "assistant",
        text: "Yes. The fastest improvement is to stop describing the tool as generic AI and instead anchor it in product workflows, speed, and decision clarity.",
      },
      {
        actions: "full",
        id: "msg-3",
        listItems: [
          "Turn customer feedback into prioritized product decisions.",
          "Give PMs and design teams one shared workspace for research, synthesis, and launch planning.",
          "Reduce the time from insight to roadmap with AI-assisted summaries and action plans.",
        ],
        role: "assistant",
        text: "Here are three stronger positioning directions:",
      },
    ],
    modelId: "claude-4.6-sonnet",
    preview: "Homepage messaging focused on PM workflows and faster decisions.",
    searchModeId: "quick-search",
    title: "Rewrite homepage value prop",
    updatedAt: "1h ago",
    user: {
      avatar: "https://heroui-assets.nyc3.cdn.digitaloceanspaces.com/avatars/blue-light.jpg",
      email: "darnell@email.com",
      name: "Darnell Howe",
    },
  },
  {
    id: "weekly-team-update-summary",
    messages: [
      {
        id: "msg-1",
        role: "user",
        text: "Summarize this week's design and engineering updates into a team-ready status note.",
      },
      {
        actions: "full",
        id: "msg-2",
        role: "assistant",
        text: "Done. I kept it concise and grouped progress, risks, and next steps so it can be pasted directly into Slack or Notion.",
      },
      {
        actions: "full",
        id: "msg-3",
        listItems: [
          "Progress: dashboard filters shipped to staging and onboarding flows are in QA.",
          "Risks: one API latency regression is still under investigation.",
          "Next: finalize billing edge cases and launch the design system audit next week.",
        ],
        role: "assistant",
        text: "Weekly status summary:",
      },
    ],
    modelId: "gemini-3.1-pro",
    preview: "Team-ready summary of product, design, and engineering updates.",
    searchModeId: "quick-search",
    title: "Weekly team update summary",
    updatedAt: "Yesterday",
    user: {
      avatar: "https://heroui-assets.nyc3.cdn.digitaloceanspaces.com/avatars/blue-light.jpg",
      email: "darnell@email.com",
      name: "Darnell Howe",
    },
  },
] as const;

export const LIBRARY_ITEMS: readonly LibraryItem[] = [
  {
    description: "Demo thread for Markdown, ChainOfThought, loaders, and message actions.",
    id: "lib-pro-ai-showcase",
    tags: ["Demo", "Components"],
    threadId: "pro-ai-showcase",
    title: "Pro AI components showcase",
    updatedAt: "Just now",
  },
  {
    description: "Prompts, tone presets, and examples for quick, interesting weeknight dinners.",
    id: "lib-quick-dinners",
    tags: ["Cooking", "Everyday"],
    threadId: "quick-recipes-for-dinner",
    title: "Quick weeknight dinners",
    updatedAt: "Yesterday",
  },
  {
    description:
      "A reusable framework for software launch plans: alignment, beta, assets, measurement.",
    id: "lib-launch-plan",
    tags: ["Product", "GTM"],
    threadId: "launch-plan-for-q3-rollout",
    title: "Launch plan framework",
    updatedAt: "3 days ago",
  },
  {
    description:
      "Homepage positioning variants for product teams, tuned for skeptical decision makers.",
    id: "lib-homepage-copy",
    tags: ["Marketing", "Copywriting"],
    threadId: "rewrite-homepage-value-prop",
    title: "Homepage positioning variants",
    updatedAt: "Last week",
  },
  {
    description:
      "Weekly status templates that group progress, risks, and next steps in one paste-friendly note.",
    id: "lib-weekly-status",
    tags: ["Team", "Ops"],
    threadId: "weekly-team-update-summary",
    title: "Weekly status templates",
    updatedAt: "Last week",
  },
  {
    description: "1:1 agenda prompts that balance growth, blockers, and wellbeing.",
    id: "lib-one-on-ones",
    tags: ["Management"],
    title: "Manager 1:1 agendas",
    updatedAt: "Earlier this month",
  },
  {
    description:
      "Pricing comparison frameworks for usage-based, seat-based, and hybrid SaaS models.",
    id: "lib-pricing-models",
    tags: ["Business", "Pricing"],
    title: "Pricing model comparisons",
    updatedAt: "Earlier this month",
  },
] as const;

export const EXPLORE_CATEGORIES: readonly ExploreCategory[] = [
  {
    id: "work",
    prompts: [
      {
        description: "Generate a team-ready weekly status note from scattered updates.",
        id: "explore-work-1",
        title: "Write my weekly team update",
      },
      {
        description: "Produce a one-pager for a product brief with problem, solution, and scope.",
        id: "explore-work-2",
        title: "One-page product brief",
      },
      {
        description: "Draft a ready-to-send release note for a new feature launch.",
        id: "explore-work-3",
        title: "Feature release note",
      },
    ],
    subtitle: "Status notes, specs, and planning helpers.",
    title: "At work",
  },
  {
    id: "writing",
    prompts: [
      {
        description: "Rewrite a rough paragraph for a skeptical executive reader.",
        id: "explore-writing-1",
        title: "Rewrite for an executive",
      },
      {
        description: "Turn meeting notes into a tight narrative summary with decisions and owners.",
        id: "explore-writing-2",
        title: "Meeting notes to narrative",
      },
      {
        description:
          "Tighten marketing copy with specific, benefit-led phrasing for product teams.",
        id: "explore-writing-3",
        title: "Sharper marketing copy",
      },
    ],
    subtitle: "Clearer, faster, and more specific.",
    title: "Writing & editing",
  },
  {
    id: "planning",
    prompts: [
      {
        description: "Turn a product brief into a week-by-week launch checklist with owners.",
        id: "explore-planning-1",
        title: "Launch checklist from a brief",
      },
      {
        description: "Plan a 30/60/90 for a new hire on a product team with clear milestones.",
        id: "explore-planning-2",
        title: "30/60/90 for a new hire",
      },
      {
        description: "Draft a quarterly planning agenda that balances roadmap and metrics.",
        id: "explore-planning-3",
        title: "Quarterly planning agenda",
      },
    ],
    subtitle: "Structured plans and agendas you can actually use.",
    title: "Planning & ops",
  },
] as const;

export const DEFAULT_CHAT_THREAD_ID = CHAT_THREADS[0]?.id ?? "";

export function getChatThread(chatId: string) {
  return CHAT_THREADS.find((thread) => thread.id === chatId);
}

export type ChatPageKind = "thread" | "new" | "library" | "explore";

export type ChatActivePage =
  | { kind: "thread"; thread: ChatThread }
  | { kind: "new" }
  | { kind: "library" }
  | { kind: "explore" };

export function resolveChatActivePage(pathname: string, basePath: string): ChatActivePage {
  const trimmedBase = basePath.replace(/\/$/, "");
  const raw = pathname.startsWith(trimmedBase) ? pathname.slice(trimmedBase.length) : pathname;
  const relative = raw || "/";
  const firstSegment = relative.replace(/^\//, "").split("/")[0] ?? "";

  if (firstSegment === "new") return { kind: "new" };
  if (firstSegment === "library") return { kind: "library" };
  if (firstSegment === "explore") return { kind: "explore" };

  const threadId = firstSegment || DEFAULT_CHAT_THREAD_ID;
  const thread = getChatThread(threadId) ?? CHAT_THREADS[0];

  if (!thread) return { kind: "new" };

  return { kind: "thread", thread };
}
