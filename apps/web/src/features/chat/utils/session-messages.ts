import { isInternalAgentMessage } from "@pi-harness/agent-runtime/agent-message";
import {
  ApprovalDecision,
  type HarnessEvent,
  HarnessEventType,
  MessageDeltaKind,
} from "@pi-harness/agent-runtime/harness-event";
import { isHarnessUserMessage } from "@pi-harness/agent-runtime/user-input";
import { UpdatePlanToolName, UpdateTodosToolName } from "@pi-harness/agent-runtime/working-state";
import { isPlainObject } from "es-toolkit";
import type { Session, SessionSnapshot } from "../api/session-api";
import {
  type ChatAssistantMessage,
  type ChatContextCompactionMessage,
  type ChatMessage,
  type ChatMessageTool,
  ChatMessageType,
  type ChatThread,
  type ChatToolGroupMessage,
  ChatToolState,
} from "../data/chat";
import {
  readRevertedSessionRunIds,
  summarizeSessionFileChangesByRun,
} from "./session-file-changes";

const TERMINAL_RUN_EVENTS = new Set<HarnessEvent["type"]>([
  HarnessEventType.RUN_ABORTED,
  HarnessEventType.RUN_COMPLETED,
  HarnessEventType.RUN_FAILED,
]);

const WORKING_STATE_TOOL_NAMES = new Set<string>([UpdatePlanToolName, UpdateTodosToolName]);

function readContentText(value: unknown): string {
  if (typeof value === "string") return value;
  if (!Array.isArray(value)) return "";
  return value
    .flatMap((part) =>
      isPlainObject(part) && part.type === "text" && typeof part.text === "string"
        ? [part.text]
        : [],
    )
    .join("");
}

function readCompletedMessages(event: HarnessEvent, messageId = event.id): ChatMessage[] {
  if (!isPlainObject(event.data) || isInternalAgentMessage(event.data)) return [];
  const content = readContentText(event.data.content);
  if (!content && !Array.isArray(event.data.content)) return [];
  if (event.data.role === "user") {
    const harnessUserMessage = isHarnessUserMessage(event.data) ? event.data : null;
    const displayContent = harnessUserMessage?.displayText ?? content;
    const attachments = harnessUserMessage
      ? (harnessUserMessage.attachments ?? []).flatMap((attachment) => {
          if (
            !isPlainObject(attachment) ||
            typeof attachment.mimeType !== "string" ||
            typeof attachment.name !== "string" ||
            typeof attachment.size !== "number"
          ) {
            return [];
          }
          const image =
            typeof attachment.contentIndex === "number" && Array.isArray(harnessUserMessage.content)
              ? harnessUserMessage.content[attachment.contentIndex]
              : undefined;
          const src =
            isPlainObject(image) &&
            image.type === "image" &&
            typeof image.data === "string" &&
            typeof image.mimeType === "string"
              ? `data:${image.mimeType};base64,${image.data}`
              : undefined;
          return [
            {
              mimeType: attachment.mimeType,
              name: attachment.name,
              size: attachment.size,
              ...(src === undefined ? {} : { src }),
            },
          ];
        })
      : [];
    return displayContent || attachments.length > 0
      ? [
          {
            ...(attachments.length === 0 ? {} : { attachments }),
            content: displayContent,
            id: event.id,
            sourceEventId: event.id,
            timestamp: event.timestamp,
            type: ChatMessageType.USER,
          },
        ]
      : [];
  }
  if (event.data.role !== "assistant" || !Array.isArray(event.data.content)) return [];

  const turn = event.runId === undefined ? {} : { turnId: event.runId };
  const tools = event.data.content.flatMap<ChatMessageTool>((part) => {
    if (
      !isPlainObject(part) ||
      part.type !== "toolCall" ||
      typeof part.id !== "string" ||
      typeof part.name !== "string"
    ) {
      return [];
    }
    if (WORKING_STATE_TOOL_NAMES.has(part.name)) return [];
    return [
      {
        input: part.arguments,
        state: ChatToolState.INPUT_AVAILABLE,
        toolCallId: part.id,
        toolName: part.name,
      },
    ];
  });
  const messages: ChatMessage[] = [];
  let hasAddedTools = false;

  for (const [index, part] of event.data.content.entries()) {
    if (!isPlainObject(part)) continue;
    if (part.type === "thinking" && typeof part.thinking === "string" && part.thinking.trim()) {
      messages.push({
        id: `${messageId}-thinking-${index}`,
        steps: [{ content: part.thinking, label: "分析" }],
        trigger: "已思考",
        type: ChatMessageType.REASONING,
        ...turn,
      });
      continue;
    }
    if (part.type === "text" && typeof part.text === "string" && part.text.trim()) {
      messages.push({
        content: part.text,
        id: `${messageId}-text-${index}`,
        sourceEventId: event.id,
        timestamp: event.timestamp,
        type: ChatMessageType.ASSISTANT,
        ...turn,
      });
      continue;
    }
    if (part.type !== "toolCall" || hasAddedTools || tools.length === 0) continue;
    hasAddedTools = true;
    const firstTool = tools[0];
    if (tools.length === 1 && firstTool) {
      messages.push({
        id: `tool-${firstTool.toolCallId}`,
        tool: firstTool,
        type: ChatMessageType.TOOL,
        ...turn,
      });
    } else {
      messages.push({
        active: true,
        id: `${messageId}-tools`,
        label: `已调用 ${tools.length} 个工具`,
        tools,
        type: ChatMessageType.TOOL_GROUP,
        ...turn,
      });
    }
  }

  return messages;
}

