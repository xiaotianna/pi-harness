import type { HarnessEvent } from "@pi-harness/agent-runtime";
import type { SessionEventBroker } from "../sse/session-event-broker.js";
import type { SessionRepository } from "../storage/database.js";
import {
  type SessionEventStore,
  shouldPersistSessionEvent,
} from "../storage/session-event-store.js";

/** 按“JSONL → SQLite 索引 → SSE”顺序提交 Runtime 事件。 */
export class SessionEventService {
  public constructor(
    private readonly sessions: SessionRepository,
    private readonly eventStore: SessionEventStore,
    private readonly broker: SessionEventBroker,
  ) {}

  public handle = async (event: HarnessEvent): Promise<void> => {
    if (shouldPersistSessionEvent(event)) {
      await this.eventStore.append(event);
    }

    const updated = this.sessions.updateIndex(event.sessionId, event.seq, event.timestamp);
    if (!updated) {
      const session = this.sessions.find(event.sessionId);
      if (!session || session.lastSeq < event.seq) {
        throw new Error("Session event index could not be updated");
      }
    }
    this.broker.publish(event);
  };
}
