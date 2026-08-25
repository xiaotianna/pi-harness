import type { ChatStatus } from "@agile-avocation/ui-pro";
import { isInternalAgentMessage } from "@pi-harness/agent-runtime/agent-message";
import {
  ApprovalDecision,
  type HarnessEvent,
  HarnessEventType,
  MessageDeltaKind,
} from "@pi-harness/agent-runtime/harness-event";
import { isPlainObject } from "es-toolkit";
import type { Session, SessionSnapshot } from "../api/session-api";
import {
  type ChatAssistantMessage,
  type ChatMessage,
  type ChatMessageTool,
  ChatMessageType,
  type ChatThread,
} from "../data/chat";

const TERMINAL_RUN_EVENTS = new Set<HarnessEvent["type"]>([
  HarnessEventType.RUN_ABORTED,
  HarnessEventType.RUN_COMPLETED,
  HarnessEventType.RUN_FAILED,
]);

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

function readCompletedMessage(event: HarnessEvent): ChatMessage | null {
  if (!isPlainObject(event.data) || isInternalAgentMessage(event.data)) return null;
  const content = readContentText(event.data.content);
  if (!content) return null;
  if (event.data.role === "user") {
    return { content, id: event.id, type: ChatMessageType.USER };
  }
  if (event.data.role === "assistant") {
    return { content, id: event.id, type: ChatMessageType.ASSISTANT };
  }
  return null;
}

function readDelta(event: HarnessEvent): string {
  return isPlainObject(event.data) &&
    event.data.kind === MessageDeltaKind.TEXT &&
    typeof event.data.delta === "string"
    ? event.data.delta
    : "";
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

function readToolError(value: unknown): string {
  const result = readToolResult(value);
  return typeof result === "string" && result ? result : "工具执行失败";
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

export function findActiveRunId(events: readonly HarnessEvent[]): string | null {
  let activeRunId: string | null = null;
  for (const event of events) {
    if (event.type === HarnessEventType.RUN_STARTED && event.runId) activeRunId = event.runId;
    if (TERMINAL_RUN_EVENTS.has(event.type) && event.runId === activeRunId) activeRunId = null;
  }
  return activeRunId;
}

export function readSessionStatus(events: readonly HarnessEvent[]): ChatStatus {
  return findActiveRunId(events) === null ? "ready" : "streaming";
}

export function sessionEventsToMessages(events: readonly HarnessEvent[]): readonly ChatMessage[] {
  const messages: ChatMessage[] = [];
  const lastAssistantMessageByRunId = new Map<string, ChatAssistantMessage>();
  const streamingText = new Map<string, string>();
  const toolsByCallId = new Map<string, ChatMessageTool>();

  for (const event of events) {
    if (
      event.type === HarnessEventType.TOOL_STARTED &&
      isPlainObject(event.data) &&
      typeof event.data.toolCallId === "string" &&
      typeof event.data.toolName === "string"
    ) {
      const tool: ChatMessageTool = {
        input: event.data.arguments,
        state: "input-available",
        toolCallId: event.data.toolCallId,
        toolName: event.data.toolName,
      };
      toolsByCallId.set(event.data.toolCallId, tool);
      messages.push({ id: `tool-${event.data.toolCallId}`, tool, type: ChatMessageType.TOOL });
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
        tool.state = "requires-action";
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
        delete tool.approval;
        if (event.data.decision === ApprovalDecision.APPROVED) {
          tool.state = "input-available";
        } else {
          tool.errorText =
            event.data.decision === ApprovalDecision.EXPIRED
              ? "工具审批已超时"
              : "用户拒绝了工具审批";
          tool.state = "output-error";
        }
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
        delete tool.approval;
        if (event.type === HarnessEventType.TOOL_FAILED) {
          tool.errorText = readToolError(event.data.result);
          tool.state = "output-error";
        } else {
          tool.output = readToolResult(event.data.result);
          tool.state = "output-available";
        }
      }
      continue;
    }

    if (event.type === HarnessEventType.MESSAGE_DELTA && event.runId) {
      const delta = readDelta(event);
      if (delta) streamingText.set(event.runId, (streamingText.get(event.runId) ?? "") + delta);
      continue;
    }

    if (event.type === HarnessEventType.MESSAGE_COMPLETED) {
      const message = readCompletedMessage(event);
      if (message) messages.push(message);
      if (event.runId && message?.type === ChatMessageType.ASSISTANT) {
        lastAssistantMessageByRunId.set(event.runId, message);
        streamingText.delete(event.runId);
      }
      continue;
    }

    if (event.type === HarnessEventType.RUN_COMPLETED && event.runId) {
      const message = lastAssistantMessageByRunId.get(event.runId);
      if (message) message.actions = "full";
    }

    if (event.type === HarnessEventType.RUN_FAILED && event.runId) {
      messages.push({
        content: readFailureMessage(event),
        id: `failed-${event.id}`,
        type: ChatMessageType.ERROR,
      });
      streamingText.delete(event.runId);
    }

    if (event.type === HarnessEventType.RUN_ABORTED && event.runId) {
      streamingText.delete(event.runId);
    }
  }

  const activeRunId = findActiveRunId(events);
  const isAwaitingApproval = messages.some(
    (message) => message.type === ChatMessageType.TOOL && message.tool.state === "requires-action",
  );
  if (activeRunId && !isAwaitingApproval) {
    const content = streamingText.get(activeRunId);
    messages.push(
      content
        ? { content, id: `streaming-${activeRunId}`, type: ChatMessageType.ASSISTANT }
        : { id: `loading-${activeRunId}`, label: "正在思考…", type: ChatMessageType.LOADING },
    );
  }

  return messages;
}

export function sessionToChatThread(session: Session, preview = ""): ChatThread {
  return {
    id: session.id,
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
  for (const event of events) {
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