type StreamingContent = {
  content: string;
  kind: typeof MessageDeltaKind.TEXT | typeof MessageDeltaKind.THINKING;
};

function readDelta(event: HarnessEvent): (StreamingContent & { contentIndex: number }) | null {
  if (
    !isPlainObject(event.data) ||
    (event.data.kind !== MessageDeltaKind.TEXT && event.data.kind !== MessageDeltaKind.THINKING) ||
    typeof event.data.contentIndex !== "number" ||
    typeof event.data.delta !== "string"
  ) {
    return null;
  }
  return {
    content: event.data.delta,
    contentIndex: event.data.contentIndex,
    kind: event.data.kind,
  };
}

function readFailureMessage(event: HarnessEvent): string {
  return isPlainObject(event.data) && typeof event.data.message === "string"
    ? event.data.message
    : "Agent 运行失败";
}

function readToolResult(value: unknown): unknown {
  if (!isPlainObject(value)) return value;
  const text = readContentText(value.content);
  return text || value;
}

function readToolDetails(value: unknown): unknown {
  return isPlainObject(value) ? value.details : undefined;
}

function readToolError(value: unknown): string {
  const result = readToolResult(value);
  return typeof result === "string" && result ? result : "工具执行失败";
}

function readToolActiveLabel(value: unknown): string | null {
  if (!isPlainObject(value) || !isPlainObject(value.details)) return null;
  switch (value.details.stage) {
    case "preparing":
      return "正在扫描文件状态";
    case "running":
      return "正在执行命令";
    case "collecting_changes":
      return "正在统计文件变化";
    case "searching":
      return "正在搜索网页";
    case "processing":
      return "正在整理搜索结果";
    case "connecting":
      return "正在连接网页";
    case "downloading":
      return "正在读取网页";
    case "parsing":
      return "正在提取网页正文";
    default:
      return null;
  }
}

function readApprovalPreview(tool: ChatMessageTool): string | null {
  if (!isPlainObject(tool.input)) return null;
  if (
    tool.toolName === "edit_file" &&
    typeof tool.input.oldText === "string" &&
    typeof tool.input.newText === "string"
  ) {
    return `原文本：\n${tool.input.oldText}\n\n替换为：\n${tool.input.newText || "(空内容)"}`;
  }
  if (tool.toolName === "write_file" && typeof tool.input.content === "string") {
    return `完整写入内容：\n${tool.input.content || "(空内容)"}`;
  }
  return null;
}

function isToolActive(tool: ChatMessageTool): boolean {
  return (
    tool.state === ChatToolState.INPUT_AVAILABLE || tool.state === ChatToolState.REQUIRES_ACTION
  );
}

function refreshToolGroupState(group: ChatToolGroupMessage | undefined): void {
  if (group) group.active = group.tools.some(isToolActive);
}

