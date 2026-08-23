import { randomUUID } from "node:crypto";
import {
  type Api,
  anthropicMessagesApi,
  BUILT_IN_PROVIDER_IDS,
  type CredentialStore,
  createHarnessModels,
  createProvider,
  envApiKeyAuth,
  loadBuiltInProvider,
  type Model,
  type MutableModels,
  openAICompletionsApi,
  openAIResponsesApi,
  type Provider,
} from "@pi-harness/providers";
import {
  type CreateProviderDto,
  type CustomProviderConnectionTestDto,
  CustomProviderProtocol,
  type UpdateProviderDto,
} from "../dto/provider-dto.js";
import type { CustomProviderRecord, ProviderSettingRepository } from "../storage/database.js";
import {
  type ProviderOAuthStateVo,
  ProviderOAuthStatus,
  type ProviderVo,
} from "../vo/provider-vo.js";

const ProviderErrorCode = {
  BUILT_IN_READ_ONLY: "BUILT_IN_PROVIDER_READ_ONLY",
  CONNECTION_FAILED: "PROVIDER_CONNECTION_FAILED",
  INVALID_CONFIG: "INVALID_PROVIDER_CONFIG",
  MODEL_NOT_FOUND: "PROVIDER_MODEL_NOT_FOUND",
  NOT_FOUND: "PROVIDER_NOT_FOUND",
  OAUTH_NOT_STARTED: "PROVIDER_OAUTH_NOT_STARTED",
  OAUTH_NOT_SUPPORTED: "PROVIDER_OAUTH_NOT_SUPPORTED",
} as const;

const CONNECTION_TEST_TIMEOUT_MS = 15_000;
const OAUTH_LOGIN_TIMEOUT_MS = 15 * 60 * 1_000;

interface ProviderOAuthSession {
  readonly controller: AbortController;
  readonly signal: AbortSignal;
  state: ProviderOAuthStateVo;
  task: Promise<void>;
}

export class ProviderServiceError extends Error {
  public constructor(
    public readonly code: (typeof ProviderErrorCode)[keyof typeof ProviderErrorCode],
    message: string,
  ) {
    super(message);
    this.name = "ProviderServiceError";
  }
}

function validateBaseUrl(value: string): string {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new ProviderServiceError(ProviderErrorCode.INVALID_CONFIG, "Base URL 不是有效地址");
  }

  if (
    (url.protocol !== "http:" && url.protocol !== "https:") ||
    url.username !== "" ||
    url.password !== "" ||
    url.search !== "" ||
    url.hash !== ""
  ) {
    throw new ProviderServiceError(
      ProviderErrorCode.INVALID_CONFIG,
      "Base URL 必须使用 HTTP 或 HTTPS，且不能包含凭据、查询参数或片段",
    );
  }

  return url.toString().replace(/\/$/, "");
}

