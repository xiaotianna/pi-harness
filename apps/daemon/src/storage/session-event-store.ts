import { mkdir, open, readFile, stat, truncate } from "node:fs/promises";
import { join } from "node:path";
import {
  type AgentMessage,
  type ContextCheckpointRecord,
  type ContextCompactedData,
  type HarnessEvent,
  HarnessEventType,
  isContextCheckpointRestoredData,
  isContextCompactedData,
  isContextWorkingStateResetData,
  isMessageBranchStartedData,
  isPlanUpdatedData,
  isTodoUpdatedData,
  type PlanUpdatedData,
  type SessionId,
  selectActiveSessionEvents,
  type TodoUpdatedData,
} from "@pi-harness/agent-runtime";
import { isError, isPlainObject } from "es-toolkit";
import { type Static, Type } from "typebox";
import { Value } from "typebox/value";

const SESSION_ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const HARNESS_EVENT_TYPES = new Set<string>(Object.values(HarnessEventType));
const TRANSIENT_EVENT_TYPES = new Set<string>([
  HarnessEventType.MESSAGE_DELTA,
  HarnessEventType.TOOL_UPDATED,
]);
const StoredHarnessEventSchema = Type.Object({
  data: Type.Unknown(),
  id: Type.String({ minLength: 1 }),
  runId: Type.Optional(Type.String({ minLength: 1 })),
  seq: Type.Integer({ minimum: 1 }),
  sessionId: Type.String({ minLength: 1 }),
  timestamp: Type.Integer({ minimum: 0 }),
  type: Type.String({ minLength: 1 }),
});

type StoredHarnessEvent = Static<typeof StoredHarnessEventSchema>;

export interface SessionEventSnapshot {
  contextCheckpoint: ContextCompactedData | null;
  contextCheckpointEventSeq: number | null;
  contextCheckpointHistory: readonly ContextCheckpointRecord[];
  contextCheckpointTailStartMessageIndex: number | null;
  events: readonly HarnessEvent[];
  lastPersistedSeq: number;
  messages: readonly AgentMessage[];
  plan: PlanUpdatedData | null;
  todos: TodoUpdatedData | null;
}

function isAgentMessage(value: unknown): value is AgentMessage {
  if (!isPlainObject(value) || typeof value.timestamp !== "number") return false;
  if (value.role === "user")
    return typeof value.content === "string" || Array.isArray(value.content);
  if (value.role === "assistant") {
    return (
      Array.isArray(value.content) &&
      typeof value.provider === "string" &&
      typeof value.model === "string" &&
      typeof value.stopReason === "string"
    );
  }
  return (
    value.role === "toolResult" &&
    typeof value.toolCallId === "string" &&
    typeof value.toolName === "string" &&
    Array.isArray(value.content) &&
    typeof value.isError === "boolean"
  );
}

function parseHarnessEvent(value: unknown, expectedSessionId: SessionId): HarnessEvent {
  if (!Value.Check(StoredHarnessEventSchema, value)) {
    throw new Error("Session event is invalid");
  }
  const event = value as StoredHarnessEvent;
  if (event.sessionId !== expectedSessionId || !HARNESS_EVENT_TYPES.has(event.type)) {
    throw new Error("Session event is invalid");
  }

  if (
    (event.type === HarnessEventType.MESSAGE_STARTED ||
      event.type === HarnessEventType.MESSAGE_COMPLETED) &&
    !isAgentMessage(event.data)
  ) {
    throw new Error("Session message event is invalid");
  }
  if (
    event.type === HarnessEventType.MESSAGE_BRANCH_STARTED &&
    !isMessageBranchStartedData(event.data)
  ) {
    throw new Error("Session message branch event is invalid");
  }
  if (event.type === HarnessEventType.CONTEXT_COMPACTED && !isContextCompactedData(event.data)) {
    throw new Error("Session context checkpoint event is invalid");
  }
  if (
    event.type === HarnessEventType.CONTEXT_CHECKPOINT_RESTORED &&
    !isContextCheckpointRestoredData(event.data)
  ) {
    throw new Error("Session context checkpoint restoration event is invalid");
  }
  if (
    event.type === HarnessEventType.CONTEXT_WORKING_STATE_RESET &&
    !isContextWorkingStateResetData(event.data)
  ) {
    throw new Error("Session working state reset event is invalid");
  }
  if (event.type === HarnessEventType.PLAN_UPDATED && !isPlanUpdatedData(event.data)) {
    throw new Error("Session plan event is invalid");
  }
  if (event.type === HarnessEventType.TODO_UPDATED && !isTodoUpdatedData(event.data)) {
    throw new Error("Session todo event is invalid");
  }

  return event as unknown as HarnessEvent;
}

