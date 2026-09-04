import { randomUUID } from "node:crypto";
import {
  ApprovalDecision,
  type ApprovalResolvedData,
  type HarnessEvent,
  HarnessEventType,
  type RunContextData,
  type RunFailureData,
  type SessionId,
} from "@pi-harness/agent-runtime";
import { isPlainObject } from "es-toolkit";
import type { SessionEventBroker } from "../sse/session-event-broker.js";
import type { SessionRepository } from "../storage/database.js";
import {
  type SessionEventStore,
  shouldPersistSessionEvent,
} from "../storage/session-event-store.js";
import { findInterruptedRun } from "../utils/session-recovery.js";

interface RecordedRunContextState {
  contexts: ReadonlyMap<string, string>;
  system: string | null;
}

const EMPTY_RUN_CONTEXT_STATE: RecordedRunContextState = {
  contexts: new Map(),
  system: null,
};

function readRunContexts(value: unknown): RunContextData[] | null {
  if (!Array.isArray(value)) return null;
  const contexts: RunContextData[] = [];
  for (const context of value) {
    if (
      !isPlainObject(context) ||
      typeof context.content !== "string" ||
      typeof context.label !== "string" ||
      typeof context.type !== "string"
    ) {
      return null;
    }
    contexts.push({ content: context.content, label: context.label, type: context.type });
  }
  return contexts;
}

function indexRunContexts(contexts: readonly RunContextData[]): Map<string, string> {
  return new Map(contexts.map((context) => [context.type, JSON.stringify(context)]));
}

function readRunContextState(events: readonly HarnessEvent[]): RecordedRunContextState {
  let state = EMPTY_RUN_CONTEXT_STATE;
  for (const event of events) {
    if (event.type !== HarnessEventType.RUN_STARTED || !isPlainObject(event.data)) continue;
    const contexts = readRunContexts(event.data.contexts);
    let nextContexts = state.contexts;
    if (contexts !== null) {
      if (Array.isArray(event.data.removedContextTypes)) {
        const updated = new Map(state.contexts);
        for (const type of event.data.removedContextTypes) {
          if (typeof type === "string") updated.delete(type);
        }
        for (const [type, fingerprint] of indexRunContexts(contexts)) {
          updated.set(type, fingerprint);
        }
        nextContexts = updated;
      } else {
        nextContexts = indexRunContexts(contexts);
      }
    }
    state = {
      contexts: nextContexts,
      system:
        typeof event.data.systemPrompt === "string" && Array.isArray(event.data.tools)
          ? JSON.stringify([event.data.systemPrompt, event.data.tools])
          : state.system,
    };
  }
  return state;
}

function compactRunContextSnapshot(
  event: HarnessEvent,
  previous: RecordedRunContextState,
): { event: HarnessEvent; state: RecordedRunContextState } {
  if (event.type !== HarnessEventType.RUN_STARTED || !isPlainObject(event.data)) {
    return { event, state: previous };
  }

  const data = { ...event.data };
  const contexts = readRunContexts(data.contexts);
  const indexedContexts = contexts === null ? null : indexRunContexts(contexts);
  const system =
    typeof data.systemPrompt === "string" && Array.isArray(data.tools)
      ? JSON.stringify([data.systemPrompt, data.tools])
      : null;

  if (contexts !== null && indexedContexts !== null) {
    const changedContexts = contexts.filter(
      (context) => indexedContexts.get(context.type) !== previous.contexts.get(context.type),
    );
    const removedContextTypes = [...previous.contexts.keys()].filter(
      (type) => !indexedContexts.has(type),
    );
    if (changedContexts.length === 0 && removedContextTypes.length === 0) {
      delete data.contexts;
      delete data.removedContextTypes;
    } else {
      data.contexts = changedContexts;
      data.removedContextTypes = removedContextTypes;
    }
  }
  if (system !== null && system === previous.system) {
    delete data.systemPrompt;
    delete data.tools;
  }

  return {
    event: { ...event, data },
    state: {
      contexts: indexedContexts ?? previous.contexts,
      system: system ?? previous.system,
    },
  };
}

/** 按“JSONL → SQLite 索引 → SSE”顺序提交 Runtime 事件。 */
export class SessionEventService {
  private readonly runContextStateBySession = new Map<SessionId, RecordedRunContextState>();

  public constructor(
    private readonly sessions: SessionRepository,
    private readonly eventStore: SessionEventStore,
    private readonly broker: SessionEventBroker,
  ) {}

  public handle = async (event: HarnessEvent): Promise<void> => {
    const prepared = compactRunContextSnapshot(
      event,
      this.runContextStateBySession.get(event.sessionId) ?? EMPTY_RUN_CONTEXT_STATE,
    );
    if (shouldPersistSessionEvent(prepared.event)) {
      await this.eventStore.append(prepared.event);
    }
    this.runContextStateBySession.set(event.sessionId, prepared.state);

    const updated = this.sessions.updateIndex(
      prepared.event.sessionId,
      prepared.event.seq,
      prepared.event.timestamp,
    );
    if (!updated) {
      const session = this.sessions.find(prepared.event.sessionId);
      if (!session || session.lastSeq < prepared.event.seq) {
        throw new Error("Session event index could not be updated");
      }
    }
    this.broker.publish(prepared.event);
  };

  public async recoverInterruptedRuns(): Promise<void> {
    for (const session of this.sessions.list()) {
      const snapshot = await this.eventStore.load(session.id);
      this.runContextStateBySession.set(session.id, readRunContextState(snapshot.events));
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
