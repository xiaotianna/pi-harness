import type { ToolPartState } from "@agile-avocation/ui-pro/chat-tool";

export const ChatMessageType = {
  ASSISTANT: "assistant",
  CODE: "code",
  LOADING: "loading",
  REASONING: "reasoning",
  SOURCES: "sources",
  STREAMING: "streaming",
  TOOL: "tool",
  TOOL_GROUP: "tool-group",
  USER: "user",
} as const;

export type ChatMessageType = (typeof ChatMessageType)[keyof typeof ChatMessageType];

export type ChatMessageImage = {
  alt: string;
  src: string;
};

export type ChatMessageReasoningStep = {
  content: string;
  label: string;
};

export type ChatMessageTool = {
  argsText?: string;
  errorText?: string;
  input?: unknown;
  output?: unknown;
  state: ToolPartState;
  toolCallId?: string;
  toolName: string;
};

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
};

export type ChatUserMessage = ChatMessageBase & {
  attachments?: readonly ChatMessageAttachment[];
  content: string;
  type: typeof ChatMessageType.USER;
};

export type ChatAssistantMessage = ChatMessageBase & {
  actions?: "full" | "minimal";
  content: string;
  image?: ChatMessageImage;
  type: typeof ChatMessageType.ASSISTANT;
};

export type ChatReasoningMessage = ChatMessageBase & {
  defaultExpanded?: boolean;
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

export type ChatMessage =
  | ChatAssistantMessage
  | ChatCodeMessage
  | ChatLoadingMessage
  | ChatReasoningMessage
  | ChatSourcesMessage
  | ChatStreamingMessage
  | ChatToolGroupMessage
  | ChatToolMessage
  | ChatUserMessage;