function sessionFileName(sessionId: SessionId): string {
  if (!SESSION_ID_PATTERN.test(sessionId)) {
    throw new Error("Session id is invalid");
  }
  return `${sessionId}.jsonl`;
}

export function shouldPersistSessionEvent(event: HarnessEvent): boolean {
  return !TRANSIENT_EVENT_TYPES.has(event.type);
}

/** Session JSONL 是对话事实来源；每个 session 的写入在此处串行化。 */
export class SessionEventStore {
  private readonly lastSeqBySession = new Map<SessionId, number>();
  private readonly revisions = new Map<SessionId, number>();
  private readonly writeTails = new Map<SessionId, Promise<void>>();

  public constructor(private readonly directory: string) {}

  public async initialize(): Promise<void> {
    await mkdir(this.directory, { mode: 0o700, recursive: true });
  }

  public async load(sessionId: SessionId): Promise<SessionEventSnapshot> {
    const pendingWrite = this.writeTails.get(sessionId);
    if (pendingWrite !== undefined) await pendingWrite;

    return this.readSnapshot(sessionId);
  }

  public getRevision(sessionId: SessionId): number {
    return this.revisions.get(sessionId) ?? 0;
  }

  public async getSize(sessionId: SessionId): Promise<number> {
    const pendingWrite = this.writeTails.get(sessionId);
    if (pendingWrite !== undefined) await pendingWrite;
    try {
      return (await stat(join(this.directory, sessionFileName(sessionId)))).size;
    } catch (error: unknown) {
      if (isError(error) && "code" in error && error.code === "ENOENT") return 0;
      throw error;
    }
  }

