import { randomUUID } from "node:crypto";
import {
  ApprovalDecision,
  type ApprovalResolvedData,
  type HarnessEvent,
  HarnessEventType,
  type RunFailureData,
} from "@pi-harness/agent-runtime";
import type { SessionEventBroker } from "../sse/session-event-broker.js";
import type { SessionRepository } from "../storage/database.js";
import {
  type SessionEventStore,
  shouldPersistSessionEvent,
} from "../storage/session-event-store.js";
import { findInterruptedRun } from "../utils/session-recovery.js";

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

  public async recoverInterruptedRuns(): Promise<void> {
    for (const session of this.sessions.list()) {
      const snapshot = await this.eventStore.load(session.id);
      const interrupted = findInterruptedRun(snapshot.events);
      if (interrupted === null) continue;

      let nextSeq = Math.max(session.lastSeq, snapshot.lastPersistedSeq) + 1;
      const timestamp = Date.now();
      for (const approval of interrupted.pendingApprovals) {
        await this.handle({
          data: {
            approvalId: approval.approvalId,
            decision: ApprovalDecision.EXPIRED,
            toolCallId: approval.toolCallId,
            toolName: approval.toolName,
          } satisfies ApprovalResolvedData,
          id: randomUUID(),
          runId: interrupted.runId,
          seq: nextSeq,
          sessionId: session.id,
          timestamp,
          type: HarnessEventType.APPROVAL_RESOLVED,
        });
        nextSeq += 1;
      }
      await this.handle({
        data: {
          code: "RUN_INTERRUPTED",
          message: "Daemon restarted before the run completed",
        } satisfies RunFailureData,
        id: randomUUID(),
        runId: interrupted.runId,
        seq: nextSeq,
        sessionId: session.id,
        timestamp,
        type: HarnessEventType.RUN_ABORTED,
      });
    }
  }
}
