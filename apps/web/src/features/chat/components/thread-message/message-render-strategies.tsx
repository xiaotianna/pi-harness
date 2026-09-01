import type { ReactNode } from "react";
import { type ChatMessage, ChatMessageType } from "../../data/chat";
import { AssistantThreadMessage } from "./assistant-thread-message";
import { CodeThreadMessage } from "./code-thread-message";
import { ContextCompactionThreadMessage } from "./context-compaction-thread-message";
import { ErrorThreadMessage } from "./error-thread-message";
import { ImageGenerationThreadMessage } from "./image-generation-thread-message";
import { LoadingThreadMessage } from "./loading-thread-message";
import { OrbsThreadMessage } from "./orbs-thread-message";
import { ReasoningThreadMessage } from "./reasoning-thread-message";
import { SourcesThreadMessage } from "./sources-thread-message";
import { StreamingThreadMessage } from "./streaming-thread-message";
import { TaskListThreadMessage } from "./task-list-thread-message";
import { ToolGroupThreadMessage } from "./tool-group-thread-message";
import { ToolThreadMessage } from "./tool-thread-message";
import { UserThreadMessage } from "./user-thread-message";
import { WebSearchThreadMessage } from "./web-search-thread-message";

type MessageOfType<T extends ChatMessageType> = Extract<ChatMessage, { type: T }>;
interface MessageRenderContext {
  isLastUserMessage: boolean;
}

type MessageRenderStrategy = (message: ChatMessage, context: MessageRenderContext) => ReactNode;

function isMessageType<T extends ChatMessageType>(
  message: ChatMessage,
  type: T,
): message is MessageOfType<T> {
  return message.type === type;
}

function createMessageRenderStrategy<T extends ChatMessageType>(
  type: T,
  render: (message: MessageOfType<T>, context: MessageRenderContext) => ReactNode,
): MessageRenderStrategy {
  return (message, context) => (isMessageType(message, type) ? render(message, context) : null);
}

export const MESSAGE_RENDER_STRATEGIES = {
  [ChatMessageType.ASSISTANT]: createMessageRenderStrategy(ChatMessageType.ASSISTANT, (message) => (
    <AssistantThreadMessage message={message} />
  )),
  [ChatMessageType.CODE]: createMessageRenderStrategy(ChatMessageType.CODE, (message) => (
    <CodeThreadMessage message={message} />
  )),
  [ChatMessageType.CONTEXT_COMPACTION]: createMessageRenderStrategy(
    ChatMessageType.CONTEXT_COMPACTION,
    (message) => <ContextCompactionThreadMessage message={message} />,
  ),
  [ChatMessageType.ERROR]: createMessageRenderStrategy(ChatMessageType.ERROR, (message) => (
    <ErrorThreadMessage message={message} />
  )),
  [ChatMessageType.IMAGE_GENERATION]: createMessageRenderStrategy(
    ChatMessageType.IMAGE_GENERATION,
    (message) => <ImageGenerationThreadMessage message={message} />,
  ),
  [ChatMessageType.LOADING]: createMessageRenderStrategy(ChatMessageType.LOADING, (message) => (
    <LoadingThreadMessage message={message} />
  )),
  [ChatMessageType.ORBS]: createMessageRenderStrategy(ChatMessageType.ORBS, (message) => (
    <OrbsThreadMessage message={message} />
  )),
  [ChatMessageType.REASONING]: createMessageRenderStrategy(ChatMessageType.REASONING, (message) => (
    <ReasoningThreadMessage message={message} />
  )),
  [ChatMessageType.SOURCES]: createMessageRenderStrategy(ChatMessageType.SOURCES, (message) => (
    <SourcesThreadMessage message={message} />
  )),
  [ChatMessageType.STREAMING]: createMessageRenderStrategy(ChatMessageType.STREAMING, (message) => (
    <StreamingThreadMessage message={message} />
  )),
  [ChatMessageType.TASK_LIST]: createMessageRenderStrategy(ChatMessageType.TASK_LIST, (message) => (
    <TaskListThreadMessage message={message} />
  )),
  [ChatMessageType.TOOL]: createMessageRenderStrategy(ChatMessageType.TOOL, (message) => (
    <ToolThreadMessage message={message} />
  )),
  [ChatMessageType.TOOL_GROUP]: createMessageRenderStrategy(
    ChatMessageType.TOOL_GROUP,
    (message) => <ToolGroupThreadMessage message={message} />,
  ),
  [ChatMessageType.USER]: createMessageRenderStrategy(ChatMessageType.USER, (message, context) => (
    <UserThreadMessage isLastUserMessage={context.isLastUserMessage} message={message} />
  )),
  [ChatMessageType.WEB_SEARCH]: createMessageRenderStrategy(
    ChatMessageType.WEB_SEARCH,
    (message) => <WebSearchThreadMessage message={message} />,
  ),
} satisfies Record<ChatMessageType, MessageRenderStrategy>;