  private async readSnapshot(sessionId: SessionId): Promise<SessionEventSnapshot> {
    const path = join(this.directory, sessionFileName(sessionId));
    let source: string;
    try {
      source = await readFile(path, "utf8");
    } catch (error: unknown) {
      if (isError(error) && "code" in error && error.code === "ENOENT") {
        if (!this.lastSeqBySession.has(sessionId)) this.lastSeqBySession.set(sessionId, 0);
        return {
          contextCheckpoint: null,
          contextCheckpointEventSeq: null,
          contextCheckpointHistory: [],
          contextCheckpointTailStartMessageIndex: null,
          events: [],
          lastPersistedSeq: 0,
          messages: [],
          plan: null,
          todos: null,
        };
      }
      throw error;
    }

    const hasTrailingNewline = source.endsWith("\n");
    const lines = source.split("\n");
    if (hasTrailingNewline) lines.pop();
    const events: HarnessEvent[] = [];
    let previousSeq = 0;

    for (const [index, line] of lines.entries()) {
      if (line.length === 0) throw new Error("Session JSONL contains an empty middle line");
      try {
        const event = parseHarnessEvent(JSON.parse(line) as unknown, sessionId);
        if (event.seq <= previousSeq) {
          throw new Error("Session event sequence is not strictly increasing");
        }
        previousSeq = event.seq;
        events.push(event);
      } catch (error: unknown) {
        const isIncompleteLastLine = index === lines.length - 1 && !hasTrailingNewline;
        if (isIncompleteLastLine && error instanceof SyntaxError) {
          const lastCompleteLineEnd = source.lastIndexOf("\n") + 1;
          await truncate(path, lastCompleteLineEnd);
          break;
        }
        throw error;
      }
    }

    const activeEvents = selectActiveSessionEvents(events);
    const messages: AgentMessage[] = [];
    const contextCheckpointHistory: ContextCheckpointRecord[] = [];
    let contextCheckpointRecord: ContextCheckpointRecord | null = null;
    let contextCheckpointTailStartMessageIndex: number | null = null;
    let plan: PlanUpdatedData | null = null;
    let todos: TodoUpdatedData | null = null;
    for (const event of activeEvents) {
      if (event.type === HarnessEventType.MESSAGE_COMPLETED && isAgentMessage(event.data)) {
        messages.push(event.data);
      }
      if (event.type === HarnessEventType.CONTEXT_COMPACTED && isContextCompactedData(event.data)) {
        const compactedData = event.data;
        if (
          compactedData.previousCompactionId !== undefined &&
          !contextCheckpointHistory.some(
            (record) => record.data.compactionId === compactedData.previousCompactionId,
          )
        ) {
          throw new Error("Session context checkpoint parent is invalid");
        }
        const record = { data: compactedData, eventSeq: event.seq };
        contextCheckpointHistory.push(record);
        contextCheckpointRecord = record;
        contextCheckpointTailStartMessageIndex = null;
      } else if (
        event.type === HarnessEventType.CONTEXT_CHECKPOINT_RESTORED &&
        isContextCheckpointRestoredData(event.data)
      ) {
        const restoredData = event.data;
        const restored = contextCheckpointHistory.find(
          (record) => record.eventSeq === restoredData.sourceEventSeq,
        );
        if (restored === undefined) {
          throw new Error("Session context checkpoint restoration target is invalid");
        }
        contextCheckpointRecord = restored;
        contextCheckpointTailStartMessageIndex = messages.length;
      } else if (event.type === HarnessEventType.CONTEXT_WORKING_STATE_RESET) {
        plan = null;
        todos = null;
      } else if (event.type === HarnessEventType.PLAN_UPDATED && isPlanUpdatedData(event.data)) {
        plan = event.data;
      } else if (event.type === HarnessEventType.TODO_UPDATED && isTodoUpdatedData(event.data)) {
        todos = event.data;
      }
    }
    const contextCheckpoint = contextCheckpointRecord?.data ?? null;
    if (contextCheckpoint !== null && contextCheckpoint.sourceMessageCount > messages.length) {
      throw new Error("Session context checkpoint exceeds the stored message history");
    }
    const knownSeq = this.lastSeqBySession.get(sessionId) ?? 0;
    if (previousSeq > knownSeq) this.lastSeqBySession.set(sessionId, previousSeq);
    return {
      contextCheckpoint,
      contextCheckpointEventSeq: contextCheckpointRecord?.eventSeq ?? null,
      contextCheckpointHistory,
      contextCheckpointTailStartMessageIndex,
      events,
      lastPersistedSeq: previousSeq,
      messages,
      plan,
      todos,
    };
  }

  public async append(event: HarnessEvent): Promise<void> {
    if (!shouldPersistSessionEvent(event)) {
      throw new Error(`Transient event ${event.type} must not be written to Session JSONL`);
    }

    this.revisions.set(event.sessionId, this.getRevision(event.sessionId) + 1);
    const previous = this.writeTails.get(event.sessionId) ?? Promise.resolve();
    const operation = previous.then(() => this.appendNow(event));
    const tail = operation.then(
      () => undefined,
      () => undefined,
    );
    this.writeTails.set(event.sessionId, tail);
    try {
      await operation;
    } finally {
      if (this.writeTails.get(event.sessionId) === tail) {
        this.writeTails.delete(event.sessionId);
      }
    }
  }

  private async appendNow(event: HarnessEvent): Promise<void> {
    let lastSeq = this.lastSeqBySession.get(event.sessionId);
    if (lastSeq === undefined) {
      lastSeq = (await this.readSnapshot(event.sessionId)).lastPersistedSeq;
    }
    if (event.seq <= lastSeq) {
      throw new Error("Session event sequence must be strictly increasing");
    }

    const path = join(this.directory, sessionFileName(event.sessionId));
    const handle = await open(path, "a", 0o600);
    try {
      await handle.write(`${JSON.stringify(event)}\n`);
      await handle.sync();
    } finally {
      await handle.close();
    }
    this.lastSeqBySession.set(event.sessionId, event.seq);
  }
}
