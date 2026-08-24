import type { ChatStatus } from "@agile-avocation/ui-pro";
import { isInternalAgentMessage } from "@pi-harness/agent-runtime/agent-message";
import {
  type HarnessEvent,
  HarnessEventType,
  MessageDeltaKind,
} from "@pi-harness/agent-runtime/harness-event";
import { isPlainObject } from "es-toolkit";
import type { Session, SessionSnapshot } from "../api/session-api";
import {
  type ChatAssistantMessage,
  type ChatMessage,
  ChatMessageType,
  type ChatThread,
  type ChatWorkspace,
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

  for (const event of events) {
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
  if (activeRunId) {
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

export function sessionsToWorkspaces(sessions: readonly Session[]): readonly ChatWorkspace[] {
  return [...new Map(sessions.map((session) => [session.workspaceId, session])).values()].map(
    (session) => ({
      createdAt: new Date(session.createdAt).toISOString(),
      id: session.workspaceId,
      name: session.workspaceRoot.split("/").filter(Boolean).at(-1) ?? session.workspaceRoot,
      path: session.workspaceRoot,
    }),
  );
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
