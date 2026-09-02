import { type Static, Type } from "typebox";

export const CustomProviderProtocol = {
  ANTHROPIC_MESSAGES: "anthropic-messages",
  OPENAI_COMPLETIONS: "openai-completions",
  OPENAI_RESPONSES: "openai-responses",
} as const;

export type CustomProviderProtocol =
  (typeof CustomProviderProtocol)[keyof typeof CustomProviderProtocol];

const CustomProviderProtocolSchema = Type.Union([
  Type.Literal(CustomProviderProtocol.OPENAI_COMPLETIONS),
  Type.Literal(CustomProviderProtocol.OPENAI_RESPONSES),
  Type.Literal(CustomProviderProtocol.ANTHROPIC_MESSAGES),
]);

const CustomProviderModelSchema = Type.Object({
  contextWindow: Type.Integer({ maximum: 10_000_000, minimum: 1_024 }),
  id: Type.String({ minLength: 1, maxLength: 200 }),
  maxTokens: Type.Integer({ maximum: 10_000_000, minimum: 1 }),
  reasoning: Type.Boolean(),
});

const ProviderFieldsSchema = Type.Object({
  baseUrl: Type.String({ minLength: 1, maxLength: 2_048 }),
  models: Type.Array(CustomProviderModelSchema, { maxItems: 100 }),
  name: Type.String({ minLength: 1, maxLength: 100 }),
  protocol: CustomProviderProtocolSchema,
  requiresApiKey: Type.Boolean(),
});

export const CreateProviderDtoSchema = ProviderFieldsSchema;
export type CreateProviderDto = Static<typeof CreateProviderDtoSchema>;

export const UpdateProviderDtoSchema = Type.Object({
  baseUrl: Type.Optional(Type.String({ minLength: 1, maxLength: 2_048 })),
  enabled: Type.Optional(Type.Boolean()),
  models: Type.Optional(Type.Array(CustomProviderModelSchema, { maxItems: 100 })),
  name: Type.Optional(Type.String({ minLength: 1, maxLength: 100 })),
  protocol: Type.Optional(CustomProviderProtocolSchema),
  requiresApiKey: Type.Optional(Type.Boolean()),
});
export type UpdateProviderDto = Static<typeof UpdateProviderDtoSchema>;

export const ProviderCredentialDtoSchema = Type.Object({
  apiKey: Type.String({ minLength: 1, maxLength: 8_192 }),
});
export type ProviderCredentialDto = Static<typeof ProviderCredentialDtoSchema>;

export const ProviderOAuthPromptAnswerDtoSchema = Type.Object({
  promptId: Type.String({ minLength: 1, maxLength: 100 }),
  value: Type.String({ maxLength: 8_192 }),
});
export type ProviderOAuthPromptAnswerDto = Static<typeof ProviderOAuthPromptAnswerDtoSchema>;

export const ProviderConnectionTestDtoSchema = Type.Object({
  apiKey: Type.Optional(Type.String({ minLength: 1, maxLength: 8_192 })),
  modelId: Type.String({ minLength: 1, maxLength: 200 }),
});
export type ProviderConnectionTestDto = Static<typeof ProviderConnectionTestDtoSchema>;

export const CustomProviderConnectionTestDtoSchema = Type.Object({
  apiKey: Type.Optional(Type.String({ minLength: 1, maxLength: 8_192 })),
  baseUrl: Type.String({ minLength: 1, maxLength: 2_048 }),
  modelId: Type.String({ minLength: 1, maxLength: 200 }),
  protocol: CustomProviderProtocolSchema,
  requiresApiKey: Type.Boolean(),
});
export type CustomProviderConnectionTestDto = Static<typeof CustomProviderConnectionTestDtoSchema>;

export const ProviderParamsDtoSchema = Type.Object({
  providerId: Type.String({ minLength: 1, maxLength: 200 }),
});
export type ProviderParamsDto = Static<typeof ProviderParamsDtoSchema>;
