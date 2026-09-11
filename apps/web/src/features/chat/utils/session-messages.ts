import { isInternalAgentMessage } from "@pi-harness/agent-runtime/agent-message";
import {
  ApprovalDecision,
  ApprovalRequestKind,
  type HarnessEvent,
  HarnessEventType,
  isApprovalGranted,
  isInputRequestedData,
  isInputResolvedData,
  MessageDeltaKind,
  selectActiveSessionEvents,
} from "@pi-harness/agent-runtime/harness-event";
import {
  isHarnessUserMessage,
  RequestUserInputToolName,
  RunMode,
  UserInputRequestKind,
  UserInputResponseAction,
} from "@pi-harness/agent-runtime/user-input";
import { UpdatePlanToolName, UpdateTodosToolName } from "@pi-harness/agent-runtime/working-state";
import { isCommandPrefixRule } from "@pi-harness/policy/command-policy";
import { isPlainObject } from "es-toolkit";
import type {
  OptimisticSessionUserInput,
  Session,
  SessionSnapshotEventMetadata,
} from "../api/session-api";
import { TERMINAL_RUN_EVENTS } from "../constants/session-events";
import {
  type ChatAssistantMessage,
  type ChatContextCompactionMessage,
  ChatInputStatus,
  type ChatInputStatusMessage,
  type ChatMessage,
  type ChatMessageTool,
  ChatMessageType,
  type ChatPlanReviewMessage,
  ChatPlanReviewStatus,
  type ChatThread,
  type ChatToolGroupMessage,
  ChatToolState,
} from "../data/chat";
import {
  readRevertedSessionRunIds,
  summarizeSessionFileChangesByRun,
} from "./session-file-changes";
import { findPendingUserInput } from "./session-user-input";

const INTERACTION_TOOL_NAMES = new Set<string>([
  UpdatePlanToolName,
  UpdateTodosToolName,
  RequestUserInputToolName,
]);
const messagesByEventState = new WeakMap<
  readonly HarnessEvent[],
  WeakMap<ReadonlyMap<string, HarnessEvent>, readonly ChatMessage[]>
>();

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
            ...(harnessUserMessage?.mode === undefined ? {} : { mode: harnessUserMessage.mode }),
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
    if (INTERACTION_TOOL_NAMES.has(part.name)) return [];
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

type StreamingContent =
  | {
      content: string;
      kind: typeof MessageDeltaKind.TEXT | typeof MessageDeltaKind.THINKING;
    }
  | {
      argsText: string;
      kind: typeof MessageDeltaKind.TOOL_CALL;
      toolCallId: string;
      toolName: string;
    };

function readDelta(event: HarnessEvent): (StreamingContent & { contentIndex: number }) | null {
  if (
    !isPlainObject(event.data) ||
    typeof event.data.contentIndex !== "number" ||
    typeof event.data.delta !== "string"
  ) {
    return null;
  }
  if (event.data.kind === MessageDeltaKind.TOOL_CALL) {
    if (
      typeof event.data.toolCallId !== "string" ||
      typeof event.data.toolName !== "string" ||
      (INTERACTION_TOOL_NAMES.has(event.data.toolName) &&
        event.data.toolName !== RequestUserInputToolName)
    ) {
      return null;
    }
    return {
      argsText: event.data.delta,
      contentIndex: event.data.contentIndex,
      kind: event.data.kind,
      toolCallId: event.data.toolCallId,
      toolName: event.data.toolName,
    };
  }
  if (event.data.kind !== MessageDeltaKind.TEXT && event.data.kind !== MessageDeltaKind.THINKING) {
    return null;
  }
  return {
    content: event.data.delta,
    contentIndex: event.data.contentIndex,
    kind: event.data.kind,
  };
}

