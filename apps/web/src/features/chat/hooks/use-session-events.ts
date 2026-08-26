import {
  type HarnessEvent,
  HarnessEventType,
  MessageDeltaKind,
} from "@pi-harness/agent-runtime/harness-event";
import { useQueryClient } from "@tanstack/react-query";
import { isPlainObject } from "es-toolkit";
import { useReducedMotion } from "motion/react";
import { useEffect, useRef } from "react";
import {
  parseSessionEvent,
  type Session,
  type SessionSnapshot,
  sessionEventsUrl,
} from "../api/session-api";
import { sessionQueryKeys } from "../api/session-queries";
import { updateSnapshotWithEvents } from "../utils/session-messages";
import { getTypewriterStep } from "./use-typewriter-text";

const RECONNECT_DELAY_MS = 2_000;
const EVENT_TYPES = Object.values(HarnessEventType);

type PendingEvent = {
  event: HarnessEvent;
  visibleDeltaCharacters?: readonly string[];
};

function readVisibleDeltaCharacters(event: HarnessEvent): readonly string[] | undefined {
  if (
    event.type !== HarnessEventType.MESSAGE_DELTA ||
    !isPlainObject(event.data) ||
    (event.data.kind !== MessageDeltaKind.TEXT && event.data.kind !== MessageDeltaKind.THINKING) ||
    typeof event.data.delta !== "string"
  ) {
    return undefined;
  }
  return Array.from(event.data.delta);
}

export function useSessionEvents(sessionId: string, initialSeq: number): void {
  const queryClient = useQueryClient();
  const shouldReduceMotion = useReducedMotion();
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
    let queuedCharacterCount = 0;
    let urgentSeq: number | undefined;
    let activeDelta:
      | {
          characters: readonly string[];
          event: HarnessEvent;
          visibleDelta: string;
          visibleLength: number;
        }
      | undefined;
    const pending = new Map<number, PendingEvent>();

    const commit = (events: readonly HarnessEvent[], shouldAdvanceSequence = true) => {
      if (events.length === 0) return;
      if (shouldAdvanceSequence) {
        lastSeqRef.current = Math.max(lastSeqRef.current, events.at(-1)?.seq ?? 0);
      }
      queryClient.setQueryData<SessionSnapshot>(sessionQueryKeys.detail(sessionId), (snapshot) => {
        if (!snapshot) return snapshot;
        const updated = updateSnapshotWithEvents(snapshot, events);
        return shouldAdvanceSequence
          ? updated
          : { ...updated, session: { ...updated.session, lastSeq: snapshot.session.lastSeq } };
      });
      if (!shouldAdvanceSequence) return;
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

    const schedule = () => {
      if (frame === undefined) frame = window.requestAnimationFrame(flush);
    };

    function flush() {
      frame = undefined;
      if (urgentSeq !== undefined) {
        const throughSeq = urgentSeq;
        const events: HarnessEvent[] = [];
        if (activeDelta && activeDelta.event.seq <= throughSeq) {
          queuedCharacterCount -= activeDelta.characters.length - activeDelta.visibleLength;
          events.push(activeDelta.event);
          activeDelta = undefined;
        }
        for (const item of [...pending.values()]
          .filter(({ event }) => event.seq <= throughSeq)
          .sort((left, right) => left.event.seq - right.event.seq)) {
          pending.delete(item.event.seq);
          queuedCharacterCount -= item.visibleDeltaCharacters?.length ?? 0;
          events.push(item.event);
        }
        urgentSeq = undefined;
        commit(events);
        schedule();
        return;
      }

      if (activeDelta) {
        if (!isPlainObject(activeDelta.event.data)) {
          activeDelta = undefined;
          schedule();
          return;
        }
        const step = shouldReduceMotion
          ? activeDelta.characters.length - activeDelta.visibleLength
          : Math.min(
              activeDelta.characters.length - activeDelta.visibleLength,
              getTypewriterStep(queuedCharacterCount),
            );
        const nextLength = activeDelta.visibleLength + step;
        activeDelta.visibleDelta += activeDelta.characters
          .slice(activeDelta.visibleLength, nextLength)
          .join("");
        activeDelta.visibleLength = nextLength;
        queuedCharacterCount -= step;
        const isComplete = nextLength === activeDelta.characters.length;
        commit(
          [
            {
              ...activeDelta.event,
              data: { ...activeDelta.event.data, delta: activeDelta.visibleDelta },
            },
          ],
          isComplete,
        );
        if (isComplete) activeDelta = undefined;
        schedule();
        return;
      }

      const next = [...pending.values()].sort((left, right) => left.event.seq - right.event.seq)[0];
      if (!next) return;
      pending.delete(next.event.seq);
      if (next.visibleDeltaCharacters && next.visibleDeltaCharacters.length > 0) {
        activeDelta = {
          characters: next.visibleDeltaCharacters,
          event: next.event,
          visibleDelta: "",
          visibleLength: 0,
        };
      } else {
        commit([next.event]);
      }
      schedule();
    }

    const receive = (message: MessageEvent<string>) => {
      try {
        const event = parseSessionEvent(message.data);
        if (event.sessionId !== sessionId || event.seq <= lastSeqRef.current) return;
        const visibleDeltaCharacters = readVisibleDeltaCharacters(event);
        const previous = pending.get(event.seq);
        queuedCharacterCount -= previous?.visibleDeltaCharacters?.length ?? 0;
        queuedCharacterCount += visibleDeltaCharacters?.length ?? 0;
        pending.set(event.seq, {
          event,
          ...(visibleDeltaCharacters === undefined ? {} : { visibleDeltaCharacters }),
        });
        if (event.type === HarnessEventType.APPROVAL_REQUESTED) urgentSeq = event.seq;
        schedule();
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
  }, [queryClient, sessionId, shouldReduceMotion]);
}
