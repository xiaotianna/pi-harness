import { mkdir, open, readFile, truncate } from "node:fs/promises";
import { join } from "node:path";
import {
  type AgentMessage,
  type HarnessEvent,
  HarnessEventType,
  type SessionId,
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
  events: readonly HarnessEvent[];
  lastPersistedSeq: number;
  messages: readonly AgentMessage[];
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

  private async readSnapshot(sessionId: SessionId): Promise<SessionEventSnapshot> {
    const path = join(this.directory, sessionFileName(sessionId));
    let source: string;
    try {
      source = await readFile(path, "utf8");
    } catch (error: unknown) {
      if (isError(error) && "code" in error && error.code === "ENOENT") {
        if (!this.lastSeqBySession.has(sessionId)) this.lastSeqBySession.set(sessionId, 0);
        return { events: [], lastPersistedSeq: 0, messages: [] };
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

    const messages = events.flatMap((event) =>
      event.type === HarnessEventType.MESSAGE_COMPLETED && isAgentMessage(event.data)
        ? [event.data]
        : [],
    );
    const knownSeq = this.lastSeqBySession.get(sessionId) ?? 0;
    if (previousSeq > knownSeq) this.lastSeqBySession.set(sessionId, previousSeq);
    return { events, lastPersistedSeq: previousSeq, messages };
  }

  public async append(event: HarnessEvent): Promise<void> {
    if (!shouldPersistSessionEvent(event)) {
      throw new Error(`Transient event ${event.type} must not be written to Session JSONL`);
    }

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
