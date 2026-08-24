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
  lastSeq: Type.Integer({ minimum: 0 }),
  modelId: Type.String({ minLength: 1 }),
  providerId: Type.String({ minLength: 1 }),
  title: Type.String({ minLength: 1 }),
  updatedAt: Type.Integer({ minimum: 0 }),
  workspaceId: Type.String({ minLength: 1 }),
  workspaceRoot: Type.String({ minLength: 1 }),
});

export type SessionVo = Static<typeof SessionVoSchema>;

export const SessionListVoSchema = Type.Array(SessionVoSchema);

export const SessionSnapshotVoSchema = Type.Object({
  events: Type.Array(HarnessEventVoSchema),
  session: SessionVoSchema,
});

export type SessionSnapshotVo = Static<typeof SessionSnapshotVoSchema>;

export const RunAcceptedVoSchema = Type.Object({
  runId: Type.String({ format: "uuid" }),
});

export type RunAcceptedVo = Static<typeof RunAcceptedVoSchema>;
