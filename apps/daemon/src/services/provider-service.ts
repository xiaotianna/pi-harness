import { randomUUID } from "node:crypto";
import {
  type Api,
  type AuthPrompt,
  anthropicMessagesApi,
  BUILT_IN_PROVIDER_IDS,
  type CredentialStore,
  createHarnessModels,
  createProvider,
  envApiKeyAuth,
  getSupportedThinkingLevels,
  loadBuiltInProvider,
  type Model,
  type MutableModels,
  openAICompletionsApi,
  openAIResponsesApi,
  type Provider,
} from "@pi-harness/providers";
import { isPlainObject } from "es-toolkit";
import {
  type CreateProviderDto,
  type CustomProviderConnectionTestDto,
  CustomProviderProtocol,
  type UpdateProviderDto,
} from "../dto/provider-dto.js";
import {
  type CustomProviderModelRecord,
  type CustomProviderRecord,
  DEFAULT_CUSTOM_MODEL_CONTEXT_WINDOW,
  DEFAULT_CUSTOM_MODEL_MAX_TOKENS,
  type ProviderSettingRepository,
} from "../storage/database.js";
import {
  type ProviderOAuthStateVo,
  ProviderOAuthStatus,
  type ProviderVo,
} from "../vo/provider-vo.js";

const ProviderErrorCode = {
  BUILT_IN_READ_ONLY: "BUILT_IN_PROVIDER_READ_ONLY",
  CONNECTION_FAILED: "PROVIDER_CONNECTION_FAILED",
  DISABLED: "PROVIDER_DISABLED",
  IN_USE: "PROVIDER_IN_USE",
  INVALID_CONFIG: "INVALID_PROVIDER_CONFIG",
  MODEL_NOT_FOUND: "PROVIDER_MODEL_NOT_FOUND",
  NOT_FOUND: "PROVIDER_NOT_FOUND",
  NOT_CONFIGURED: "PROVIDER_NOT_CONFIGURED",
  OAUTH_NOT_STARTED: "PROVIDER_OAUTH_NOT_STARTED",
  OAUTH_PROMPT_NOT_FOUND: "PROVIDER_OAUTH_PROMPT_NOT_FOUND",
  OAUTH_NOT_SUPPORTED: "PROVIDER_OAUTH_NOT_SUPPORTED",
} as const;

export interface ResolvedRunModel {
  model: Model<Api>;
  streamFn: MutableModels["streamSimple"];
}

const CONNECTION_TEST_TIMEOUT_MS = 15_000;
const MAX_PROVIDER_ERROR_DETAIL_LENGTH = 300;
const OAUTH_LOGIN_TIMEOUT_MS = 15 * 60 * 1_000;

interface ProviderOAuthSession {
  readonly controller: AbortController;
  readonly signal: AbortSignal;
  pendingPrompt: ProviderOAuthPromptWaiter | null;
  state: ProviderOAuthStateVo;
  task: Promise<void>;
}

