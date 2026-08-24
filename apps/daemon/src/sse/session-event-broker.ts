import type { HarnessEvent, SessionId } from "@pi-harness/agent-runtime";

export type SessionEventSubscriber = (event: HarnessEvent) => void;

/** 只负责进程内实时广播；历史重放由 SessionEventStore 提供。 */
export class SessionEventBroker {
  private readonly subscribers = new Map<SessionId, Set<SessionEventSubscriber>>();

  public publish(event: HarnessEvent): void {
    for (const subscriber of this.subscribers.get(event.sessionId) ?? []) {
      subscriber(event);
    }
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
  }
}
