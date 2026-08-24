"use client";

import {
  ChatAttachment,
  ChatAttachmentGroup,
  ChatLoader,
  ChatMessage as ChatMessagePrimitive,
  ChatSource,
  ChatSources,
  TextShimmer,
} from "@agile-avocation/ui-pro";
import { ChatTool, ChatToolGroup } from "@agile-avocation/ui-pro/chat-tool";
import { CodeBlock } from "@agile-avocation/ui-pro/code-block";
import { Markdown } from "@agile-avocation/ui-pro/markdown";
import { Alert } from "@heroui/react";
import { memo, type ReactNode } from "react";
import {
  ImageGeneration,
  Orbs,
  TaskList,
  ThinkingReasoning,
  ThinkingState,
  WebSearch,
} from "../../../components/ai/aicss/aicss-components";
import {
  type ChatAssistantMessage,
  type ChatCodeMessage,
  type ChatErrorMessage,
  type ChatImageGenerationMessage,
  type ChatLoadingMessage,
  type ChatMessage,
  type ChatMessageSource,
  type ChatMessageTool,
  ChatMessageType,
  type ChatOrbsMessage,
  type ChatReasoningMessage,
  type ChatSourcesMessage,
  type ChatStreamingMessage,
  type ChatTaskListMessage,
  type ChatToolGroupMessage,
  type ChatToolMessage,
  type ChatUserMessage,
  type ChatWebSearchMessage,
} from "../data/chat";
import { MessageActions } from "./message-actions";

export interface ThreadMessageProps {
  message: ChatMessage;
}

type MessageOfType<T extends ChatMessageType> = Extract<ChatMessage, { type: T }>;
type MessageRenderStrategy = (message: ChatMessage) => ReactNode;

function isMessageType<T extends ChatMessageType>(
  message: ChatMessage,
  type: T,
): message is MessageOfType<T> {
  return message.type === type;
}

function createMessageRenderStrategy<T extends ChatMessageType>(
  type: T,
  render: (message: MessageOfType<T>) => ReactNode,
): MessageRenderStrategy {
  return (message) => (isMessageType(message, type) ? render(message) : null);
}

function MessageAttachments({ message }: { message: ChatUserMessage }) {
  if (!message.attachments?.length) return null;

  return (
    <ChatAttachmentGroup className="mb-2">
      {message.attachments.map((attachment, index) => (
        <ChatAttachment
          key={`${attachment.name}-${index}`}
          name={attachment.name}
          {...(attachment.mimeType !== undefined ? { mimeType: attachment.mimeType } : {})}
          {...(attachment.size !== undefined ? { size: attachment.size } : {})}
          {...(attachment.src !== undefined ? { src: attachment.src } : {})}
        />
      ))}
    </ChatAttachmentGroup>
  );
}

function UserThreadMessage({ message }: { message: ChatUserMessage }) {
  return (
    <ChatMessagePrimitive.User>
      <MessageAttachments message={message} />
      <ChatMessagePrimitive.Bubble>
        <ChatMessagePrimitive.Content>{message.content}</ChatMessagePrimitive.Content>
      </ChatMessagePrimitive.Bubble>
      <MessageActions content={message.content} variant="minimal" />
    </ChatMessagePrimitive.User>
  );
}

function AssistantThreadMessage({ message }: { message: ChatAssistantMessage }) {
  return (
    <ChatMessagePrimitive.Assistant>
      <ChatMessagePrimitive.Body>
        <ChatMessagePrimitive.Content>
          <Markdown>{message.content}</Markdown>
        </ChatMessagePrimitive.Content>
        {message.actions ? (
          <MessageActions content={message.content} variant={message.actions} />
        ) : null}
      </ChatMessagePrimitive.Body>
    </ChatMessagePrimitive.Assistant>
  );
}

function ErrorThreadMessage({ message }: { message: ChatErrorMessage }) {
  return (
    <ChatMessagePrimitive.Assistant className="!py-0">
      <ChatMessagePrimitive.Body>
        <Alert className="max-w-xl bg-danger-soft" role="alert" status="danger">
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Title>回复生成失败</Alert.Title>
            <Alert.Description>{message.content}</Alert.Description>
          </Alert.Content>
        </Alert>
      </ChatMessagePrimitive.Body>
    </ChatMessagePrimitive.Assistant>
  );
}