interface ProviderOAuthPromptWaiter {
  readonly answer: (value: string) => void;
  readonly cancel: () => void;
  readonly id: string;
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

function normalizeModels(
  values: readonly CustomProviderModelRecord[],
): readonly CustomProviderModelRecord[] {
  const models = new Map<string, CustomProviderModelRecord>();
  for (const value of values) {
    const id = value.id.trim();
    if (!id) continue;
    if (value.maxTokens > value.contextWindow) {
      throw new ProviderServiceError(
        ProviderErrorCode.INVALID_CONFIG,
        `模型 ${id} 的最大输出不能超过上下文窗口`,
      );
    }
    models.set(id, { ...value, id });
  }
  return [...models.values()];
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

function sanitizeProviderErrorDetail(value: string): string {
  return value
    .replace(/\s+/g, " ")
    .replace(/\bBearer\s+\S+/gi, "Bearer [已隐藏]")
    .replace(/\b(?:sk|pk)-[A-Za-z0-9._-]{8,}\b/g, "[已隐藏]")
    .replace(
      /((?:api[_ -]?key|access[_ -]?token|refresh[_ -]?token|authorization|cookie)\s*[:=]\s*)\S+/gi,
      "$1[已隐藏]",
    )
    .trim()
    .slice(0, MAX_PROVIDER_ERROR_DETAIL_LENGTH);
}

function readProviderResponseError(
  message: string,
): { detail: string | null; status: number } | null {
  const match = /^(\d{3})\s+([\s\S]+)$/.exec(message.trim());
  const statusText = match?.[1];
  const bodyText = match?.[2];
  if (!statusText || !bodyText) return null;

  const status = Number(statusText);
  if (!Number.isInteger(status) || status < 400 || status > 599) return null;

  let detail: string | null = null;
  try {
    const body = JSON.parse(bodyText) as unknown;
    if (
      isPlainObject(body) &&
      isPlainObject(body.error) &&
      typeof body.error.message === "string"
    ) {
      detail = sanitizeProviderErrorDetail(body.error.message);
    }
  } catch {
    // 非 JSON 响应不直接暴露，避免把上游返回的未知内容发送到 Web。
  }

  return { detail: detail || null, status };
}

function formatConnectionFailure(error: unknown): string {
  const message = error instanceof Error ? error.message : "";
  const responseError = readProviderResponseError(message);
  if (responseError) {
    const detail = responseError.detail ? `：${responseError.detail}` : "";
    switch (responseError.status) {
      case 401:
        return `凭据无效或当前账号无权访问该模型（HTTP 401）${detail}`;
      case 402:
        return `当前账号的会员权益或计费状态不可用（HTTP 402）${detail}`;
      case 403:
        return `当前账号没有访问该模型的权限（HTTP 403）${detail}`;
      case 404:
        return `模型或 Provider 服务地址不存在（HTTP 404）${detail}`;
      case 429:
        return `请求过于频繁或当前额度已用尽（HTTP 429）${detail}`;
      default:
        return `Provider 请求失败（HTTP ${responseError.status}）${detail}`;
    }
  }

  if (/connection error|fetch failed|network/i.test(message)) {
    return "无法连接 Provider，请检查网络和服务地址";
  }
  return "连接测试失败，请检查凭据、模型 ID 和服务地址";
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
  const models: readonly Model<CustomProviderProtocol>[] = record.models.map((model) => ({
    api: protocol,
    baseUrl: record.baseUrl,
    contextWindow: model.contextWindow,
    cost: { cacheRead: 0, cacheWrite: 0, input: 0, output: 0 },
    id: model.id,
    input: ["text"],
    maxTokens: model.maxTokens,
    name: model.id,
    provider: record.id,
    reasoning: model.reasoning,
  }));

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
      if (event.type === "error") {
        throw new Error(event.error.errorMessage ?? "Provider 请求失败");
      }
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
  } catch (error: unknown) {
    if (receivedResponse) return;
    throw new ProviderServiceError(
      ProviderErrorCode.CONNECTION_FAILED,
      timeoutSignal.aborted ? "连接测试超时" : formatConnectionFailure(error),
    );
  } finally {
    controller.abort();
  }
}

export class ProviderService {
  private readonly builtInIds = new Set(BUILT_IN_PROVIDER_IDS);
  private readonly mutatingProviderIds = new Set<string>();
  private readonly oauthSessions = new Map<string, ProviderOAuthSession>();

  private constructor(
    private readonly settings: ProviderSettingRepository,
    private readonly credentials: CredentialStore,
    private readonly models: MutableModels,
    private readonly isProviderInUse: (providerId: string) => boolean,
  ) {}

