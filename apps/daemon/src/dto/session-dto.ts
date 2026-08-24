import { type Static, Type } from "typebox";

const IdentifierSchema = Type.String({ maxLength: 256, minLength: 1 });

export const SessionParamsDtoSchema = Type.Object({
  sessionId: Type.String({ format: "uuid" }),
});

export type SessionParamsDto = Static<typeof SessionParamsDtoSchema>;

export const SessionRunParamsDtoSchema = Type.Object({
  runId: Type.String({ format: "uuid" }),
  sessionId: Type.String({ format: "uuid" }),
});

export type SessionRunParamsDto = Static<typeof SessionRunParamsDtoSchema>;

export const CreateSessionDtoSchema = Type.Object({
  modelId: IdentifierSchema,
  providerId: IdentifierSchema,
  title: Type.Optional(Type.String({ maxLength: 200 })),
  workspaceRoot: Type.String({ maxLength: 4096, minLength: 1 }),
});

export type CreateSessionDto = Static<typeof CreateSessionDtoSchema>;

export const UpdateSessionModelDtoSchema = Type.Object({
  modelId: IdentifierSchema,
  providerId: IdentifierSchema,
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
