import { ApprovalDecision } from "@pi-harness/agent-runtime/harness-event";
import { ThinkingLevel } from "@pi-harness/agent-runtime/thinking-level";
import { UserContextReferenceKind } from "@pi-harness/agent-runtime/user-input";
import { type Static, Type } from "typebox";

const IdentifierSchema = Type.String({ maxLength: 256, minLength: 1 });
const ThinkingLevelSchema = Type.Union([
  Type.Literal(ThinkingLevel.LOW),
  Type.Literal(ThinkingLevel.MEDIUM),
  Type.Literal(ThinkingLevel.HIGH),
]);

export const SessionParamsDtoSchema = Type.Object({
  sessionId: Type.String({ format: "uuid" }),
});

export type SessionParamsDto = Static<typeof SessionParamsDtoSchema>;

export const SessionCheckpointParamsDtoSchema = Type.Object({
  eventSeq: Type.Integer({ minimum: 1 }),
  sessionId: Type.String({ format: "uuid" }),
});

export type SessionCheckpointParamsDto = Static<typeof SessionCheckpointParamsDtoSchema>;

export const SessionListQueryDtoSchema = Type.Object({
  archived: Type.Optional(Type.Boolean()),
});

export type SessionListQueryDto = Static<typeof SessionListQueryDtoSchema>;

export const SessionRunParamsDtoSchema = Type.Object({
  runId: Type.String({ format: "uuid" }),
  sessionId: Type.String({ format: "uuid" }),
});

export type SessionRunParamsDto = Static<typeof SessionRunParamsDtoSchema>;

export const SessionApprovalParamsDtoSchema = Type.Object({
  approvalId: Type.String({ format: "uuid" }),
  runId: Type.String({ format: "uuid" }),
  sessionId: Type.String({ format: "uuid" }),
});

export type SessionApprovalParamsDto = Static<typeof SessionApprovalParamsDtoSchema>;

export const ResolveApprovalDtoSchema = Type.Object({
  decision: Type.Union([
    Type.Literal(ApprovalDecision.APPROVED),
    Type.Literal(ApprovalDecision.REJECTED),
  ]),
});

export type ResolveApprovalDto = Static<typeof ResolveApprovalDtoSchema>;

export const CreateSessionDtoSchema = Type.Object({
  modelId: IdentifierSchema,
  providerId: IdentifierSchema,
  thinkingLevel: Type.Optional(ThinkingLevelSchema),
  title: Type.Optional(Type.String({ maxLength: 200 })),
  workspaceId: Type.String({ format: "uuid" }),
});

export type CreateSessionDto = Static<typeof CreateSessionDtoSchema>;

export const UpdateSessionDtoSchema = Type.Object(
  {
    archived: Type.Optional(Type.Boolean()),
    title: Type.Optional(Type.String({ maxLength: 200, minLength: 1 })),
  },
  { minProperties: 1 },
);

export type UpdateSessionDto = Static<typeof UpdateSessionDtoSchema>;

export const UpdateSessionModelDtoSchema = Type.Object({
  modelId: IdentifierSchema,
  providerId: IdentifierSchema,
  thinkingLevel: Type.Optional(ThinkingLevelSchema),
});

export type UpdateSessionModelDto = Static<typeof UpdateSessionModelDtoSchema>;

const RunInputAttachmentSchema = Type.Object({
  data: Type.String({ maxLength: 7_000_000 }),
  mimeType: Type.String({ maxLength: 255, minLength: 1 }),
  name: Type.String({ maxLength: 255, minLength: 1 }),
  size: Type.Integer({ maximum: 5 * 1024 * 1024, minimum: 0 }),
});

const RunInputContextReferenceSchema = Type.Object({
  kind: Type.Union([
    Type.Literal(UserContextReferenceKind.FILE),
    Type.Literal(UserContextReferenceKind.FOLDER),
    Type.Literal(UserContextReferenceKind.IMAGE),
  ]),
  path: Type.String({ maxLength: 4_096, minLength: 1 }),
});

export const StartRunDtoSchema = Type.Object({
  attachments: Type.Optional(Type.Array(RunInputAttachmentSchema, { maxItems: 8 })),
  prompt: Type.String({ maxLength: 1_000_000 }),
  references: Type.Optional(Type.Array(RunInputContextReferenceSchema, { maxItems: 32 })),
});

export type StartRunDto = Static<typeof StartRunDtoSchema>;

export const SessionEventsQueryDtoSchema = Type.Object({
  afterSeq: Type.Optional(Type.Integer({ minimum: 0 })),
});

export type SessionEventsQueryDto = Static<typeof SessionEventsQueryDtoSchema>;
