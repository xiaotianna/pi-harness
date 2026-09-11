import type {
  ApprovalRequestKind,
  ApprovalResponseDecision,
} from "@pi-harness/agent-runtime/harness-event";
import type { RunMode } from "@pi-harness/agent-runtime/user-input";

export const ChatMessageType = {
  ASSISTANT: "assistant",
  CODE: "code",
  CONTEXT_COMPACTION: "context-compaction",
  ERROR: "error",
  IMAGE_GENERATION: "image-generation",
  INPUT_STATUS: "input-status",
  LOADING: "loading",
  ORBS: "orbs",
  PLAN_REVIEW: "plan-review",
  REASONING: "reasoning",
  SOURCES: "sources",
  STREAMING: "streaming",
  TASK_LIST: "task-list",
  TOOL: "tool",
  TOOL_GROUP: "tool-group",
  USER: "user",
  WEB_SEARCH: "web-search",
} as const;

export type ChatMessageType = (typeof ChatMessageType)[keyof typeof ChatMessageType];

export const ChatFileChangeStatus = {
  ADDED: "added",
  DELETED: "deleted",
  MODIFIED: "modified",
} as const;

export type ChatFileChangeStatus = (typeof ChatFileChangeStatus)[keyof typeof ChatFileChangeStatus];

export type ChatFileChange = {
  after?: string;
  before?: string | null;
  additions?: number;
  deletions?: number;
  sessionId?: string;
  runId?: string;
  eventSeq?: number;
  path: string;
  status: ChatFileChangeStatus;
};

export type ChatMessageImage = {
  alt: string;
  src: string;
};

export type ChatMessageReasoningStep = {
  content: string;
  label: string;
};

export const ChatToolState = {
  INPUT_AVAILABLE: "input-available",
  OUTPUT_AVAILABLE: "output-available",
  OUTPUT_ERROR: "output-error",
  REQUIRES_ACTION: "requires-action",
} as const;

export type ChatToolState = (typeof ChatToolState)[keyof typeof ChatToolState];

export type ChatMessageTool = {
  displayName?: string;
  activeLabel?: string;
  approval?: {
    approvalId: string;
    allowSession?: boolean;
    commandPrefix?: readonly string[];
    kind?: ApprovalRequestKind;
    preview?: string;
    risk: string;
    runId: string;
    summary: string;
    target: string;
  };
  argsText?: string;
  details?: unknown;
  errorText?: string;
  input?: unknown;
  output?: unknown;
  resultSource?: { sessionId: string; seq: number };
  state: ChatToolState;
  toolCallId?: string;
  toolName: string;
};

export type ResolveChatToolApproval = (
  approval: NonNullable<ChatMessageTool["approval"]>,
  decision: ApprovalResponseDecision,
) => Promise<void>;

export type ChatMessageSource =
  | {
      description?: string;
      sourceType: "url";
      title: string;
      url: string;
    }
  | {
      sourceType: "document";
      title: string;
    };

export type ChatMessageAttachment = {
  mimeType?: string;
  name: string;
  size?: number;
  src?: string;
};

type ChatMessageBase = {
  id: string;
  isIntermediate?: boolean;
  sessionId?: string;
  sourceEventId?: string;
  timestamp?: number;
  turnDurationMs?: number;
  turnId?: string;
};

export type ChatUserMessage = ChatMessageBase & {
  mode?: RunMode;
  attachments?: readonly ChatMessageAttachment[];
  content: string;
  type: typeof ChatMessageType.USER;
};

export type ChatAssistantMessage = ChatMessageBase & {
  actionContent?: string;
  actions?: "full" | "minimal" | "timestamp";
  areFileChangesReverted?: boolean;
  content: string;
  fileChanges?: readonly ChatFileChange[];
  image?: ChatMessageImage;
  isStreaming?: boolean;
  type: typeof ChatMessageType.ASSISTANT;
};

export const ChatPlanReviewStatus = {
  CLOSED: "closed",
  CONFIRMED: "confirmed",
  PENDING: "pending",
  REVISION_REQUESTED: "revision_requested",
} as const;