function readStreamingJsonString(argsText: string, key: string): string | null {
  const keyIndex = argsText.indexOf(`"${key}"`);
  if (keyIndex < 0) return null;
  const colonIndex = argsText.indexOf(":", keyIndex + key.length + 2);
  if (colonIndex < 0) return "";
  let index = colonIndex + 1;
  while (/\s/.test(argsText.charAt(index))) index += 1;
  if (argsText.charAt(index) !== '"') return "";
  index += 1;

  let value = "";
  while (index < argsText.length) {
    const character = argsText.charAt(index);
    index += 1;
    if (character === '"') return value;
    if (character !== "\\") {
      value += character;
      continue;
    }
    const escaped = argsText.charAt(index);
    if (!escaped) return value;
    index += 1;
    if (escaped === "u") {
      const codePoint = argsText.slice(index, index + 4);
      if (!/^[0-9a-f]{4}$/i.test(codePoint)) return value;
      value += String.fromCharCode(Number.parseInt(codePoint, 16));
      index += 4;
      continue;
    }
    value +=
      escaped === "n"
        ? "\n"
        : escaped === "r"
          ? "\r"
          : escaped === "t"
            ? "\t"
            : escaped === "b"
              ? "\b"
              : escaped === "f"
                ? "\f"
                : escaped;
  }
  return value;
}

function readStreamingPlanMarkdown(argsText: string): string | null {
  const markdown = readStreamingJsonString(argsText, "planMarkdown");
  if (markdown !== null) return markdown;
  return readStreamingJsonString(argsText, "kind") === UserInputRequestKind.PLAN_REVIEW ? "" : null;
}

function readFailureMessage(event: HarnessEvent): string {
  return isPlainObject(event.data) && typeof event.data.message === "string"
    ? event.data.message
    : "Agent 运行失败";
}

export function readToolResult(value: unknown): unknown {
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
    case "awaiting_approval":
      return "等待提升权限";
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
    if (
      message.turnId === runId &&
      message.type === ChatMessageType.PLAN_REVIEW &&
      message.status === ChatPlanReviewStatus.PENDING
    ) {
      message.status = ChatPlanReviewStatus.CLOSED;
    }
    if (
      message.turnId !== runId ||
      message.id === finalMessageId ||
      message.type === ChatMessageType.PLAN_REVIEW
    ) {
      continue;
    }
    message.isIntermediate = true;
    if (durationMs !== undefined) message.turnDurationMs = durationMs;
    if (message.type === ChatMessageType.REASONING) message.defaultExpanded = false;
  }
}

export function findActiveRunId(events: readonly HarnessEvent[]): string | null {
  let activeRunId: string | null = null;
  for (const event of events) {
    if (event.type === HarnessEventType.RUN_STARTED && event.runId) activeRunId = event.runId;
    if (event.type === HarnessEventType.MESSAGE_BRANCH_STARTED) activeRunId = null;
    if (TERMINAL_RUN_EVENTS.has(event.type) && event.runId === activeRunId) activeRunId = null;
  }
  return activeRunId;
}

/**
 * 将完成的jsonl数据转为页面渲染的消息
 * 通过遍历，将工具调用的中间状态数据合并为最终状态
 */
interface RunMessageProjection {
  activeRunId: string | null;
  events: readonly HarnessEvent[];
  messages: readonly ChatMessage[];
  streamPrefix: readonly HarnessEvent[];
  canShowStream: boolean;
}

const projectionsByFirstEvent = new WeakMap<HarnessEvent, RunMessageProjection>();

interface StableRunEventGroup {
  events: readonly HarnessEvent[];
  first: HarnessEvent;
  runId: string | null;
}

interface StableSessionProjection {
  activeGroup: StableRunEventGroup | null;
  activeRunId: string | null;
  messages: readonly ChatMessage[];
  messagesAfterActiveRun: readonly ChatMessage[];
  messagesBeforeActiveRun: readonly ChatMessage[];
}

const stableSessionProjections = new WeakMap<readonly HarnessEvent[], StableSessionProjection>();

function appendProjectedMessages(
  target: ChatMessage[],
  projection: RunMessageProjection,
  streamed: readonly ChatMessage[] = [],
): void {
  for (const message of projection.messages) {
    if (message.type !== ChatMessageType.LOADING) target.push(message);
  }
  for (const message of streamed) {
    if (message.type !== ChatMessageType.LOADING) target.push(message);
  }
  const loading = projection.messages.find((message) => message.type === ChatMessageType.LOADING);
  if (loading) target.push(loading);
}

