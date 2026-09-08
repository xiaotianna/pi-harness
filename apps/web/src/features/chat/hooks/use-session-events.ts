import { type HarnessEvent, HarnessEventType } from "@pi-harness/agent-runtime/harness-event";
import { isHarnessUserMessage, type QueuedRunInput } from "@pi-harness/agent-runtime/user-input";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import {
  parseSessionEvent,
  type Session,
  type SessionSnapshot,
  sessionEventsUrl,
} from "../api/session-api";
import { sessionQueryKeys } from "../api/session-queries";
import { useChatSidebarStore } from "../state/chat-sidebar-store";
import { updateSnapshotWithEvents } from "../utils/session-messages";

const RECONNECT_DELAY_MS = 2_000;
const STREAM_FLUSH_INTERVAL_MS = 100;
const STALE_CONNECTION_TIMEOUT_MS = 45_000;
const EVENT_TYPES = Object.values(HarnessEventType);

export function useSessionEvents(sessionId: string, initialSeq: number, isRead: boolean): void {
  const queryClient = useQueryClient();
  const lastSeqRef = useRef(initialSeq);
  const sessionIdRef = useRef(sessionId);

  useEffect(() => {
    if (sessionIdRef.current !== sessionId) {
      sessionIdRef.current = sessionId;
      lastSeqRef.current = initialSeq;
      return;
    }
    lastSeqRef.current = Math.max(lastSeqRef.current, initialSeq);
  }, [initialSeq, sessionId]);

  useEffect(() => {
    let source: EventSource | null = null;
    let reconnectTimer: number | undefined;
    let staleConnectionTimer: number | undefined;
    let flushTimer: number | undefined;
    let pendingEvents: HarnessEvent[] = [];
    let isClosed = false;

    const clearStaleConnectionTimer = () => {
      if (staleConnectionTimer === undefined) return;
      window.clearTimeout(staleConnectionTimer);
      staleConnectionTimer = undefined;
    };

    const reconnect = () => {
      source?.close();
      source = null;
      clearStaleConnectionTimer();
      if (isClosed || reconnectTimer !== undefined) return;
      reconnectTimer = window.setTimeout(() => {
        reconnectTimer = undefined;
        connect();
      }, RECONNECT_DELAY_MS);
    };

    const markConnectionAlive = () => {
      clearStaleConnectionTimer();
      staleConnectionTimer = window.setTimeout(reconnect, STALE_CONNECTION_TIMEOUT_MS);
    };

    const commit = (events: readonly HarnessEvent[]) => {
      if (events.length === 0) return;
      const runStateEvent = events.findLast(
        (event) =>
          event.type === HarnessEventType.RUN_STARTED ||
          event.type === HarnessEventType.RUN_COMPLETED ||
          event.type === HarnessEventType.RUN_FAILED ||
          event.type === HarnessEventType.RUN_ABORTED,
      );
      if (runStateEvent?.type === HarnessEventType.RUN_COMPLETED && !isRead) {
        useChatSidebarStore.getState().markSessionCompleted(sessionId);
      }
      lastSeqRef.current = Math.max(lastSeqRef.current, events.at(-1)?.seq ?? 0);
      queryClient.setQueryData<SessionSnapshot>(sessionQueryKeys.detail(sessionId), (snapshot) => {
        if (!snapshot) return snapshot;
        return updateSnapshotWithEvents(snapshot, events);
      });
      queryClient.setQueryData<SessionSnapshot>(sessionQueryKeys.trace(sessionId), (snapshot) => {
        if (!snapshot) return snapshot;
        return updateSnapshotWithEvents(snapshot, events);
      });
      queryClient.setQueryData<readonly Session[]>(sessionQueryKeys.list(), (sessions) =>
        sessions?.map((session) =>
          session.id === sessionId
            ? {
                ...session,
                ...(runStateEvent === undefined
                  ? {}
                  : { isRunning: runStateEvent.type === HarnessEventType.RUN_STARTED }),
                lastSeq: lastSeqRef.current,
                updatedAt: Math.max(session.updatedAt, events.at(-1)?.timestamp ?? 0),
              }
            : session,
        ),
      );
      for (const event of events) {
        if (
          event.type !== HarnessEventType.MESSAGE_STARTED ||
          event.runId === undefined ||
          !isHarnessUserMessage(event.data) ||
          event.data.queuedInputId === undefined
        ) {
          continue;
        }
        const queuedInputId = event.data.queuedInputId;
        queryClient.setQueryData<readonly QueuedRunInput[]>(
          sessionQueryKeys.queuedInputs(sessionId, event.runId),
          (items) => items?.filter((item) => item.id !== queuedInputId),
        );
      }
    };

    const invalidateSnapshots = () => {
      void queryClient.invalidateQueries({ queryKey: sessionQueryKeys.detail(sessionId) });
      void queryClient.invalidateQueries({ queryKey: sessionQueryKeys.trace(sessionId) });
    };

    const flush = () => {
      if (flushTimer !== undefined) window.clearTimeout(flushTimer);
      flushTimer = undefined;
      const events = pendingEvents;
      pendingEvents = [];
      try {
        commit(events);
      } catch {
        invalidateSnapshots();
      }
    };

    const receive = (message: MessageEvent<string>) => {
      if (isClosed) return;
      markConnectionAlive();
      try {
        const event = parseSessionEvent(message.data);
        const lastReceivedSeq = Math.max(lastSeqRef.current, pendingEvents.at(-1)?.seq ?? 0);
        if (event.sessionId !== sessionId || event.seq <= lastReceivedSeq) return;
        pendingEvents.push(event);
        if (
          event.type === HarnessEventType.MESSAGE_DELTA ||
          event.type === HarnessEventType.TOOL_UPDATED
        ) {
          flushTimer ??= window.setTimeout(flush, STREAM_FLUSH_INTERVAL_MS);
        } else {
          // 状态事件与此前的增量一起提交，保持审批、完成和中止即时且有序。
          flush();
        }
      } catch {
        flush();
        invalidateSnapshots();
      }
    };

    const connect = () => {
      if (isClosed) return;
      const nextSource = new EventSource(sessionEventsUrl(sessionId, lastSeqRef.current));
      source = nextSource;
      for (const type of EVENT_TYPES) nextSource.addEventListener(type, receive as EventListener);
      nextSource.onmessage = markConnectionAlive;
      nextSource.onopen = markConnectionAlive;
      nextSource.onerror = () => {
        if (source === nextSource) reconnect();
      };
    };

    connect();
    return () => {
      isClosed = true;
      source?.close();
      if (reconnectTimer !== undefined) window.clearTimeout(reconnectTimer);
      clearStaleConnectionTimer();
      flush();
    };
  }, [isRead, queryClient, sessionId]);
}
