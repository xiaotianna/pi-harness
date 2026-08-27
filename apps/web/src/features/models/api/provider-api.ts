import { ThinkingLevel } from "@pi-harness/agent-runtime/thinking-level";
import { type Static, Type } from "typebox";
import { Value } from "typebox/value";

const ProviderSchema = Type.Object({
  authSource: Type.Union([Type.String(), Type.Null()]),
  baseUrl: Type.Union([Type.String(), Type.Null()]),
  canDelete: Type.Boolean(),
  credentialPreview: Type.Union([Type.String(), Type.Null()]),
  enabled: Type.Boolean(),
  hasStoredCredential: Type.Boolean(),
  id: Type.String(),
  isConfigured: Type.Boolean(),
  kind: Type.Union([Type.Literal("builtin"), Type.Literal("custom")]),
  models: Type.Array(
    Type.Object({
      contextWindow: Type.Integer({ minimum: 1 }),
      id: Type.String(),
      name: Type.String(),
      thinkingLevels: Type.Array(
        Type.Union([
          Type.Literal(ThinkingLevel.LOW),
          Type.Literal(ThinkingLevel.MEDIUM),
          Type.Literal(ThinkingLevel.HIGH),
        ]),
      ),
    }),
  ),
  name: Type.String(),
  protocol: Type.Union([Type.String(), Type.Null()]),
  requiresApiKey: Type.Boolean(),
  supportsOAuth: Type.Boolean(),
});

const ProviderListSchema = Type.Array(ProviderSchema);

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

const ProviderOAuthStateSchema = Type.Union([
  Type.Object({
    message: Type.String(),
    providerId: Type.String(),
    status: Type.Literal(ProviderOAuthStatus.STARTING),
  }),
  Type.Object({
    authorizationUrl: Type.String(),
    message: Type.String(),
    providerId: Type.String(),
    status: Type.Literal(ProviderOAuthStatus.AWAITING_USER),
    userCode: Type.Union([Type.String(), Type.Null()]),
  }),
  Type.Object({
    authorizationUrl: Type.Union([Type.String(), Type.Null()]),
    message: Type.String(),
    options: Type.Array(
      Type.Object({
        description: Type.Union([Type.String(), Type.Null()]),
        id: Type.String(),
        label: Type.String(),
      }),
    ),
    placeholder: Type.Union([Type.String(), Type.Null()]),
    promptId: Type.String(),
    promptType: Type.Union([
      Type.Literal(ProviderOAuthPromptType.TEXT),
      Type.Literal(ProviderOAuthPromptType.SECRET),
      Type.Literal(ProviderOAuthPromptType.SELECT),
      Type.Literal(ProviderOAuthPromptType.MANUAL_CODE),
    ]),
    providerId: Type.String(),
    status: Type.Literal(ProviderOAuthStatus.AWAITING_INPUT),
    userCode: Type.Union([Type.String(), Type.Null()]),
  }),
  Type.Object({
    message: Type.String(),
    providerId: Type.String(),
    status: Type.Literal(ProviderOAuthStatus.COMPLETED),
  }),
  Type.Object({
    message: Type.String(),
    providerId: Type.String(),
    status: Type.Literal(ProviderOAuthStatus.FAILED),
  }),
]);

export type ModelProvider = Static<typeof ProviderSchema>;
export type ProviderOAuthState = Static<typeof ProviderOAuthStateSchema>;

export interface ProviderInput {
  baseUrl: string;
  modelIds: readonly string[];
  name: string;
  protocol: "anthropic-messages" | "openai-completions" | "openai-responses";
  requiresApiKey: boolean;
}

export type ProviderUpdate = Partial<ProviderInput & { enabled: boolean }>;

export interface CustomProviderConnectionTestInput {
  apiKey?: string;
  baseUrl: string;
  modelId: string;
  protocol: ProviderInput["protocol"];
  requiresApiKey: boolean;
}

export class ProviderApiError extends Error {
  public constructor(
    public readonly status: number,
    public readonly code: string | null,
    message: string,
  ) {
    super(message);
    this.name = "ProviderApiError";
  }
}