function normalizeModelIds(values: readonly string[]): readonly string[] {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

function normalizeName(value: string): string {
  const name = value.trim();
  if (!name) {
    throw new ProviderServiceError(ProviderErrorCode.INVALID_CONFIG, "Provider 名称不能为空");
  }
  return name;
}

function maskApiKey(key: string): string {
  const visibleLength = Math.min(4, Math.max(0, key.length - 4));
  return `${key.slice(0, visibleLength)}${"x".repeat(key.length - visibleLength)}`;
}

function readOAuthAuthorizationUrl(value: string): string {
  const url = new URL(value);
  if (url.protocol !== "https:") throw new Error("OAuth authorization URL must use HTTPS");
  return url.href;
}

function readProtocol(value: string): CustomProviderProtocol {
  if (
    value === CustomProviderProtocol.OPENAI_COMPLETIONS ||
    value === CustomProviderProtocol.OPENAI_RESPONSES ||
    value === CustomProviderProtocol.ANTHROPIC_MESSAGES
  ) {
    return value;
  }
  throw new ProviderServiceError(ProviderErrorCode.INVALID_CONFIG, "Provider 协议无效");
}

function createCustomProvider(record: CustomProviderRecord): Provider {
  const protocol = readProtocol(record.protocol);
  const api =
    protocol === CustomProviderProtocol.OPENAI_COMPLETIONS
      ? openAICompletionsApi()
      : protocol === CustomProviderProtocol.OPENAI_RESPONSES
        ? openAIResponsesApi()
        : anthropicMessagesApi();
  const auth = record.requiresApiKey
    ? envApiKeyAuth(`${record.name} API key`, [])
    : {
        name: "无需认证",
        async check() {
          return { source: "无需认证", type: "api_key" as const };
        },
        async resolve() {
          return { auth: {}, source: "无需认证" };
        },
      };
  const models: readonly Model<CustomProviderProtocol>[] = record.modelIds.map((id) => ({
    api: protocol,
    baseUrl: record.baseUrl,
    contextWindow: 128_000,
    cost: { cacheRead: 0, cacheWrite: 0, input: 0, output: 0 },
    id,
    input: ["text"],
    maxTokens: 32_000,
    name: id,
    provider: record.id,
    reasoning: false,
  }));

  // ponytail: 自定义模型先使用保守默认上限；确实需要逐模型调参时再扩展表单和表结构。
  return createProvider({
    api,
    auth: { apiKey: auth },
    baseUrl: record.baseUrl,
    id: record.id,
    models,
    name: record.name,
  });
}

async function testFirstResponseChunk(
  models: MutableModels,
  model: Model<Api>,
  apiKey?: string,
): Promise<void> {
  const controller = new AbortController();
  const timeoutSignal = AbortSignal.timeout(CONNECTION_TEST_TIMEOUT_MS);
  const signal = AbortSignal.any([controller.signal, timeoutSignal]);
  let receivedResponse = false;

  try {
    const stream = models.streamSimple(
      model,
      { messages: [{ content: "Reply with OK.", role: "user", timestamp: Date.now() }] },
      {
        ...(apiKey === undefined ? {} : { apiKey }),
        maxRetries: 0,
        maxTokens: 16,
        signal,
        timeoutMs: CONNECTION_TEST_TIMEOUT_MS,
      },
    );

    for await (const event of stream) {
      if (event.type === "error") throw new Error();
      if (event.type === "done") {
        receivedResponse = true;
        return;
      }
      if (
        (event.type === "text_delta" ||
          event.type === "thinking_delta" ||
          event.type === "toolcall_delta") &&
        event.delta.length > 0
      ) {
        receivedResponse = true;
        controller.abort();
        return;
      }
    }
    throw new Error();
  } catch {
    if (receivedResponse) return;
    throw new ProviderServiceError(
      ProviderErrorCode.CONNECTION_FAILED,
      timeoutSignal.aborted ? "连接测试超时" : "连接测试失败，请检查凭据、模型 ID 和服务地址",
    );
  } finally {
    controller.abort();
  }
}

export class ProviderService {
  private readonly builtInIds = new Set(BUILT_IN_PROVIDER_IDS);
  private readonly oauthSessions = new Map<string, ProviderOAuthSession>();

  private constructor(
    private readonly settings: ProviderSettingRepository,
    private readonly credentials: CredentialStore,
    private readonly models: MutableModels,
  ) {}

  public static async create(
    settings: ProviderSettingRepository,
    credentials: CredentialStore,
  ): Promise<ProviderService> {
    const builtIns = await Promise.all(BUILT_IN_PROVIDER_IDS.map(loadBuiltInProvider));
    const custom = settings.listCustom().map(createCustomProvider);
    return new ProviderService(
      settings,
      credentials,
      createHarnessModels([...builtIns, ...custom], credentials),
    );
  }

  public async list(): Promise<readonly ProviderVo[]> {
    const enabledOverrides = this.settings.listBuiltInEnabled();
    const customById = new Map(
      this.settings.listCustom().map((provider) => [provider.id, provider]),
    );
    return Promise.all(
      this.models.getProviders().map(async (provider) => {
        const custom = customById.get(provider.id);
        const credential = await this.credentials.read(provider.id);
        const auth = await this.models.checkAuth(provider.id);
        return {
          authSource: auth?.source ?? null,
          baseUrl: custom?.baseUrl ?? null,
          canDelete: custom !== undefined,
          credentialPreview:
            credential?.type === "api_key" && credential.key ? maskApiKey(credential.key) : null,
          enabled: custom?.enabled ?? enabledOverrides.get(provider.id) ?? true,
          hasStoredCredential: credential !== undefined,
          id: provider.id,
          isConfigured: auth !== undefined,
          kind: custom ? "custom" : "builtin",
          models: provider.getModels().map((model) => ({ id: model.id, name: model.name })),
          name: provider.name,
          protocol: custom?.protocol ?? null,
          requiresApiKey: custom?.requiresApiKey ?? provider.auth.apiKey !== undefined,
          supportsOAuth: provider.auth.oauth !== undefined,
        } satisfies ProviderVo;
      }),
    );
  }

  public async createProvider(input: CreateProviderDto): Promise<ProviderVo> {
    const now = Date.now();
    const record: CustomProviderRecord = {
      baseUrl: validateBaseUrl(input.baseUrl),
      createdAt: now,
      enabled: true,
      id: `custom:${randomUUID()}`,
      modelIds: normalizeModelIds(input.modelIds),
      name: normalizeName(input.name),
      protocol: input.protocol,
      requiresApiKey: input.requiresApiKey,
      updatedAt: now,
    };
    this.settings.createCustom(record);
    this.models.setProvider(createCustomProvider(record));
    const provider = (await this.list()).find((item) => item.id === record.id);
    if (!provider) throw new ProviderServiceError(ProviderErrorCode.NOT_FOUND, "Provider 创建失败");
    return provider;
  }

  public async updateProvider(providerId: string, input: UpdateProviderDto): Promise<ProviderVo> {
    const custom = this.settings.findCustom(providerId);
    if (!custom) {
      if (!this.builtInIds.has(providerId)) this.throwNotFound();
      const keys = Object.keys(input);
      if (keys.some((key) => key !== "enabled")) {
        throw new ProviderServiceError(
          ProviderErrorCode.BUILT_IN_READ_ONLY,
          "内置 Provider 只能修改启用状态",
        );
      }
      if (input.enabled !== undefined) {
        this.settings.setBuiltInEnabled(providerId, input.enabled, Date.now());
      }
    } else {
      const next: CustomProviderRecord = {
        ...custom,
        baseUrl: input.baseUrl === undefined ? custom.baseUrl : validateBaseUrl(input.baseUrl),
        enabled: input.enabled ?? custom.enabled,
        modelIds:
          input.modelIds === undefined ? custom.modelIds : normalizeModelIds(input.modelIds),
        name: input.name === undefined ? custom.name : normalizeName(input.name),
        protocol: input.protocol ?? custom.protocol,
        requiresApiKey: input.requiresApiKey ?? custom.requiresApiKey,
        updatedAt: Date.now(),
      };
      this.settings.updateCustom(next);
      this.models.setProvider(createCustomProvider(next));
    }

    const provider = (await this.list()).find((item) => item.id === providerId);
    if (!provider) this.throwNotFound();
    return provider;
  }

  public async deleteProvider(providerId: string): Promise<void> {
    if (this.builtInIds.has(providerId)) {
      throw new ProviderServiceError(
        ProviderErrorCode.BUILT_IN_READ_ONLY,
        "内置 Provider 不能删除",
      );
    }
    if (!this.settings.findCustom(providerId)) this.throwNotFound();
    await this.credentials.delete(providerId);
    this.settings.deleteCustom(providerId);
    this.models.deleteProvider(providerId);
  }

  public async saveApiKey(providerId: string, apiKey: string): Promise<void> {
    const provider = this.models.getProvider(providerId);
    if (!provider) this.throwNotFound();
    if (!provider.auth.apiKey) {
      throw new ProviderServiceError(
        ProviderErrorCode.INVALID_CONFIG,
        "该 Provider 不支持 API Key",
      );
    }
    const key = apiKey.trim();
    if (!key) {
      throw new ProviderServiceError(ProviderErrorCode.INVALID_CONFIG, "API Key 不能为空");
    }
    await this.cancelOAuth(providerId);
    await this.credentials.modify(providerId, async () => ({ type: "api_key", key }));
  }

  public async deleteCredential(providerId: string): Promise<void> {
    if (!this.models.getProvider(providerId)) this.throwNotFound();
    await this.cancelOAuth(providerId);
    await this.models.logout(providerId);
  }

  public startOAuth(providerId: string): ProviderOAuthStateVo {
    const provider = this.models.getProvider(providerId);
    if (!provider) this.throwNotFound();
    if (!provider.auth.oauth) {
      throw new ProviderServiceError(
        ProviderErrorCode.OAUTH_NOT_SUPPORTED,
        "该 Provider 不支持 OAuth 登录",
      );
    }

    const current = this.oauthSessions.get(providerId);
    if (
      current?.state.status === ProviderOAuthStatus.STARTING ||
      current?.state.status === ProviderOAuthStatus.AWAITING_USER
    ) {
      return current.state;
    }

    const controller = new AbortController();
    const session: ProviderOAuthSession = {
      controller,
      signal: AbortSignal.any([controller.signal, AbortSignal.timeout(OAUTH_LOGIN_TIMEOUT_MS)]),
      state: {
        message: "正在准备 OAuth 登录…",
        providerId,
        status: ProviderOAuthStatus.STARTING,
      },
      task: Promise.resolve(),
    };
    this.oauthSessions.set(providerId, session);
    session.task = this.runOAuth(providerId, session);
    return session.state;
  }

  public getOAuthState(providerId: string): ProviderOAuthStateVo {
    const session = this.oauthSessions.get(providerId);
    if (!session) {
      throw new ProviderServiceError(ProviderErrorCode.OAUTH_NOT_STARTED, "OAuth 登录尚未开始");
    }
    return session.state;
  }

  public async cancelOAuth(providerId: string): Promise<void> {
    const session = this.oauthSessions.get(providerId);
    if (!session) return;
    session.controller.abort();
    await session.task;
    if (this.oauthSessions.get(providerId) === session) this.oauthSessions.delete(providerId);
  }

  public async close(): Promise<void> {
    const sessions = [...this.oauthSessions.values()];
    for (const session of sessions) session.controller.abort();
    await Promise.all(sessions.map((session) => session.task));
    this.oauthSessions.clear();
  }

  public async testConnection(
    providerId: string,
    modelIdInput: string,
    apiKeyInput?: string,
  ): Promise<void> {
    if (!this.models.getProvider(providerId)) this.throwNotFound();
    const modelId = modelIdInput.trim();
    const model = this.models.getModel(providerId, modelId);
    if (!model) {
      throw new ProviderServiceError(ProviderErrorCode.MODEL_NOT_FOUND, "模型不存在");
    }
    const apiKey = apiKeyInput?.trim() || undefined;
    if (apiKey === undefined && !(await this.models.checkAuth(providerId))) {
      throw new ProviderServiceError(ProviderErrorCode.INVALID_CONFIG, "请先配置 Provider 凭据");
    }

    await testFirstResponseChunk(this.models, model, apiKey);
  }

  public async testCustomConnection(input: CustomProviderConnectionTestDto): Promise<void> {
    const apiKey = input.apiKey?.trim() || undefined;
    if (input.requiresApiKey && apiKey === undefined) {
      throw new ProviderServiceError(ProviderErrorCode.INVALID_CONFIG, "请先填写 API Key");
    }

    const now = Date.now();
    const record: CustomProviderRecord = {
      baseUrl: validateBaseUrl(input.baseUrl),
      createdAt: now,
      enabled: true,
      id: "custom:connection-test",
      modelIds: normalizeModelIds([input.modelId]),
      name: "Connection test",
      protocol: input.protocol,
      requiresApiKey: input.requiresApiKey,
      updatedAt: now,
    };
    const models = createHarnessModels([createCustomProvider(record)]);
    const model = models.getModel(record.id, input.modelId.trim());
    if (!model) {
      throw new ProviderServiceError(ProviderErrorCode.MODEL_NOT_FOUND, "模型不存在");
    }
    await testFirstResponseChunk(models, model, apiKey);
  }

  private async runOAuth(providerId: string, session: ProviderOAuthSession): Promise<void> {
    try {
      await this.models.login(providerId, "oauth", {
        signal: session.signal,
        notify: (event) => {
          if (this.oauthSessions.get(providerId) !== session) return;
          if (event.type === "auth_url") {
            session.state = {
              authorizationUrl: readOAuthAuthorizationUrl(event.url),
              message: "请在浏览器中完成授权",
              providerId,
              status: ProviderOAuthStatus.AWAITING_USER,
              userCode: null,
            };
            return;
          }
          if (event.type === "device_code") {
            session.state = {
              authorizationUrl: readOAuthAuthorizationUrl(event.verificationUri),
              message: "请打开授权页面并输入设备码",
              providerId,
              status: ProviderOAuthStatus.AWAITING_USER,
              userCode: event.userCode,
            };
            return;
          }
          session.state =
            session.state.status === ProviderOAuthStatus.AWAITING_USER
              ? { ...session.state, message: "正在完成 OAuth 登录…" }
              : {
                  message: "正在准备 OAuth 登录…",
                  providerId,
                  status: ProviderOAuthStatus.STARTING,
                };
        },
        prompt: (prompt) =>
          new Promise<string>((_resolve, reject) => {
            const cancel = () => reject(new Error("OAuth login cancelled"));
            if (session.signal.aborted || prompt.signal?.aborted) {
              cancel();
              return;
            }
            session.signal.addEventListener("abort", cancel, { once: true });
            prompt.signal?.addEventListener("abort", cancel, { once: true });
          }),
      });
      session.state = {
        message: "OAuth 登录成功",
        providerId,
        status: ProviderOAuthStatus.COMPLETED,
      };
    } catch {
      session.state = {
        message: session.controller.signal.aborted
          ? "OAuth 登录已取消"
          : session.signal.aborted
            ? "OAuth 登录已超时，请重试"
            : "OAuth 登录失败，请重试",
        providerId,
        status: ProviderOAuthStatus.FAILED,
      };
    } finally {
      session.controller.abort();
    }
  }

  private throwNotFound(): never {
    throw new ProviderServiceError(ProviderErrorCode.NOT_FOUND, "Provider 不存在");
  }
}
