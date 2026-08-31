import {
  type ApprovalResponseDecision,
  type HarnessEvent,
  HarnessEventType,
} from "@pi-harness/agent-runtime/harness-event";
import {
  ThinkingLevel,
  type ThinkingLevel as ThinkingLevelValue,
} from "@pi-harness/agent-runtime/thinking-level";
import type { RunUserInput } from "@pi-harness/agent-runtime/user-input";
import { type Static, Type } from "typebox";
import { Value } from "typebox/value";
import { apiRequest } from "../../../api/request";

const SessionSchema = Type.Object({
  createdAt: Type.Integer({ minimum: 0 }),
  id: Type.String({ minLength: 1 }),
  lastSeq: Type.Integer({ minimum: 0 }),
  modelId: Type.String({ minLength: 1 }),
  providerId: Type.String({ minLength: 1 }),
  thinkingLevel: Type.Union([
    Type.Literal(ThinkingLevel.LOW),
    Type.Literal(ThinkingLevel.MEDIUM),
    Type.Literal(ThinkingLevel.HIGH),
  ]),
  title: Type.String({ minLength: 1 }),
  updatedAt: Type.Integer({ minimum: 0 }),
  workspaceId: Type.String({ minLength: 1 }),
  workspaceRoot: Type.String({ minLength: 1 }),
});

const HarnessEventSchema = Type.Object({
  data: Type.Unknown(),
  id: Type.String({ minLength: 1 }),
  runId: Type.Optional(Type.String({ minLength: 1 })),
  seq: Type.Integer({ minimum: 1 }),
  sessionId: Type.String({ minLength: 1 }),
  timestamp: Type.Integer({ minimum: 0 }),
  type: Type.String({ minLength: 1 }),
});

const SessionListSchema = Type.Array(SessionSchema);
const SessionSnapshotSchema = Type.Object({
  events: Type.Array(HarnessEventSchema),
  session: SessionSchema,
});
const RunAcceptedSchema = Type.Object({ runId: Type.String({ minLength: 1 }) });

export type Session = Static<typeof SessionSchema>;
export interface SessionSnapshot {
  events: HarnessEvent[];
  session: Session;
}
export type RunAccepted = Static<typeof RunAcceptedSchema>;

export interface CreateSessionInput {
  modelId: string;
  providerId: string;
  thinkingLevel: ThinkingLevelValue;
  title?: string;
  workspaceId: string;
}

export interface UpdateSessionInput {
  archived?: boolean;
  title?: string;
}

const EVENT_TYPES = new Set<string>(Object.values(HarnessEventType));

function parseEvent(value: unknown): HarnessEvent {
  if (!Value.Check(HarnessEventSchema, value) || !EVENT_TYPES.has(value.type)) {
    throw new Error("daemon 返回了无效的 Session 事件");
  }
  return value as HarnessEvent;
}

async function readSession(response: Response): Promise<Session> {
  const body = (await response.json()) as unknown;
  if (!Value.Check(SessionSchema, body)) throw new Error("daemon 返回了无效的 Session 响应");
  return body;
}

export async function listSessions(
  archived = false,
  signal?: AbortSignal,
): Promise<readonly Session[]> {
  const body = (await (
    await apiRequest(
      archived ? "/api/sessions?archived=true" : "/api/sessions",
      signal ? { signal } : undefined,
    )
  ).json()) as unknown;
  if (!Value.Check(SessionListSchema, body)) throw new Error("daemon 返回了无效的 Session 列表");
  return body;
}

export async function createSession(input: CreateSessionInput): Promise<Session> {
  return readSession(
    await apiRequest("/api/sessions", { body: JSON.stringify(input), method: "POST" }),
  );
}

export async function getSessionSnapshot(
  sessionId: string,
  signal?: AbortSignal,
): Promise<SessionSnapshot> {
  const body = (await (
    await apiRequest(
      `/api/sessions/${encodeURIComponent(sessionId)}`,
      signal ? { signal } : undefined,
    )
  ).json()) as unknown;
  if (!Value.Check(SessionSnapshotSchema, body)) {
    throw new Error("daemon 返回了无效的 Session 快照");
  }
  return { events: body.events.map(parseEvent), session: body.session };
}

export async function updateSession(
  sessionId: string,
  input: UpdateSessionInput,
): Promise<Session> {
  return readSession(
    await apiRequest(`/api/sessions/${encodeURIComponent(sessionId)}`, {
      body: JSON.stringify(input),
      method: "PATCH",
    }),
  );
}

export async function updateSessionModel(
  sessionId: string,
  providerId: string,
  modelId: string,
  thinkingLevel: ThinkingLevelValue,
): Promise<Session> {
  return readSession(
    await apiRequest(`/api/sessions/${encodeURIComponent(sessionId)}/model`, {
      body: JSON.stringify({ modelId, providerId, thinkingLevel }),
      method: "PATCH",
    }),
  );
}

export async function startSessionRun(
  sessionId: string,
  input: RunUserInput,
): Promise<RunAccepted> {
  const body = (await (
    await apiRequest(`/api/sessions/${encodeURIComponent(sessionId)}/runs`, {
      body: JSON.stringify(input),
      method: "POST",
    })
  ).json()) as unknown;
  if (!Value.Check(RunAcceptedSchema, body)) throw new Error("daemon 返回了无效的 Run 响应");
  return body;
}

export async function abortSessionRun(sessionId: string, runId: string): Promise<void> {
  await apiRequest(
    `/api/sessions/${encodeURIComponent(sessionId)}/runs/${encodeURIComponent(runId)}`,
    { method: "DELETE" },
  );
}

export async function followUpSessionRun(
  sessionId: string,
  runId: string,
  input: RunUserInput,
): Promise<void> {
  await apiRequest(
    `/api/sessions/${encodeURIComponent(sessionId)}/runs/${encodeURIComponent(runId)}/follow-ups`,
    { body: JSON.stringify(input), method: "POST" },
  );
}

export async function revertSessionRunChanges(sessionId: string, runId: string): Promise<void> {
  await apiRequest(
    `/api/sessions/${encodeURIComponent(sessionId)}/runs/${encodeURIComponent(runId)}/revert-changes`,
    { method: "POST" },
  );
}

export async function reapplySessionRunChanges(sessionId: string, runId: string): Promise<void> {
  await apiRequest(
    `/api/sessions/${encodeURIComponent(sessionId)}/runs/${encodeURIComponent(runId)}/reapply-changes`,
    { method: "POST" },
  );
}

export async function restoreSessionContextCheckpoint(
  sessionId: string,
  eventSeq: number,
): Promise<void> {
  await apiRequest(
    `/api/sessions/${encodeURIComponent(sessionId)}/context-checkpoints/${eventSeq}/restore`,
    { method: "POST" },
  );
}

export async function resolveToolApproval(
  sessionId: string,
  runId: string,
  approvalId: string,
  decision: ApprovalResponseDecision,
): Promise<void> {
  await apiRequest(
    `/api/sessions/${encodeURIComponent(sessionId)}/runs/${encodeURIComponent(runId)}/approvals/${encodeURIComponent(approvalId)}`,
    { body: JSON.stringify({ decision }), method: "POST" },
  );
}

export function parseSessionEvent(value: string): HarnessEvent {
  return parseEvent(JSON.parse(value) as unknown);
}

export function sessionEventsUrl(sessionId: string, afterSeq: number): string {
  return `/api/sessions/${encodeURIComponent(sessionId)}/events?afterSeq=${afterSeq}`;
}
