import { type HarnessEvent, HarnessEventType } from "@pi-harness/agent-runtime/harness-event";
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
    };

    const receive = (message: MessageEvent<string>) => {
      markConnectionAlive();
      try {
        const event = parseSessionEvent(message.data);
        if (event.sessionId !== sessionId || event.seq <= lastSeqRef.current) return;
        commit([event]);
      } catch {
        void queryClient.invalidateQueries({ queryKey: sessionQueryKeys.detail(sessionId) });
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
    };
  }, [isRead, queryClient, sessionId]);
}