  public static async create(
    settings: ProviderSettingRepository,
    credentials: CredentialStore,
    isProviderInUse: (providerId: string) => boolean = () => false,
  ): Promise<ProviderService> {
    const builtIns = await Promise.all(BUILT_IN_PROVIDER_IDS.map(loadBuiltInProvider));
    const custom = settings.listCustom().map(createCustomProvider);
    return new ProviderService(
      settings,
      credentials,
      createHarnessModels([...builtIns, ...custom], credentials),
      isProviderInUse,
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
          models: provider.getModels().map((model) => ({
            contextWindow: model.contextWindow,
            id: model.id,
            maxTokens: model.maxTokens,
            name: model.name,
            reasoning: model.reasoning,
            thinkingLevels: getSupportedThinkingLevels(model),
          })),
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
      models: normalizeModels(input.models),
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
    this.assertProviderNotInUse(providerId);
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
        models: input.models === undefined ? custom.models : normalizeModels(input.models),
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
    this.assertProviderNotInUse(providerId);
    await this.withProviderMutation(providerId, async () => {
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
    });
  }

  public async saveApiKey(providerId: string, apiKey: string): Promise<void> {
    this.assertProviderNotInUse(providerId);
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
    await this.withProviderMutation(providerId, async () => {
      await this.cancelOAuth(providerId);
      await this.credentials.modify(providerId, async () => ({ type: "api_key", key }));
    });
  }

  public async deleteCredential(providerId: string): Promise<void> {
    this.assertProviderNotInUse(providerId);
    if (!this.models.getProvider(providerId)) this.throwNotFound();
    await this.withProviderMutation(providerId, async () => {
      await this.cancelOAuth(providerId);
      await this.models.logout(providerId);
    });
  }

  public startOAuth(providerId: string): ProviderOAuthStateVo {
    this.assertProviderNotInUse(providerId);
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
      current?.state.status === ProviderOAuthStatus.AWAITING_INPUT ||
      current?.state.status === ProviderOAuthStatus.AWAITING_USER
    ) {
      return current.state;
    }

    const controller = new AbortController();
    const session: ProviderOAuthSession = {
      controller,
      pendingPrompt: null,
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

  public answerOAuthPrompt(providerId: string, promptId: string, value: string): void {
    const session = this.oauthSessions.get(providerId);
    if (!session) {
      throw new ProviderServiceError(ProviderErrorCode.OAUTH_NOT_STARTED, "OAuth 登录尚未开始");
    }
    const pendingPrompt = session.pendingPrompt;
    if (!pendingPrompt || pendingPrompt.id !== promptId) {
      throw new ProviderServiceError(
        ProviderErrorCode.OAUTH_PROMPT_NOT_FOUND,
        "OAuth 输入请求已失效，请按当前界面重试",
      );
    }

    session.state = {
      message: "正在继续 OAuth 登录…",
      providerId,
      status: ProviderOAuthStatus.STARTING,
    };
    pendingPrompt.answer(value);
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
      models: normalizeModels([
        {
          contextWindow: DEFAULT_CUSTOM_MODEL_CONTEXT_WINDOW,
          id: input.modelId,
          maxTokens: DEFAULT_CUSTOM_MODEL_MAX_TOKENS,
          reasoning: false,
        },
      ]),
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

  /** 为新 run 解析模型与流函数；认证材料始终留在 Models/CredentialStore 内。 */
  public async resolveRunModel(providerId: string, modelId: string): Promise<ResolvedRunModel> {
    if (this.mutatingProviderIds.has(providerId) || this.isOAuthActive(providerId)) {
      throw new ProviderServiceError(
        ProviderErrorCode.IN_USE,
        "Provider 正在更新认证状态，请稍后重试",
      );
    }
    const provider = this.models.getProvider(providerId);
    if (!provider) this.throwNotFound();

    const custom = this.settings.findCustom(providerId);
    const enabled = custom?.enabled ?? this.settings.listBuiltInEnabled().get(providerId) ?? true;
    if (!enabled) {
      throw new ProviderServiceError(ProviderErrorCode.DISABLED, "Provider 已停用");
    }

    const model = this.models.getModel(providerId, modelId);
    if (!model) {
      throw new ProviderServiceError(ProviderErrorCode.MODEL_NOT_FOUND, "模型不存在");
    }
    if (!(await this.models.checkAuth(providerId))) {
      throw new ProviderServiceError(ProviderErrorCode.NOT_CONFIGURED, "请先配置 Provider 凭据");
    }

    return {
      model,
      streamFn: this.models.streamSimple.bind(this.models),
    };
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
              : session.state.status === ProviderOAuthStatus.AWAITING_INPUT
                ? session.state
                : {
                    message: "正在准备 OAuth 登录…",
                    providerId,
                    status: ProviderOAuthStatus.STARTING,
                  };
        },
        prompt: (prompt) => this.requestOAuthPrompt(providerId, session, prompt),
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

  private assertProviderNotInUse(providerId: string): void {
    if (this.isProviderInUse(providerId) || this.mutatingProviderIds.has(providerId)) {
      throw new ProviderServiceError(
        ProviderErrorCode.IN_USE,
        "Provider 正被活动会话使用，请等待运行结束后重试",
      );
    }
  }

  private isOAuthActive(providerId: string): boolean {
    const status = this.oauthSessions.get(providerId)?.state.status;
    return (
      status === ProviderOAuthStatus.STARTING ||
      status === ProviderOAuthStatus.AWAITING_INPUT ||
      status === ProviderOAuthStatus.AWAITING_USER
    );
  }

  private async withProviderMutation<T>(
    providerId: string,
    operation: () => Promise<T>,
  ): Promise<T> {
    if (this.mutatingProviderIds.has(providerId)) {
      throw new ProviderServiceError(ProviderErrorCode.IN_USE, "Provider 正在更新，请稍后重试");
    }
    this.mutatingProviderIds.add(providerId);
    try {
      return await operation();
    } finally {
      this.mutatingProviderIds.delete(providerId);
    }
  }

  private requestOAuthPrompt(
    providerId: string,
    session: ProviderOAuthSession,
    prompt: AuthPrompt,
  ): Promise<string> {
    if (session.pendingPrompt) {
      throw new ProviderServiceError(
        ProviderErrorCode.INVALID_CONFIG,
        "OAuth 登录同时请求了多个输入",
      );
    }

    const promptId = randomUUID();
    const previousState = session.state;
    const authorizationUrl =
      previousState.status === ProviderOAuthStatus.AWAITING_USER ||
      previousState.status === ProviderOAuthStatus.AWAITING_INPUT
        ? previousState.authorizationUrl
        : null;
    const userCode =
      previousState.status === ProviderOAuthStatus.AWAITING_USER ||
      previousState.status === ProviderOAuthStatus.AWAITING_INPUT
        ? previousState.userCode
        : null;

    session.state = {
      authorizationUrl,
      message: prompt.message,
      options:
        prompt.type === "select"
          ? prompt.options.map((option) => ({
              description: option.description ?? null,
              id: option.id,
              label: option.label,
            }))
          : [],
      placeholder: prompt.type === "select" ? null : (prompt.placeholder ?? null),
      promptId,
      promptType: prompt.type,
      providerId,
      status: ProviderOAuthStatus.AWAITING_INPUT,
      userCode,
    };

    return new Promise<string>((resolve, reject) => {
      let isSettled = false;
      const cleanup = () => {
        session.signal.removeEventListener("abort", cancel);
        prompt.signal?.removeEventListener("abort", cancel);
      };
      const settle = (callback: () => void) => {
        if (isSettled) return;
        isSettled = true;
        cleanup();
        if (session.pendingPrompt?.id === promptId) session.pendingPrompt = null;
        callback();
      };
      const answer = (value: string) => settle(() => resolve(value));
      const cancel = () => settle(() => reject(new Error("OAuth login cancelled")));

      session.pendingPrompt = { answer, cancel, id: promptId };
      if (session.signal.aborted || prompt.signal?.aborted) {
        cancel();
        return;
      }
      session.signal.addEventListener("abort", cancel, { once: true });
      prompt.signal?.addEventListener("abort", cancel, { once: true });
    });
  }

  private throwNotFound(): never {
    throw new ProviderServiceError(ProviderErrorCode.NOT_FOUND, "Provider 不存在");
  }
}
