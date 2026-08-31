import { ThinkingLevel } from "@pi-harness/agent-runtime/thinking-level";
import { type Static, Type } from "typebox";

const ProviderModelVoSchema = Type.Object({
  contextWindow: Type.Integer({ minimum: 1 }),
  id: Type.String({ minLength: 1 }),
  maxTokens: Type.Integer({ minimum: 1 }),
  name: Type.String({ minLength: 1 }),
  thinkingLevels: Type.Array(
    Type.Union([
      Type.Literal(ThinkingLevel.LOW),
      Type.Literal(ThinkingLevel.MEDIUM),
      Type.Literal(ThinkingLevel.HIGH),
    ]),
  ),
});

export const ProviderOAuthStatus = {
  AWAITING_INPUT: "awaiting_input",
  AWAITING_USER: "awaiting_user",
  COMPLETED: "completed",
  FAILED: "failed",
  STARTING: "starting",
} as const;

export const ProviderOAuthPromptType = {
  MANUAL_CODE: "manual_code",
  SECRET: "secret",
  SELECT: "select",
  TEXT: "text",
} as const;

const ProviderOAuthStartingVoSchema = Type.Object({
  message: Type.String({ minLength: 1, maxLength: 500 }),
  providerId: Type.String({ minLength: 1 }),
  status: Type.Literal(ProviderOAuthStatus.STARTING),
});

const ProviderOAuthAwaitingUserVoSchema = Type.Object({
  authorizationUrl: Type.String({ minLength: 1, maxLength: 4_096 }),
  message: Type.String({ minLength: 1, maxLength: 500 }),
  providerId: Type.String({ minLength: 1 }),
  status: Type.Literal(ProviderOAuthStatus.AWAITING_USER),
  userCode: Type.Union([Type.String({ minLength: 1, maxLength: 100 }), Type.Null()]),
});

const ProviderOAuthAwaitingInputVoSchema = Type.Object({
  authorizationUrl: Type.Union([Type.String({ minLength: 1, maxLength: 4_096 }), Type.Null()]),
  message: Type.String({ minLength: 1, maxLength: 500 }),
  options: Type.Array(
    Type.Object({
      description: Type.Union([Type.String({ minLength: 1, maxLength: 500 }), Type.Null()]),
      id: Type.String({ minLength: 1, maxLength: 200 }),
      label: Type.String({ minLength: 1, maxLength: 200 }),
    }),
    { maxItems: 50 },
  ),
  placeholder: Type.Union([Type.String({ minLength: 1, maxLength: 500 }), Type.Null()]),
  promptId: Type.String({ minLength: 1, maxLength: 100 }),
  promptType: Type.Union([
    Type.Literal(ProviderOAuthPromptType.TEXT),
    Type.Literal(ProviderOAuthPromptType.SECRET),
    Type.Literal(ProviderOAuthPromptType.SELECT),
    Type.Literal(ProviderOAuthPromptType.MANUAL_CODE),
  ]),
  providerId: Type.String({ minLength: 1 }),
  status: Type.Literal(ProviderOAuthStatus.AWAITING_INPUT),
  userCode: Type.Union([Type.String({ minLength: 1, maxLength: 100 }), Type.Null()]),
});

const ProviderOAuthCompletedVoSchema = Type.Object({
  message: Type.String({ minLength: 1, maxLength: 500 }),
  providerId: Type.String({ minLength: 1 }),
  status: Type.Literal(ProviderOAuthStatus.COMPLETED),
});

const ProviderOAuthFailedVoSchema = Type.Object({
  message: Type.String({ minLength: 1, maxLength: 500 }),
  providerId: Type.String({ minLength: 1 }),
  status: Type.Literal(ProviderOAuthStatus.FAILED),
});

export const ProviderOAuthStateVoSchema = Type.Union([
  ProviderOAuthStartingVoSchema,
  ProviderOAuthAwaitingUserVoSchema,
  ProviderOAuthAwaitingInputVoSchema,
  ProviderOAuthCompletedVoSchema,
  ProviderOAuthFailedVoSchema,
]);

export type ProviderOAuthStateVo = Static<typeof ProviderOAuthStateVoSchema>;

export const ProviderVoSchema = Type.Object({
  authSource: Type.Union([Type.String({ minLength: 1 }), Type.Null()]),
  baseUrl: Type.Union([Type.String({ minLength: 1 }), Type.Null()]),
  canDelete: Type.Boolean(),
  credentialPreview: Type.Union([Type.String({ minLength: 1, maxLength: 8_192 }), Type.Null()]),
  enabled: Type.Boolean(),
  hasStoredCredential: Type.Boolean(),
  id: Type.String({ minLength: 1 }),
  isConfigured: Type.Boolean(),
  kind: Type.Union([Type.Literal("builtin"), Type.Literal("custom")]),
  models: Type.Array(ProviderModelVoSchema),
  name: Type.String({ minLength: 1 }),
  protocol: Type.Union([Type.String({ minLength: 1 }), Type.Null()]),
  requiresApiKey: Type.Boolean(),
  supportsOAuth: Type.Boolean(),
});

export type ProviderVo = Static<typeof ProviderVoSchema>;

export const ProviderListVoSchema = Type.Array(ProviderVoSchema);