function readRunMessageProjection(
  group: StableRunEventGroup,
  activeRunId: string | null,
  live: readonly HarnessEvent[],
): RunMessageProjection {
  const stable = group.events;
  const toolUpdates = live.filter((event) => event.type === HarnessEventType.TOOL_UPDATED);
  const baseEvents = toolUpdates.length
    ? [...stable, ...toolUpdates].sort((left, right) => left.seq - right.seq)
    : stable;
  const cachedProjection = projectionsByFirstEvent.get(group.first);
  if (
    cachedProjection &&
    cachedProjection.activeRunId === activeRunId &&
    cachedProjection.events.length === baseEvents.length &&
    baseEvents.every((event, index) => event === cachedProjection.events[index])
  ) {
    return cachedProjection;
  }

  const baseMessages = projectRunMessages(baseEvents, activeRunId);
  const runStart = stable.find((event) => event.type === HarnessEventType.RUN_STARTED);
  const assistantStart = stable.findLast(
    (event) =>
      event.type === HarnessEventType.MESSAGE_STARTED &&
      isPlainObject(event.data) &&
      event.data.role === "assistant",
  );
  const projection = {
    activeRunId,
    events: baseEvents,
    messages: baseMessages,
    streamPrefix: [runStart, assistantStart].filter(
      (event): event is HarnessEvent => event !== undefined,
    ),
    canShowStream:
      activeRunId !== null &&
      findPendingUserInput(stable) === null &&
      !baseMessages.some(
        (message) =>
          (message.type === ChatMessageType.TOOL && isToolActive(message.tool)) ||
          (message.type === ChatMessageType.TOOL_GROUP && message.tools.some(isToolActive)) ||
          (message.type === ChatMessageType.CONTEXT_COMPACTION && message.isActive),
      ),
  };
  projectionsByFirstEvent.set(group.first, projection);
  return projection;
}

function readStableSessionProjection(
  stableEvents: readonly HarnessEvent[],
): StableSessionProjection {
  const cached = stableSessionProjections.get(stableEvents);
  if (cached) return cached;

  const activeEvents = selectActiveSessionEvents(stableEvents);
  const activeRunId = findActiveRunId(activeEvents);
  const groupedEvents = new Map<string, HarnessEvent[]>();
  for (const event of activeEvents) {
    if (event.type === HarnessEventType.MESSAGE_BRANCH_STARTED) continue;
    const key = event.runId ?? event.id;
    const group = groupedEvents.get(key);
    if (group) group.push(event);
    else groupedEvents.set(key, [event]);
  }
  const groups = [...groupedEvents.values()].flatMap<StableRunEventGroup>((events) => {
    const first = events[0];
    return first ? [{ events, first, runId: first.runId ?? null }] : [];
  });
  const activeGroupIndex =
    activeRunId === null ? -1 : groups.findIndex((group) => group.runId === activeRunId);
  const messagesBeforeActiveRun: ChatMessage[] = [];
  const activeMessages: ChatMessage[] = [];
  const messagesAfterActiveRun: ChatMessage[] = [];
  groups.forEach((group, index) => {
    const groupActiveRunId = index === activeGroupIndex ? activeRunId : null;
    const target =
      activeGroupIndex < 0 || index < activeGroupIndex
        ? messagesBeforeActiveRun
        : index === activeGroupIndex
          ? activeMessages
          : messagesAfterActiveRun;
    appendProjectedMessages(target, readRunMessageProjection(group, groupActiveRunId, []));
  });
  const projection = {
    activeGroup: activeGroupIndex < 0 ? null : (groups[activeGroupIndex] ?? null),
    activeRunId,
    messages:
      activeGroupIndex < 0
        ? messagesBeforeActiveRun
        : [...messagesBeforeActiveRun, ...activeMessages, ...messagesAfterActiveRun],
    messagesAfterActiveRun,
    messagesBeforeActiveRun,
  };
  stableSessionProjections.set(stableEvents, projection);
  return projection;
}

