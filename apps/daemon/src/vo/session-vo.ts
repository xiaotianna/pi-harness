import { ThinkingLevel } from "@pi-harness/agent-runtime/thinking-level";
import { type Static, Type } from "typebox";

export const HarnessEventVoSchema = Type.Object({
  data: Type.Unknown(),
  id: Type.String({ minLength: 1 }),
  runId: Type.Optional(Type.String({ minLength: 1 })),
  seq: Type.Integer({ minimum: 1 }),
  sessionId: Type.String({ minLength: 1 }),
  timestamp: Type.Integer({ minimum: 0 }),
  type: Type.String({ minLength: 1 }),
});

export const SessionVoSchema = Type.Object({
  createdAt: Type.Integer({ minimum: 0 }),
  id: Type.String({ minLength: 1 }),
  isRunning: Type.Optional(Type.Boolean()),
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

export type SessionVo = Static<typeof SessionVoSchema>;

export const SessionListVoSchema = Type.Array(SessionVoSchema);

export const SessionSearchResultVoSchema = Type.Object({
  description: Type.String({ maxLength: 160 }),
  excerpt: Type.String({ maxLength: 502 }),
  messageEventId: Type.Union([Type.String({ minLength: 1 }), Type.Null()]),
  session: SessionVoSchema,
});

export const SessionSearchResultListVoSchema = Type.Array(SessionSearchResultVoSchema);

export type SessionSearchResultVo = Static<typeof SessionSearchResultVoSchema>;

export const SessionSnapshotVoSchema = Type.Object({
  events: Type.Array(HarnessEventVoSchema),
  session: SessionVoSchema,
});

export type SessionSnapshotVo = Static<typeof SessionSnapshotVoSchema>;

export const RunAcceptedVoSchema = Type.Object({
  runId: Type.String({ format: "uuid" }),
  title: Type.String({ maxLength: 200, minLength: 1 }),
});

export type RunAcceptedVo = Static<typeof RunAcceptedVoSchema>;

export const QueuedRunInputVoSchema = Type.Object({
  attachments: Type.Array(
    Type.Object({
      contentIndex: Type.Optional(Type.Integer({ minimum: 0 })),
      mimeType: Type.String(),
      name: Type.String({ minLength: 1 }),
      size: Type.Integer({ minimum: 0 }),
    }),
  ),
  createdAt: Type.Integer({ minimum: 0 }),
  id: Type.String({ format: "uuid" }),
  prompt: Type.String(),
  references: Type.Array(
    Type.Object({
      kind: Type.String({ minLength: 1 }),
      path: Type.String({ minLength: 1 }),
    }),
  ),
});

export const QueuedRunInputListVoSchema = Type.Array(QueuedRunInputVoSchema);

export type QueuedRunInputVo = Static<typeof QueuedRunInputVoSchema>;

export const PendingToolApprovalVoSchema = Type.Object({
  approvalId: Type.String({ format: "uuid" }),
  expiresAt: Type.Integer({ minimum: 0 }),
  risk: Type.String({ minLength: 1 }),
  runId: Type.String({ format: "uuid" }),
  sessionId: Type.String({ format: "uuid" }),
  summary: Type.String({ minLength: 1 }),
  target: Type.String({ minLength: 1 }),
  toolCallId: Type.String({ minLength: 1 }),
  toolName: Type.String({ minLength: 1 }),
});

export type PendingToolApprovalVo = Static<typeof PendingToolApprovalVoSchema>;