function markRunIntermediateMessages(
  messages: ChatMessage[],
  runId: string,
  durationMs?: number,
  finalMessageId?: string,
): void {
  for (const message of messages) {
    if (message.turnId !== runId || message.id === finalMessageId) continue;
    message.isIntermediate = true;
    if (durationMs !== undefined) message.turnDurationMs = durationMs;
    if (message.type === ChatMessageType.REASONING) message.defaultExpanded = false;
  }
}

export function findActiveRunId(events: readonly HarnessEvent[]): string | null {
  let activeRunId: string | null = null;
  for (const event of events) {
    if (event.type === HarnessEventType.RUN_STARTED && event.runId) activeRunId = event.runId;
    if (TERMINAL_RUN_EVENTS.has(event.type) && event.runId === activeRunId) activeRunId = null;
  }
  return activeRunId;
}

/**
 * 将完成的jsonl数据转为页面渲染的消息
 * 通过遍历，将工具调用的中间状态数据合并为最终状态
 */
export function sessionEventsToMessages(events: readonly HarnessEvent[]): readonly ChatMessage[] {
  const messages: ChatMessage[] = [];
  const messagesByRunId = new Map<string, ChatMessage[]>();
  const fileChangesByRunId = summarizeSessionFileChangesByRun(events);
  const revertedRunIds = readRevertedSessionRunIds(events);
  const activeAssistantMessageIdByRunId = new Map<string, string>();
  const activeCompactionByRunId = new Map<string, ChatContextCompactionMessage>();
  const lastAssistantMessageByRunId = new Map<string, ChatAssistantMessage>();
  const runStartedAtById = new Map<string, number>();
  const streamingContentByRunId = new Map<string, Map<number, StreamingContent>>();
  const toolsByCallId = new Map<string, ChatMessageTool>();
  const toolGroupsByCallId = new Map<string, ChatToolGroupMessage>();

  const pushMessage = (message: ChatMessage) => {
    messages.push(message);
    if (!message.turnId) return;
    const runMessages = messagesByRunId.get(message.turnId) ?? [];
    runMessages.push(message);
    messagesByRunId.set(message.turnId, runMessages);
  };

  const placeTurnActions = (event: HarnessEvent, message?: ChatAssistantMessage) => {
    if (!event.runId) return;
    if (message && messagesByRunId.get(event.runId)?.at(-1) === message) {
      message.actions = "full";
      message.timestamp = event.timestamp;
      return;
    }
    pushMessage({
      ...(message ? { actionContent: message.content } : {}),
      actions: message ? "full" : "timestamp",
      content: "",
      id: `turn-footer-${event.id}`,
      timestamp: event.timestamp,
      turnId: event.runId,
      type: ChatMessageType.ASSISTANT,
    });
  };

  for (const event of events) {
    if (event.type === HarnessEventType.RUN_STARTED && event.runId) {
      runStartedAtById.set(event.runId, event.timestamp);
      continue;
    }

    if (event.type === HarnessEventType.CONTEXT_COMPACTION_STARTED && event.runId) {
      const message: ChatContextCompactionMessage = {
        id: `context-compaction-${event.id}`,
        isActive: true,
        turnId: event.runId,
        type: ChatMessageType.CONTEXT_COMPACTION,
      };
      activeCompactionByRunId.set(event.runId, message);
      pushMessage(message);
      continue;
    }

    if (event.type === HarnessEventType.CONTEXT_COMPACTED && event.runId) {
      const activeMessage = activeCompactionByRunId.get(event.runId);
      if (activeMessage) {
        activeMessage.isActive = false;
        activeCompactionByRunId.delete(event.runId);
      } else {
        pushMessage({
          id: `context-compaction-${event.id}`,
          isActive: false,
          turnId: event.runId,
          type: ChatMessageType.CONTEXT_COMPACTION,
        });
      }
      continue;
    }

    if (
      event.type === HarnessEventType.MESSAGE_STARTED &&
      event.runId &&
      isPlainObject(event.data) &&
      event.data.role === "assistant"
    ) {
      activeAssistantMessageIdByRunId.set(event.runId, event.id);
      continue;
    }

    if (
      event.type === HarnessEventType.TOOL_STARTED &&
      isPlainObject(event.data) &&
      typeof event.data.toolCallId === "string" &&
      typeof event.data.toolName === "string"
    ) {
      if (WORKING_STATE_TOOL_NAMES.has(event.data.toolName)) continue;
      const existingTool = toolsByCallId.get(event.data.toolCallId);
      if (existingTool) {
        existingTool.input = event.data.arguments;
        existingTool.state = ChatToolState.INPUT_AVAILABLE;
      } else {
        const tool: ChatMessageTool = {
          input: event.data.arguments,
          state: ChatToolState.INPUT_AVAILABLE,
          toolCallId: event.data.toolCallId,
          toolName: event.data.toolName,
        };
        toolsByCallId.set(event.data.toolCallId, tool);
        pushMessage({
          id: `tool-${event.data.toolCallId}`,
          tool,
          type: ChatMessageType.TOOL,
          ...(event.runId === undefined ? {} : { turnId: event.runId }),
        });
      }
      continue;
    }

    if (
      event.type === HarnessEventType.TOOL_UPDATED &&
      isPlainObject(event.data) &&
      typeof event.data.toolCallId === "string"
    ) {
      const tool = toolsByCallId.get(event.data.toolCallId);
      if (tool) {
        tool.details = readToolDetails(event.data.partialResult);
        tool.output = readToolResult(event.data.partialResult);
        const activeLabel = readToolActiveLabel(event.data.partialResult);
        if (activeLabel) tool.activeLabel = activeLabel;
      }
      continue;
    }

    if (
      event.type === HarnessEventType.APPROVAL_REQUESTED &&
      event.runId &&
      isPlainObject(event.data) &&
      typeof event.data.approvalId === "string" &&
      typeof event.data.risk === "string" &&
      typeof event.data.summary === "string" &&
      typeof event.data.target === "string" &&
      typeof event.data.toolCallId === "string"
    ) {
      const tool = toolsByCallId.get(event.data.toolCallId);
      if (tool) {
        const preview = readApprovalPreview(tool);
        tool.approval = {
          approvalId: event.data.approvalId,
          ...(preview === null ? {} : { preview }),
          risk: event.data.risk,
          runId: event.runId,
          summary: event.data.summary,
          target: event.data.target,
        };
        tool.state = ChatToolState.REQUIRES_ACTION;
      }
      continue;
    }

    if (
      event.type === HarnessEventType.APPROVAL_RESOLVED &&
      isPlainObject(event.data) &&
      typeof event.data.toolCallId === "string"
    ) {
      const tool = toolsByCallId.get(event.data.toolCallId);
      if (tool) {
        delete tool.activeLabel;
        delete tool.approval;
        if (event.data.decision === ApprovalDecision.APPROVED) {
          tool.state = ChatToolState.INPUT_AVAILABLE;
        } else {
          tool.errorText =
            event.data.decision === ApprovalDecision.EXPIRED
              ? "工具审批已超时"
              : "用户拒绝了工具审批";
          tool.state = ChatToolState.OUTPUT_ERROR;
        }
        refreshToolGroupState(toolGroupsByCallId.get(event.data.toolCallId));
      }
      continue;
    }

    if (
      (event.type === HarnessEventType.TOOL_COMPLETED ||
        event.type === HarnessEventType.TOOL_FAILED) &&
      isPlainObject(event.data) &&
      typeof event.data.toolCallId === "string"
    ) {
      const tool = toolsByCallId.get(event.data.toolCallId);
      if (tool) {
        delete tool.activeLabel;
        delete tool.approval;
        if (event.type === HarnessEventType.TOOL_FAILED) {
          tool.errorText = readToolError(event.data.result);
          tool.state = ChatToolState.OUTPUT_ERROR;
        } else {
          tool.details = readToolDetails(event.data.result);
          tool.output = readToolResult(event.data.result);
          tool.state = ChatToolState.OUTPUT_AVAILABLE;
        }
        refreshToolGroupState(toolGroupsByCallId.get(event.data.toolCallId));
      }
      continue;
    }

    if (event.type === HarnessEventType.MESSAGE_DELTA && event.runId) {
      const delta = readDelta(event);
      if (delta) {
        const contentByIndex = streamingContentByRunId.get(event.runId) ?? new Map();
        const current = contentByIndex.get(delta.contentIndex);
        contentByIndex.set(delta.contentIndex, {
          content: current?.kind === delta.kind ? current.content + delta.content : delta.content,
          kind: delta.kind,
        });
        streamingContentByRunId.set(event.runId, contentByIndex);
      }
      continue;
    }

    if (event.type === HarnessEventType.MESSAGE_COMPLETED) {
      const messageId = event.runId ? activeAssistantMessageIdByRunId.get(event.runId) : undefined;
      const completedMessages = readCompletedMessages(event, messageId ?? event.id);
      for (const message of completedMessages) {
        pushMessage(message);
        if (message.type === ChatMessageType.TOOL) {
          if (message.tool.toolCallId) toolsByCallId.set(message.tool.toolCallId, message.tool);
        } else if (message.type === ChatMessageType.TOOL_GROUP) {
          for (const tool of message.tools) {
            if (tool.toolCallId) {
              toolsByCallId.set(tool.toolCallId, tool);
              toolGroupsByCallId.set(tool.toolCallId, message);
            }
          }
        } else if (event.runId && message.type === ChatMessageType.ASSISTANT) {
          lastAssistantMessageByRunId.set(event.runId, message);
        }
      }
      if (event.runId && isPlainObject(event.data) && event.data.role === "assistant") {
        activeAssistantMessageIdByRunId.delete(event.runId);
        streamingContentByRunId.delete(event.runId);
      }
      continue;
    }

    if (event.type === HarnessEventType.RUN_COMPLETED && event.runId) {
      const message = lastAssistantMessageByRunId.get(event.runId);
      const startedAt = runStartedAtById.get(event.runId);
      const fileChanges = fileChangesByRunId.get(event.runId);
      if (message) {
        if (fileChanges?.length) {
          message.areFileChangesReverted = revertedRunIds.has(event.runId);
          message.fileChanges = fileChanges;
          message.sessionId = event.sessionId;
        }
      }
      markRunIntermediateMessages(
        messagesByRunId.get(event.runId) ?? [],
        event.runId,
        startedAt === undefined ? undefined : Math.max(0, event.timestamp - startedAt),
        message?.id,
      );
      placeTurnActions(event, message);
    }

    if (event.type === HarnessEventType.RUN_FAILED && event.runId) {
      const startedAt = runStartedAtById.get(event.runId);
      const fileChanges = fileChangesByRunId.get(event.runId);
      markRunIntermediateMessages(
        messagesByRunId.get(event.runId) ?? [],
        event.runId,
        startedAt === undefined ? undefined : Math.max(0, event.timestamp - startedAt),
      );
      pushMessage({
        areFileChangesReverted: revertedRunIds.has(event.runId),
        content: readFailureMessage(event),
        ...(fileChanges?.length ? { fileChanges } : {}),
        id: `failed-${event.id}`,
        sessionId: event.sessionId,
        type: ChatMessageType.ERROR,
        turnId: event.runId,
      });
      placeTurnActions(event, lastAssistantMessageByRunId.get(event.runId));
      streamingContentByRunId.delete(event.runId);
    }

    if (event.type === HarnessEventType.RUN_ABORTED && event.runId) {
      const message = lastAssistantMessageByRunId.get(event.runId);
      const fileChanges = fileChangesByRunId.get(event.runId);
      if (message && fileChanges?.length) {
        message.areFileChangesReverted = revertedRunIds.has(event.runId);
        message.fileChanges = fileChanges;
        message.sessionId = event.sessionId;
      }
      placeTurnActions(event, message);
      streamingContentByRunId.delete(event.runId);
    }
  }

  const activeRunId = findActiveRunId(events);
  const hasActiveTool = messages.some(
    (message) =>
      (message.type === ChatMessageType.TOOL && isToolActive(message.tool)) ||
      (message.type === ChatMessageType.TOOL_GROUP && message.tools.some(isToolActive)),
  );
  const isAwaitingApproval = messages.some(
    (message) =>
      (message.type === ChatMessageType.TOOL &&
        message.tool.state === ChatToolState.REQUIRES_ACTION) ||
      (message.type === ChatMessageType.TOOL_GROUP &&
        message.tools.some((tool) => tool.state === ChatToolState.REQUIRES_ACTION)),
  );
  if (
    activeRunId &&
    !isAwaitingApproval &&
    !hasActiveTool &&
    !activeCompactionByRunId.has(activeRunId)
  ) {
    const messageId =
      activeAssistantMessageIdByRunId.get(activeRunId) ?? `streaming-${activeRunId}`;
    const content = [...(streamingContentByRunId.get(activeRunId)?.entries() ?? [])].sort(
      ([left], [right]) => left - right,
    );
    if (content.length === 0) {
      pushMessage({
        id: `loading-${activeRunId}`,
        label: "正在思考…",
        turnId: activeRunId,
        type: ChatMessageType.LOADING,
      });
    } else {
      const lastContentIndex = content.at(-1)?.[0];
      for (const [contentIndex, part] of content) {
        pushMessage(
          part.kind === MessageDeltaKind.THINKING
            ? {
                defaultExpanded: true,
                id: `${messageId}-thinking-${contentIndex}`,
                isStreaming: contentIndex === lastContentIndex,
                steps: [{ content: part.content, label: "分析" }],
                trigger: "已思考",
                turnId: activeRunId,
                type: ChatMessageType.REASONING,
              }
            : {
                content: part.content,
                id: `${messageId}-text-${contentIndex}`,
                isStreaming: contentIndex === lastContentIndex,
                turnId: activeRunId,
                type: ChatMessageType.ASSISTANT,
              },
        );
      }
    }
  }

  return messages;
}