export function sessionEventsToMessages({
  changedRunIds,
  stableEvents,
  transientByKey,
}: SessionSnapshotEventMetadata): readonly ChatMessage[] {
  const messagesByTransient = messagesByEventState.get(stableEvents);
  const cached = messagesByTransient?.get(transientByKey);
  if (cached) return cached;

  const stableProjection = readStableSessionProjection(stableEvents);
  const activeRunId = stableProjection.activeRunId;
  const activeGroup = stableProjection.activeGroup;
  const live: HarnessEvent[] = [];
  const shouldUpdateActiveRun =
    activeRunId !== null &&
    activeGroup !== null &&
    (changedRunIds.has(activeRunId) || transientByKey.size > 0);
  if (shouldUpdateActiveRun) {
    for (const event of transientByKey.values()) if (event.runId === activeRunId) live.push(event);
    live.sort((left, right) => left.seq - right.seq);
  }
  if (!activeGroup || live.length === 0) {
    const cache = messagesByTransient ?? new WeakMap();
    cache.set(transientByKey, stableProjection.messages);
    if (!messagesByTransient) messagesByEventState.set(stableEvents, cache);
    return stableProjection.messages;
  }

  const projection = readRunMessageProjection(activeGroup, activeRunId, live);
  const streamed =
    projection.canShowStream && live.some((event) => event.type === HarnessEventType.MESSAGE_DELTA)
      ? projectRunMessages([...projection.streamPrefix, ...live], activeRunId)
      : [];
  const messages = [...stableProjection.messagesBeforeActiveRun];
  appendProjectedMessages(messages, projection, streamed);
  messages.push(...stableProjection.messagesAfterActiveRun);

  const cache = messagesByTransient ?? new WeakMap();
  cache.set(transientByKey, messages);
  if (!messagesByTransient) messagesByEventState.set(stableEvents, cache);
  return messages;
}

export function optimisticUserInputToMessage({
  id,
  input,
  timestamp,
}: OptimisticSessionUserInput): ChatMessage {
  const attachments = input.attachments.map((attachment) => ({
    mimeType: attachment.mimeType,
    name: attachment.name,
    size: attachment.size,
    ...(attachment.mimeType.startsWith("image/")
      ? { src: `data:${attachment.mimeType};base64,${attachment.data}` }
      : {}),
  }));
  return {
    ...(attachments.length === 0 ? {} : { attachments }),
    content: input.prompt,
    id,
    ...(input.mode === undefined ? {} : { mode: input.mode }),
    timestamp,
    type: ChatMessageType.USER,
  };
}