function ReasoningThreadMessage({ message }: { message: ChatReasoningMessage }) {
  return (
    <ChatMessagePrimitive.Assistant className="!py-0">
      <ChatMessagePrimitive.Body>
        <ThinkingReasoning
          defaultExpanded={message.defaultExpanded ?? false}
          isStreaming={message.isStreaming ?? false}
          steps={message.steps}
          trigger={message.trigger}
        />
      </ChatMessagePrimitive.Body>
    </ChatMessagePrimitive.Assistant>
  );
}

function OrbsThreadMessage({ message }: { message: ChatOrbsMessage }) {
  return (
    <ChatMessagePrimitive.Assistant className="!py-0">
      <ChatMessagePrimitive.Body>
        <Orbs label={message.label} />
      </ChatMessagePrimitive.Body>
    </ChatMessagePrimitive.Assistant>
  );
}

function WebSearchThreadMessage({ message }: { message: ChatWebSearchMessage }) {
  return (
    <ChatMessagePrimitive.Assistant className="!py-0">
      <ChatMessagePrimitive.Body>
        <WebSearch
          isSearching={message.isSearching ?? false}
          query={message.query}
          sources={message.sources}
        />
      </ChatMessagePrimitive.Body>
    </ChatMessagePrimitive.Assistant>
  );
}

function ImageGenerationThreadMessage({ message }: { message: ChatImageGenerationMessage }) {
  return (
    <ChatMessagePrimitive.Assistant className="!py-0">
      <ChatMessagePrimitive.Body>
        <ImageGeneration
          prompt={message.prompt}
          {...(message.alt !== undefined ? { alt: message.alt } : {})}
          {...(message.imageUrl !== undefined ? { imageUrl: message.imageUrl } : {})}
          {...(message.isGenerating !== undefined ? { isGenerating: message.isGenerating } : {})}
        />
      </ChatMessagePrimitive.Body>
    </ChatMessagePrimitive.Assistant>
  );
}

function TaskListThreadMessage({ message }: { message: ChatTaskListMessage }) {
  return (
    <ChatMessagePrimitive.Assistant className="!py-0">
      <ChatMessagePrimitive.Body>
        <TaskList
          defaultExpanded={message.defaultExpanded ?? true}
          items={message.items}
          title={message.label}
        />
      </ChatMessagePrimitive.Body>
    </ChatMessagePrimitive.Assistant>
  );
}

function ToolCall({ tool }: { tool: ChatMessageTool }) {
  const isApproval = tool.state === "requires-action";

  return (
    <ChatTool
      defaultExpanded={isApproval || tool.state === "output-error"}
      state={tool.state}
      toolName={tool.toolName}
      triggerPrefix={isApproval ? "需要审批：" : "已使用工具："}
      {...(tool.argsText !== undefined ? { argsText: tool.argsText } : {})}
      {...(tool.errorText !== undefined ? { errorText: tool.errorText } : {})}
      {...(tool.input !== undefined ? { input: tool.input } : {})}
      {...(tool.output !== undefined ? { output: tool.output } : {})}
      {...(tool.toolCallId !== undefined ? { toolCallId: tool.toolCallId } : {})}
      {...(isApproval
        ? {
            approveLabel: "允许",
            onApprove: () => undefined,
            onReject: () => undefined,
            rejectLabel: "拒绝",
          }
        : {})}
    />
  );
}

function ToolThreadMessage({ message }: { message: ChatToolMessage }) {
  return (
    <ChatMessagePrimitive.Assistant className="!py-0">
      <ChatMessagePrimitive.Body>
        <ToolCall tool={message.tool} />
      </ChatMessagePrimitive.Body>
    </ChatMessagePrimitive.Assistant>
  );
}