export function sessionToChatThread(session: Session, preview = ""): ChatThread {
  return {
    id: session.id,
    isRunning: session.isRunning ?? false,
    messages: [],
    modelId: session.modelId,
    preview,
    providerId: session.providerId,
    searchModeId: "",
    title: session.title,
    updatedAt: new Date(session.updatedAt).toISOString(),
    user: { avatar: "", email: "", name: "" },
    workspaceId: session.workspaceId,
  };
}

export function updateSnapshotWithEvents(
  snapshot: SessionSnapshot,
  incoming: readonly HarnessEvent[],
): SessionSnapshot {
  const eventsBySeq = new Map(snapshot.events.map((event) => [event.seq, event]));
  for (const event of incoming) {
    if (event.sessionId === snapshot.session.id) eventsBySeq.set(event.seq, event);
  }
  const events = [...eventsBySeq.values()].sort((left, right) => left.seq - right.seq);
  const completedThroughSeqByRunId = new Map<string, number>();
  const completedToolCallIds = new Set<string>();
  const latestToolUpdateSeqByCallId = new Map<string, number>();
  for (const event of events) {
    if (
      (event.type === HarnessEventType.TOOL_COMPLETED ||
        event.type === HarnessEventType.TOOL_FAILED) &&
      isPlainObject(event.data) &&
      typeof event.data.toolCallId === "string"
    ) {
      completedToolCallIds.add(event.data.toolCallId);
    }
    if (
      event.type === HarnessEventType.TOOL_UPDATED &&
      isPlainObject(event.data) &&
      typeof event.data.toolCallId === "string"
    ) {
      latestToolUpdateSeqByCallId.set(event.data.toolCallId, event.seq);
    }
    if (!event.runId) continue;
    const isAssistantCompleted =
      event.type === HarnessEventType.MESSAGE_COMPLETED &&
      isPlainObject(event.data) &&
      event.data.role === "assistant";
    if (isAssistantCompleted || TERMINAL_RUN_EVENTS.has(event.type)) {
      completedThroughSeqByRunId.set(event.runId, event.seq);
    }
  }
  const retainedEvents = events.filter((event) => {
    if (
      event.type === HarnessEventType.TOOL_UPDATED &&
      isPlainObject(event.data) &&
      typeof event.data.toolCallId === "string"
    ) {
      return (
        !completedToolCallIds.has(event.data.toolCallId) &&
        latestToolUpdateSeqByCallId.get(event.data.toolCallId) === event.seq
      );
    }
    if (event.type !== HarnessEventType.MESSAGE_DELTA || !event.runId) return true;
    return event.seq > (completedThroughSeqByRunId.get(event.runId) ?? 0);
  });
  const lastEvent = retainedEvents.at(-1);
  return lastEvent
    ? {
        events: retainedEvents,
        session: {
          ...snapshot.session,
          lastSeq: Math.max(snapshot.session.lastSeq, lastEvent.seq),
          updatedAt: Math.max(snapshot.session.updatedAt, lastEvent.timestamp),
        },
      }
    : snapshot;
}
