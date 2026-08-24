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
import { updateSnapshotWithEvents } from "../utils/session-messages";

const RECONNECT_DELAY_MS = 2_000;
const EVENT_TYPES = Object.values(HarnessEventType);

export function useSessionEvents(sessionId: string, initialSeq: number): void {
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
    let frame: number | undefined;
    let isClosed = false;
    const pending = new Map<number, HarnessEvent>();

    const flush = () => {
      frame = undefined;
      const events = [...pending.values()].sort((left, right) => left.seq - right.seq);
      pending.clear();
      if (events.length === 0) return;
      lastSeqRef.current = Math.max(lastSeqRef.current, events.at(-1)?.seq ?? 0);
      queryClient.setQueryData<SessionSnapshot>(sessionQueryKeys.detail(sessionId), (snapshot) =>
        snapshot ? updateSnapshotWithEvents(snapshot, events) : snapshot,
      );
      queryClient.setQueryData<readonly Session[]>(sessionQueryKeys.list(), (sessions) =>
        sessions?.map((session) =>
          session.id === sessionId
            ? {
                ...session,
                lastSeq: lastSeqRef.current,
                updatedAt: Math.max(session.updatedAt, events.at(-1)?.timestamp ?? 0),
              }
            : session,
        ),
      );
    };

    const receive = (message: MessageEvent<string>) => {
      try {
        const event = parseSessionEvent(message.data);
        if (event.sessionId !== sessionId || event.seq <= lastSeqRef.current) return;
        pending.set(event.seq, event);
        if (frame === undefined) frame = window.requestAnimationFrame(flush);
      } catch {
        void queryClient.invalidateQueries({ queryKey: sessionQueryKeys.detail(sessionId) });
      }
    };

    const connect = () => {
      if (isClosed) return;
      source = new EventSource(sessionEventsUrl(sessionId, lastSeqRef.current));
      for (const type of EVENT_TYPES) source.addEventListener(type, receive as EventListener);
      source.onerror = () => {
        source?.close();
        if (!isClosed) reconnectTimer = window.setTimeout(connect, RECONNECT_DELAY_MS);
      };
    };

    connect();
    return () => {
      isClosed = true;
      source?.close();
      if (reconnectTimer !== undefined) window.clearTimeout(reconnectTimer);
      if (frame !== undefined) window.cancelAnimationFrame(frame);
    };
  }, [queryClient, sessionId]);
}