function ToolGroupThreadMessage({ message }: { message: ChatToolGroupMessage }) {
  return (
    <ChatMessagePrimitive.Assistant className="!py-0">
      <ChatMessagePrimitive.Body>
        <ChatToolGroup
          defaultExpanded
          {...(message.active !== undefined ? { active: message.active } : {})}
        >
          <ChatToolGroup.Trigger>{message.label}</ChatToolGroup.Trigger>
          <ChatToolGroup.Content>
            {message.tools.map((tool, index) => (
              <ToolCall key={tool.toolCallId ?? `${tool.toolName}-${index}`} tool={tool} />
            ))}
          </ChatToolGroup.Content>
        </ChatToolGroup>
      </ChatMessagePrimitive.Body>
    </ChatMessagePrimitive.Assistant>
  );
}

function CodeThreadMessage({ message }: { message: ChatCodeMessage }) {
  return (
    <ChatMessagePrimitive.Assistant className="!py-0">
      <ChatMessagePrimitive.Body>
        <CodeBlock className="!my-0">
          <CodeBlock.Header>
            <span>{message.label}</span>
            <CodeBlock.CopyButton aria-label="复制代码" code={message.code} />
          </CodeBlock.Header>
          <CodeBlock.Code code={message.code} language={message.language} />
        </CodeBlock>
      </ChatMessagePrimitive.Body>
    </ChatMessagePrimitive.Assistant>
  );
}

function renderSource(source: ChatMessageSource, key: string) {
  if (source.sourceType === "url") {
    return (
      <ChatSource
        key={key}
        href={source.url}
        sourceType="url"
        title={source.title}
        {...(source.description !== undefined ? { description: source.description } : {})}
      />
    );
  }

  return <ChatSource key={key} sourceType="document" title={source.title} />;
}

function SourcesThreadMessage({ message }: { message: ChatSourcesMessage }) {
  return (
    <ChatMessagePrimitive.Assistant className="!py-0">
      <ChatMessagePrimitive.Body>
        <ChatSources className="!my-0" defaultExpanded={message.defaultExpanded ?? false}>
          <ChatSources.Trigger>{message.label}</ChatSources.Trigger>
          <ChatSources.Content>
            <ChatSources.List>
              {message.sources.map((source, index) =>
                renderSource(
                  source,
                  source.sourceType === "url"
                    ? `${source.url}-${index}`
                    : `${source.title}-${index}`,
                ),
              )}
            </ChatSources.List>
          </ChatSources.Content>
        </ChatSources>
      </ChatMessagePrimitive.Body>
    </ChatMessagePrimitive.Assistant>
  );
}

function StreamingThreadMessage({ message }: { message: ChatStreamingMessage }) {
  return (
    <ChatMessagePrimitive.Assistant aria-live="polite" className="!py-0">
      <ChatMessagePrimitive.Body>
        <TextShimmer className="text-muted">{message.label}</TextShimmer>
        <ChatLoader.Dots label={message.label} />
      </ChatMessagePrimitive.Body>
    </ChatMessagePrimitive.Assistant>
  );
}

function LoadingThreadMessage({ message }: { message: ChatLoadingMessage }) {
  return (
    <ChatMessagePrimitive.Assistant aria-busy="true" aria-live="polite" className="!py-0">
      <ChatMessagePrimitive.Body>
        <ThinkingState label={message.label} />
      </ChatMessagePrimitive.Body>
    </ChatMessagePrimitive.Assistant>
  );
}

const MESSAGE_RENDER_STRATEGIES = {
  [ChatMessageType.ASSISTANT]: createMessageRenderStrategy(ChatMessageType.ASSISTANT, (message) => (
    <AssistantThreadMessage message={message} />
  )),
  [ChatMessageType.CODE]: createMessageRenderStrategy(ChatMessageType.CODE, (message) => (
    <CodeThreadMessage message={message} />
  )),
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
  [ChatMessageType.USER]: createMessageRenderStrategy(ChatMessageType.USER, (message) => (
    <UserThreadMessage message={message} />
  )),
  [ChatMessageType.WEB_SEARCH]: createMessageRenderStrategy(
    ChatMessageType.WEB_SEARCH,
    (message) => <WebSearchThreadMessage message={message} />,
  ),
} satisfies Record<ChatMessageType, MessageRenderStrategy>;

export const ThreadMessage = memo(function ThreadMessage({ message }: ThreadMessageProps) {
  return MESSAGE_RENDER_STRATEGIES[message.type](message);
});