export type ChatPlanReviewStatus = (typeof ChatPlanReviewStatus)[keyof typeof ChatPlanReviewStatus];

export type ChatPlanReviewMessage = ChatMessageBase & {
  isStreaming?: boolean;
  planMarkdown: string;
  status: ChatPlanReviewStatus;
  type: typeof ChatMessageType.PLAN_REVIEW;
};

export const ChatInputStatus = {
  ANSWERED: "answered",
  EXPIRED: "expired",
  WAITING: "waiting",
} as const;

export type ChatInputStatus = (typeof ChatInputStatus)[keyof typeof ChatInputStatus];

export type ChatInputStatusMessage = ChatMessageBase & {
  status: ChatInputStatus;
  type: typeof ChatMessageType.INPUT_STATUS;
};

export type ChatErrorMessage = ChatMessageBase & {
  areFileChangesReverted?: boolean;
  content: string;
  fileChanges?: readonly ChatFileChange[];
  type: typeof ChatMessageType.ERROR;
};

export type ChatReasoningMessage = ChatMessageBase & {
  defaultExpanded?: boolean;
  isActive?: boolean;
  isStreaming?: boolean;
  steps: readonly ChatMessageReasoningStep[];
  trigger: string;
  type: typeof ChatMessageType.REASONING;
};

export type ChatToolMessage = ChatMessageBase & {
  tool: ChatMessageTool;
  type: typeof ChatMessageType.TOOL;
};

export type ChatToolGroupMessage = ChatMessageBase & {
  active?: boolean;
  label: string;
  tools: readonly ChatMessageTool[];
  type: typeof ChatMessageType.TOOL_GROUP;
};

export type ChatCodeMessage = ChatMessageBase & {
  code: string;
  label: string;
  language: string;
  type: typeof ChatMessageType.CODE;
};

export type ChatContextCompactionMessage = ChatMessageBase & {
  isActive: boolean;
  type: typeof ChatMessageType.CONTEXT_COMPACTION;
};

export type ChatSourcesMessage = ChatMessageBase & {
  defaultExpanded?: boolean;
  label: string;
  sources: readonly ChatMessageSource[];
  type: typeof ChatMessageType.SOURCES;
};

export type ChatStreamingMessage = ChatMessageBase & {
  label: string;
  type: typeof ChatMessageType.STREAMING;
};

export type ChatLoadingMessage = ChatMessageBase & {
  label: string;
  type: typeof ChatMessageType.LOADING;
};

export type ChatOrbsMessage = ChatMessageBase & {
  label: string;
  type: typeof ChatMessageType.ORBS;
};

export type ChatWebSearchMessage = ChatMessageBase & {
  isSearching?: boolean;
  query: string;
  sources: ReadonlyArray<{
    domain: string;
    status: "pending" | "resolved";
    title: string;
    url: string;
  }>;
  type: typeof ChatMessageType.WEB_SEARCH;
};

export type ChatImageGenerationMessage = ChatMessageBase & {
  alt?: string;
  imageUrl?: string;
  isGenerating?: boolean;
  prompt: string;
  type: typeof ChatMessageType.IMAGE_GENERATION;
};

export type ChatTaskListMessage = ChatMessageBase & {
  defaultExpanded?: boolean;
  items: ReadonlyArray<{
    id: string;
    label: string;
    status: "blocked" | "cancelled" | "completed" | "in-progress" | "pending";
  }>;
  label: string;
  revision?: number;
  type: typeof ChatMessageType.TASK_LIST;
};

export type ChatMessage =
  | ChatAssistantMessage
  | ChatCodeMessage
  | ChatContextCompactionMessage
  | ChatErrorMessage
  | ChatImageGenerationMessage
  | ChatInputStatusMessage
  | ChatLoadingMessage
  | ChatOrbsMessage
  | ChatPlanReviewMessage
  | ChatReasoningMessage
  | ChatSourcesMessage
  | ChatStreamingMessage
  | ChatTaskListMessage
  | ChatToolGroupMessage
  | ChatToolMessage
  | ChatUserMessage
  | ChatWebSearchMessage;