async function request(url: string, init?: RequestInit): Promise<Response> {
  const response = await fetch(url, {
    ...init,
    credentials: "same-origin",
    headers: {
      Accept: "application/json",
      ...(init?.body === undefined ? {} : { "Content-Type": "application/json" }),
      ...(init?.method === undefined || init.method === "GET"
        ? {}
        : { "X-PI-Harness-Request": "1" }),
      ...init?.headers,
    },
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as {
      code?: unknown;
      message?: unknown;
    } | null;
    throw new ProviderApiError(
      response.status,
      typeof body?.code === "string" ? body.code : null,
      typeof body?.message === "string" ? body.message : `请求失败，状态码：${response.status}`,
    );
  }
  return response;
}

async function readProvider(response: Response): Promise<ModelProvider> {
  const body = (await response.json()) as unknown;
  if (!Value.Check(ProviderSchema, body)) throw new Error("daemon 返回了无效的 Provider 响应");
  return body;
}

async function readProviderOAuthState(response: Response): Promise<ProviderOAuthState> {
  const body = (await response.json()) as unknown;
  if (!Value.Check(ProviderOAuthStateSchema, body)) {
    throw new Error("daemon 返回了无效的 OAuth 登录状态");
  }
  return body;
}

export async function listProviders(): Promise<readonly ModelProvider[]> {
  const body = (await (await request("/api/providers")).json()) as unknown;
  if (!Value.Check(ProviderListSchema, body)) {
    throw new Error("daemon 返回了无效的 Provider 列表");
  }
  return body;
}

export async function createProvider(input: ProviderInput): Promise<ModelProvider> {
  return readProvider(
    await request("/api/providers", { body: JSON.stringify(input), method: "POST" }),
  );
}

export async function updateProvider(
  providerId: string,
  input: ProviderUpdate,
): Promise<ModelProvider> {
  return readProvider(
    await request(`/api/providers/${encodeURIComponent(providerId)}`, {
      body: JSON.stringify(input),
      method: "PATCH",
    }),
  );
}

export async function deleteProvider(providerId: string): Promise<void> {
  await request(`/api/providers/${encodeURIComponent(providerId)}`, { method: "DELETE" });
}

export async function saveProviderApiKey(providerId: string, apiKey: string): Promise<void> {
  await request(`/api/providers/${encodeURIComponent(providerId)}/credential`, {
    body: JSON.stringify({ apiKey }),
    method: "PUT",
  });
}

export async function deleteProviderCredential(providerId: string): Promise<void> {
  await request(`/api/providers/${encodeURIComponent(providerId)}/credential`, {
    method: "DELETE",
  });
}

export async function startProviderOAuth(providerId: string): Promise<ProviderOAuthState> {
  return readProviderOAuthState(
    await request(`/api/providers/${encodeURIComponent(providerId)}/oauth`, { method: "POST" }),
  );
}

export async function getProviderOAuthState(providerId: string): Promise<ProviderOAuthState> {
  return readProviderOAuthState(
    await request(`/api/providers/${encodeURIComponent(providerId)}/oauth`),
  );
}

export async function answerProviderOAuthPrompt(
  providerId: string,
  promptId: string,
  value: string,
): Promise<void> {
  await request(`/api/providers/${encodeURIComponent(providerId)}/oauth/prompt`, {
    body: JSON.stringify({ promptId, value }),
    method: "POST",
  });
}

export async function cancelProviderOAuth(providerId: string): Promise<void> {
  await request(`/api/providers/${encodeURIComponent(providerId)}/oauth`, { method: "DELETE" });
}

export async function testProviderConnection(
  providerId: string,
  modelId: string,
  apiKey?: string,
): Promise<void> {
  await request(`/api/providers/${encodeURIComponent(providerId)}/test`, {
    body: JSON.stringify({ ...(apiKey === undefined ? {} : { apiKey }), modelId }),
    method: "POST",
  });
}

export async function testCustomProviderConnection(
  input: CustomProviderConnectionTestInput,
): Promise<void> {
  await request("/api/providers/test", {
    body: JSON.stringify(input),
    method: "POST",
  });
}
