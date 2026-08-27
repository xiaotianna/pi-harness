import { ApprovalDecision } from "@pi-harness/agent-runtime/harness-event";
import { ThinkingLevel } from "@pi-harness/agent-runtime/thinking-level";
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

export const StartRunDtoSchema = Type.Object({
  prompt: Type.String({ maxLength: 1_000_000, minLength: 1 }),
});

export type StartRunDto = Static<typeof StartRunDtoSchema>;

export const SessionEventsQueryDtoSchema = Type.Object({
  afterSeq: Type.Optional(Type.Integer({ minimum: 0 })),
});

export type SessionEventsQueryDto = Static<typeof SessionEventsQueryDtoSchema>;
