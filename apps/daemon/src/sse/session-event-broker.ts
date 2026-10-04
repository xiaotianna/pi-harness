import { type HarnessEvent, HarnessEventType, type SessionId } from "@pi-harness/agent-runtime";

export type SessionEventSubscriber = (event: HarnessEvent) => void;

const MAX_REPLAY_EVENTS = 2_048;
const REPLAYABLE_EVENT_TYPES = new Set<HarnessEvent["type"]>([
  HarnessEventType.MESSAGE_DELTA,
  HarnessEventType.TOOL_UPDATED,
  HarnessEventType.SUBAGENT_MESSAGE_DELTA,
  HarnessEventType.SUBAGENT_TOOL_UPDATED,
  HarnessEventType.COMMAND_UPDATED,
]);

/** 负责进程内实时广播，并保留有限的 transient 事件用于快速重连。 */
export class SessionEventBroker {
  private readonly subscribers = new Map<SessionId, Set<SessionEventSubscriber>>();
  private readonly replayEvents = new Map<SessionId, HarnessEvent[]>();

  public publish(event: HarnessEvent): void {
    if (REPLAYABLE_EVENT_TYPES.has(event.type)) {
      const events = this.replayEvents.get(event.sessionId) ?? [];
      events.push(event);
      if (events.length > MAX_REPLAY_EVENTS) events.splice(0, events.length - MAX_REPLAY_EVENTS);
      this.replayEvents.set(event.sessionId, events);
    }
    for (const subscriber of this.subscribers.get(event.sessionId) ?? []) {
      subscriber(event);
    }
  }

  public replay(sessionId: SessionId, afterSeq: number): readonly HarnessEvent[] {
    return (this.replayEvents.get(sessionId) ?? []).filter((event) => event.seq > afterSeq);
  }

  public subscribe(sessionId: SessionId, subscriber: SessionEventSubscriber): () => void {
    const sessionSubscribers = this.subscribers.get(sessionId) ?? new Set();
    sessionSubscribers.add(subscriber);
    this.subscribers.set(sessionId, sessionSubscribers);

    return () => {
      sessionSubscribers.delete(subscriber);
      if (sessionSubscribers.size === 0) this.subscribers.delete(sessionId);
    };
  }

  public clear(): void {
    this.subscribers.clear();
    this.replayEvents.clear();
  }
}
