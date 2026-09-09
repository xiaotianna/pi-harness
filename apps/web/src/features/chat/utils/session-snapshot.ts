import {
  type HarnessEvent,
  HarnessEventType,
  isInputRequestedData,
  MessageDeltaKind,
} from "@pi-harness/agent-runtime/harness-event";
import {
  RequestUserInputToolName,
  UserInputRequestKind,
} from "@pi-harness/agent-runtime/user-input";
import { isPlainObject } from "es-toolkit";
import type { SessionSnapshot, SessionSnapshotEventMetadata } from "../api/session-api";
import { TERMINAL_RUN_EVENTS } from "../constants/session-events";

const metadataBySnapshot = new WeakMap<SessionSnapshot, SessionSnapshotEventMetadata>();
const mergedEventsByMetadata = new WeakMap<SessionSnapshotEventMetadata, readonly HarnessEvent[]>();

export function selectSessionEventMetadata(
  snapshot: SessionSnapshot,
): SessionSnapshotEventMetadata {
  if (snapshot.eventMetadata) return snapshot.eventMetadata;
  const cached = metadataBySnapshot.get(snapshot);
  if (cached) return cached;

  const stableEvents: HarnessEvent[] = [];
  const transientByKey = new Map<string, HarnessEvent>();
  const changedRunIds = new Set<string>();
  for (const event of snapshot.events) {
    if (isTransient(event)) {
      transientByKey.set(transientKey(event), event);
      if (event.runId) changedRunIds.add(event.runId);
    } else {
      stableEvents.push(event);
    }
  }
  const metadata = { changedRunIds, stableEvents, transientByKey };
  metadataBySnapshot.set(snapshot, metadata);
  return metadata;
}

export function selectSessionStateEvents(snapshot: SessionSnapshot): readonly HarnessEvent[] {
  return selectSessionEventMetadata(snapshot).stableEvents;
}

/** Materialize the ordered event view only for consumers such as Trace that need transient events. */
export function selectSessionEvents(snapshot: SessionSnapshot): readonly HarnessEvent[] {
  const metadata = selectSessionEventMetadata(snapshot);
  if (metadata.transientByKey.size === 0) return metadata.stableEvents;
  const cached = mergedEventsByMetadata.get(metadata);
  if (cached) return cached;

  const live = [...metadata.transientByKey.values()].sort((left, right) => left.seq - right.seq);
  const events: HarnessEvent[] = [];
  let liveIndex = 0;
  for (const event of metadata.stableEvents) {
    while (live[liveIndex] && (live[liveIndex]?.seq ?? Infinity) < event.seq) {
      const item = live[liveIndex++];
      if (item) events.push(item);
    }
    events.push(event);
  }
  for (; liveIndex < live.length; liveIndex++) {
    const event = live[liveIndex];
    if (event) events.push(event);
  }
  mergedEventsByMetadata.set(metadata, events);
  return events;
}

function isTransient(event: HarnessEvent): boolean {
  return (
    event.type === HarnessEventType.MESSAGE_DELTA || event.type === HarnessEventType.TOOL_UPDATED
  );
}

function transientKey(event: HarnessEvent): string {
  const data = isPlainObject(event.data) ? event.data : {};
  return event.type === HarnessEventType.MESSAGE_DELTA
    ? `${event.runId}:message:${data.contentIndex}:${data.kind}:${data.toolCallId ?? ""}`
    : `${event.runId}:tool:${data.toolCallId}`;
}

/** Cache contains one accumulated delta per content block, never a token log. */
export function updateSnapshotWithEvents(
  snapshot: SessionSnapshot,
  incoming: readonly HarnessEvent[],
): SessionSnapshot {
  let lastAcceptedSeq = snapshot.session.lastSeq;
  const accepted = [...incoming]
    .sort((left, right) => left.seq - right.seq)
    .filter((event) => {
      if (event.sessionId !== snapshot.session.id || event.seq <= lastAcceptedSeq) return false;
      lastAcceptedSeq = event.seq;
      return true;
    });
  if (accepted.length === 0) return snapshot;
  const current = selectSessionEventMetadata(snapshot);
  const appendedStable: HarnessEvent[] = [];
  const transientByKey = new Map(current.transientByKey);
  const changedRunIds = new Set<string>();
  const clearTransient = (event: HarnessEvent) => {
    const data = isPlainObject(event.data) ? event.data : {};
    const isTerminal =
      TERMINAL_RUN_EVENTS.has(event.type) || event.type === HarnessEventType.MESSAGE_BRANCH_STARTED;
    const isAssistantEnd =
      event.type === HarnessEventType.MESSAGE_COMPLETED && data.role === "assistant";
    const isToolEnd =
      event.type === HarnessEventType.TOOL_COMPLETED || event.type === HarnessEventType.TOOL_FAILED;
    const isInputReady =
      event.type === HarnessEventType.INPUT_REQUESTED &&
      isInputRequestedData(data) &&
      data.kind === UserInputRequestKind.PLAN_REVIEW;
    for (const [key, currentEvent] of transientByKey) {
      if (event.type === HarnessEventType.MESSAGE_BRANCH_STARTED) {
        if (currentEvent.runId) changedRunIds.add(currentEvent.runId);
        transientByKey.delete(key);
        continue;
      }
      if (currentEvent.runId !== event.runId || !isPlainObject(currentEvent.data)) continue;
      const isInputDelta =
        currentEvent.data.kind === MessageDeltaKind.TOOL_CALL &&
        currentEvent.data.toolName === RequestUserInputToolName;
      if (
        isTerminal ||
        (isAssistantEnd && currentEvent.type === HarnessEventType.MESSAGE_DELTA && !isInputDelta) ||
        (isToolEnd &&
          currentEvent.type === HarnessEventType.TOOL_UPDATED &&
          currentEvent.data.toolCallId === data.toolCallId) ||
        (isInputReady && isInputDelta)
      )
        transientByKey.delete(key);
    }
  };
  for (const event of accepted) {
    if (event.runId) changedRunIds.add(event.runId);
    if (!isTransient(event)) {
      appendedStable.push(event);
      clearTransient(event);
      continue;
    }
    const key = transientKey(event);
    const previous = transientByKey.get(key);
    if (
      event.type === HarnessEventType.MESSAGE_DELTA &&
      previous &&
      isPlainObject(previous.data) &&
      isPlainObject(event.data) &&
      typeof previous.data.delta === "string" &&
      typeof event.data.delta === "string"
    ) {
      transientByKey.set(key, {
        ...event,
        data: { ...event.data, delta: previous.data.delta + event.data.delta },
      });
    } else transientByKey.set(key, event);
  }
  const stableEvents =
    appendedStable.length === 0
      ? current.stableEvents
      : [...current.stableEvents, ...appendedStable];
  const eventMetadata = { changedRunIds, stableEvents, transientByKey };
  const last = accepted.at(-1);
  return {
    eventMetadata,
    // Keep the public event array stable during token-only batches. Transient events live in
    // eventMetadata and are materialized only for consumers that explicitly need them.
    events: stableEvents,
    session: {
      ...snapshot.session,
      lastSeq: last?.seq ?? snapshot.session.lastSeq,
      updatedAt: Math.max(snapshot.session.updatedAt, last?.timestamp ?? 0),
    },
  };
}