function projectRunMessages(
  events: readonly HarnessEvent[],
  activeRunId: string | null,
): readonly ChatMessage[] {
  const messages: ChatMessage[] = [];
  const messagesByRunId = new Map<string, ChatMessage[]>();
  const fileChangesByRunId = summarizeSessionFileChangesByRun(events);
  const revertedRunIds = readRevertedSessionRunIds(events);
  const activeAssistantMessageIdByRunId = new Map<string, string>();
  const activeCompactionByRunId = new Map<string, ChatContextCompactionMessage>();
  const lastAssistantMessageByRunId = new Map<string, ChatAssistantMessage>();
  const inputStatusesByInputId = new Map<string, ChatInputStatusMessage>();
  const planRunIds = new Set<string>();
  const planReviewsByInputId = new Map<string, ChatPlanReviewMessage>();
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

  const placeTurnFooter = (event: HarnessEvent, message?: ChatAssistantMessage) => {
    if (!event.runId) return;
    const fileChanges = fileChangesByRunId.get(event.runId);
    const fileChangeSummary = fileChanges?.length
      ? {
          areFileChangesReverted: revertedRunIds.has(event.runId),
          fileChanges,
          sessionId: event.sessionId,
        }
      : {};
    if (message && messagesByRunId.get(event.runId)?.at(-1) === message) {
      Object.assign(message, fileChangeSummary);
      message.actions = "full";
      message.timestamp = event.timestamp;
      return;
    }
    pushMessage({
      ...fileChangeSummary,
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
      if (isPlainObject(event.data) && event.data.mode === RunMode.PLAN) {
        planRunIds.add(event.runId);
      }
      continue;
    }

    if (
      event.type === HarnessEventType.INPUT_REQUESTED &&
      event.runId &&
      planRunIds.has(event.runId) &&
      isInputRequestedData(event.data) &&
      event.data.kind === UserInputRequestKind.QUESTION
    ) {
      const message: ChatInputStatusMessage = {
        id: `input-status-${event.data.inputId}`,
        status: ChatInputStatus.WAITING,
        turnId: event.runId,
        type: ChatMessageType.INPUT_STATUS,
      };
      inputStatusesByInputId.set(event.data.inputId, message);
      pushMessage(message);
      continue;
    }

    if (
      event.type === HarnessEventType.INPUT_REQUESTED &&
      event.runId &&
      isInputRequestedData(event.data) &&
      event.data.kind === UserInputRequestKind.PLAN_REVIEW
    ) {
      const planMarkdown = event.data.planMarkdown?.trim();
      if (planMarkdown) {
        const message: ChatPlanReviewMessage = {
          id: `plan-review-${event.data.inputId}`,
          planMarkdown,
          status: ChatPlanReviewStatus.PENDING,
          turnId: event.runId,
          type: ChatMessageType.PLAN_REVIEW,
        };
        planReviewsByInputId.set(event.data.inputId, message);
        pushMessage(message);
      }
      continue;
    }

    if (event.type === HarnessEventType.INPUT_RESOLVED && isInputResolvedData(event.data)) {
      const inputStatus = inputStatusesByInputId.get(event.data.inputId);
      if (inputStatus) inputStatus.status = ChatInputStatus.ANSWERED;
      const message = planReviewsByInputId.get(event.data.inputId);
      if (message) {
        if (event.data.planMarkdown?.trim()) message.planMarkdown = event.data.planMarkdown;
        message.status =
          event.data.action === UserInputResponseAction.CONFIRM_PLAN
            ? ChatPlanReviewStatus.CONFIRMED
            : ChatPlanReviewStatus.REVISION_REQUESTED;
      }
      continue;
    }

    if (
      event.type === HarnessEventType.INPUT_EXPIRED &&
      isPlainObject(event.data) &&
      typeof event.data.inputId === "string"
    ) {
      const inputStatus = inputStatusesByInputId.get(event.data.inputId);
      if (inputStatus) inputStatus.status = ChatInputStatus.EXPIRED;
      const message = planReviewsByInputId.get(event.data.inputId);
      if (message) message.status = ChatPlanReviewStatus.CLOSED;
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
      if (INTERACTION_TOOL_NAMES.has(event.data.toolName)) continue;
      const existingTool = toolsByCallId.get(event.data.toolCallId);
      if (existingTool) {
        if (typeof event.data.displayName === "string")
          existingTool.displayName = event.data.displayName;
        existingTool.input = event.data.arguments;
        existingTool.state = ChatToolState.INPUT_AVAILABLE;
      } else {
        const tool: ChatMessageTool = {
          ...(typeof event.data.displayName === "string"
            ? { displayName: event.data.displayName }
            : {}),
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
        const preview =
          typeof event.data.preview === "string" && event.data.preview
            ? event.data.preview
            : readApprovalPreview(tool);
        const kind =
          event.data.kind === ApprovalRequestKind.HOST_EXECUTION
            ? ApprovalRequestKind.HOST_EXECUTION
            : undefined;
        tool.approval = {
          approvalId: event.data.approvalId,
          ...(event.data.allowSession === false ? { allowSession: false } : {}),
          ...(event.data.allowSimilar === true ? { allowSimilar: true } : {}),
          ...(isCommandPrefixRule(event.data.commandPrefix)
            ? { commandPrefix: event.data.commandPrefix }
            : {}),
          ...(kind === undefined ? {} : { kind }),
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
        if (isApprovalGranted(event.data.decision)) {
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
        if (event.data.resultTruncated === true)
          tool.resultSource = { sessionId: event.sessionId, seq: event.seq };
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
        contentByIndex.set(
          delta.contentIndex,
          delta.kind === MessageDeltaKind.TOOL_CALL
            ? {
                argsText:
                  current?.kind === MessageDeltaKind.TOOL_CALL
                    ? current.argsText + delta.argsText
                    : delta.argsText,
                kind: delta.kind,
                toolCallId: delta.toolCallId,
                toolName: delta.toolName,
              }
            : {
                content:
                  current?.kind === delta.kind ? current.content + delta.content : delta.content,
                kind: delta.kind,
              },
        );
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
        const contentByIndex = streamingContentByRunId.get(event.runId);
        const requestInputContent = new Map(
          [...(contentByIndex?.entries() ?? [])].filter(
            ([, part]) =>
              part.kind === MessageDeltaKind.TOOL_CALL &&
              part.toolName === RequestUserInputToolName,
          ),
        );
        if (requestInputContent.size > 0) {
          streamingContentByRunId.set(event.runId, requestInputContent);
        } else {
          streamingContentByRunId.delete(event.runId);
        }
      }
      continue;
    }

    if (event.type === HarnessEventType.RUN_COMPLETED && event.runId) {
      const message = lastAssistantMessageByRunId.get(event.runId);
      const startedAt = runStartedAtById.get(event.runId);
      markRunIntermediateMessages(
        messagesByRunId.get(event.runId) ?? [],
        event.runId,
        startedAt === undefined ? undefined : Math.max(0, event.timestamp - startedAt),
        message?.id,
      );
      placeTurnFooter(event, message);
    }

    if (event.type === HarnessEventType.RUN_FAILED && event.runId) {
      const startedAt = runStartedAtById.get(event.runId);
      markRunIntermediateMessages(
        messagesByRunId.get(event.runId) ?? [],
        event.runId,
        startedAt === undefined ? undefined : Math.max(0, event.timestamp - startedAt),
      );
      pushMessage({
        content: readFailureMessage(event),
        id: `failed-${event.id}`,
        type: ChatMessageType.ERROR,
        turnId: event.runId,
      });
      placeTurnFooter(event, lastAssistantMessageByRunId.get(event.runId));
      streamingContentByRunId.delete(event.runId);
    }

    if (event.type === HarnessEventType.RUN_ABORTED && event.runId) {
      const message = lastAssistantMessageByRunId.get(event.runId);
      placeTurnFooter(event, message);
      streamingContentByRunId.delete(event.runId);
    }
  }

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
    findPendingUserInput(events) === null &&
    !hasActiveTool &&
    !activeCompactionByRunId.has(activeRunId)
  ) {
    const messageId =
      activeAssistantMessageIdByRunId.get(activeRunId) ?? `streaming-${activeRunId}`;
    const content = [...(streamingContentByRunId.get(activeRunId)?.entries() ?? [])].sort(
      ([left], [right]) => left - right,
    );
    if (content.length > 0) {
      const lastContentIndex = content.at(-1)?.[0];
      const streamingTools = content.flatMap<ChatMessageTool>(([, part]) => {
        if (part.kind !== MessageDeltaKind.TOOL_CALL || INTERACTION_TOOL_NAMES.has(part.toolName)) {
          return [];
        }
        let input: unknown;
        try {
          input = JSON.parse(part.argsText);
        } catch {
          input = undefined;
        }
        return [
          {
            argsText: part.argsText,
            ...(input === undefined ? {} : { input }),
            state: ChatToolState.INPUT_AVAILABLE,
            toolCallId: part.toolCallId,
            toolName: part.toolName,
          },
        ];
      });
      let hasAddedTools = false;
      for (const [contentIndex, part] of content) {
        if (part.kind === MessageDeltaKind.TOOL_CALL) {
          if (part.toolName === RequestUserInputToolName) {
            const planMarkdown = readStreamingPlanMarkdown(part.argsText);
            if (planMarkdown !== null) {
              pushMessage({
                id: `plan-review-streaming-${part.toolCallId}`,
                isStreaming: true,
                planMarkdown,
                status: ChatPlanReviewStatus.PENDING,
                turnId: activeRunId,
                type: ChatMessageType.PLAN_REVIEW,
              });
            }
            continue;
          }
          if (hasAddedTools || streamingTools.length === 0) continue;
          hasAddedTools = true;
          const firstTool = streamingTools[0];
          pushMessage(
            streamingTools.length === 1 && firstTool
              ? {
                  id: `tool-${firstTool.toolCallId}`,
                  tool: firstTool,
                  turnId: activeRunId,
                  type: ChatMessageType.TOOL,
                }
              : {
                  active: true,
                  id: `${messageId}-tools`,
                  label: `正在调用 ${streamingTools.length} 个工具`,
                  tools: streamingTools,
                  turnId: activeRunId,
                  type: ChatMessageType.TOOL_GROUP,
                },
          );
          continue;
        }
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

  if (activeRunId) {
    pushMessage({
      id: `loading-${activeRunId}`,
      label: "正在处理…",
      turnId: activeRunId,
      type: ChatMessageType.LOADING,
    });
    for (const message of messagesByRunId.get(activeRunId) ?? []) {
      if (message.type === ChatMessageType.REASONING) message.isActive = true;
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
