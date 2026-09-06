import { createHash, randomBytes } from "node:crypto";
import { AVAILABLE_PLUGINS, type PluginDefinition, SkillType } from "@pi-harness/tools";
import { isPlainObject } from "es-toolkit";
import type { AppSettingRepository } from "../storage/database.js";
import type {
  SkillCredentialStore,
  SkillOAuthCredential,
} from "../storage/skill-credential-store.js";

const REQUEST_TIMEOUT_MS = 10_000;
const OAUTH_REQUEST_TTL_MS = 10 * 60_000;
const MAX_GATEWAY_RESPONSE_BYTES = 5 * 1024 * 1024;
const LOCAL_OAUTH_CLIENT_ID = "pi-harness-local";
const LOCAL_OAUTH_CLIENT_SECRET = "pi-harness-local-secret";

export const SkillConnectionErrorCode = {
  BAD_GATEWAY_PATH: "SKILL_GATEWAY_PATH_INVALID",
  COLLECTION_NOT_FOUND: "SKILL_COLLECTION_NOT_FOUND",
  NOT_CONNECTED: "SKILL_CONNECTION_REQUIRED",
  NOT_INSTALLED: "SKILL_COLLECTION_NOT_INSTALLED",
  SKILL_NOT_FOUND: "SKILL_NOT_FOUND",
  OAUTH_FAILED: "SKILL_OAUTH_FAILED",
  OAUTH_STATE_INVALID: "SKILL_OAUTH_STATE_INVALID",
  UPSTREAM_FAILED: "SKILL_GATEWAY_UPSTREAM_FAILED",
} as const;

export type SkillConnectionErrorCode =
  (typeof SkillConnectionErrorCode)[keyof typeof SkillConnectionErrorCode];

export class SkillConnectionError extends Error {
  public constructor(
    public readonly code: SkillConnectionErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "SkillConnectionError";
  }
}

export interface SkillConnectionStatus {
  account: {
    avatarUrl: string | null;
    displayName: string | null;
    id: string;
    username: string;
  } | null;
  collectionId: string;
  isConnected: boolean;
}

export interface SkillGatewayResponse {
  body: Buffer;
  contentType: string;
  statusCode: number;
}

interface PendingOAuthRequest {
  collectionId: string;
  codeVerifier: string;
  expiresAt: number;
}

type OAuthPluginDefinition = PluginDefinition & {
  oauth: NonNullable<PluginDefinition["oauth"]>;
};

function findPlugin(collectionId: string) {
  return AVAILABLE_PLUGINS.find(({ id }) => id === collectionId);
}

function findPluginSkill(collectionId: string, skillId: string) {
  return findPlugin(collectionId)?.skills.find(
    (skill) =>
      skill.id === skillId ||
      `plugin:${collectionId}:${skill.id}` === skillId ||
      `system:${skill.id}` === skillId,
  );
}

function registeredSkillId(collectionId: string, skillId: string): string {
  return `plugin:${collectionId}:${skillId}`;
}

function randomValue(): string {
  return randomBytes(32).toString("base64url");
}

async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    throw new SkillConnectionError(
      SkillConnectionErrorCode.UPSTREAM_FAILED,
      "OAuth 服务返回了无效响应",
    );
  }
}

function readField(input: unknown, path: string): unknown {
  let value = input;
  for (const segment of path.split(".")) {
    if (!isPlainObject(value)) return undefined;
    value = value[segment];
  }
  return value;
}

function readRequiredField(input: unknown, path: string): string {
  const value = readField(input, path);
  if ((typeof value !== "string" && typeof value !== "number") || String(value).length === 0) {
    throw new SkillConnectionError(
      SkillConnectionErrorCode.OAUTH_FAILED,
      `OAuth 账户响应缺少 ${path}`,
    );
  }
  return String(value);
}

function readOptionalField(input: unknown, path: string | undefined): string | null {
  if (!path) return null;
  const value = readField(input, path);
  return typeof value === "string" && value.length > 0 ? value : null;
}

function readOptionalUrl(input: unknown, path: string | undefined): string | null {
  const value = readOptionalField(input, path);
  if (!value) return null;
  try {
    return new URL(value).toString();
  } catch {
    return null;
  }
}

function decodeJwtPayload(tokenBody: unknown): unknown {
  const token = readRequiredField(tokenBody, "id_token");
  const payload = token.split(".")[1];
  if (!payload) {
    throw new SkillConnectionError(SkillConnectionErrorCode.OAUTH_FAILED, "OAuth ID token 无效");
  }
  try {
    return JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as unknown;
  } catch {
    throw new SkillConnectionError(SkillConnectionErrorCode.OAUTH_FAILED, "OAuth ID token 无效");
  }
}

function isAllowedPluginRequest(collectionId: string, target: URL): boolean {
  const { pathname, searchParams } = target;
  if (collectionId === "github") {
    return (
      /^\/user(?:\/repos)?\/?$/.test(pathname) ||
      /^\/users\/[^/]+(?:\/repos)?\/?$/.test(pathname) ||
      /^\/search\/(?:repositories|issues|users|code|commits|topics|labels)\/?$/.test(pathname) ||
      /^\/repos\/[^/]+\/[^/]+(?:\/.*)?$/.test(pathname)
    );
  }
  if (collectionId === "vercel") {
    return (
      (/^\/v2\/(?:user|teams(?:\/[^/]+(?:\/members)?)?)\/?$/.test(pathname) ||
        /^\/v10\/projects\/?$/.test(pathname) ||
        /^\/v9\/projects\/[^/]+(?:\/domains(?:\/[^/]+)?)?\/?$/.test(pathname) ||
        /^\/v10\/projects\/[^/]+\/env(?:\/[^/]+)?\/?$/.test(pathname) ||
        /^\/v(?:2|3|6|13)\/deployments(?:\/[^/]+(?:\/(?:aliases|events|files))?)?\/?$/.test(
          pathname,
        )) &&
      searchParams.get("decrypt") !== "true"
    );
  }
  if (collectionId === "google") {
    return (
      /^\/drive\/v3\/files(?:\/[^/]+)?\/?$/.test(pathname) ||
      /^\/calendar\/v3\/users\/[^/]+\/calendarList\/?$/.test(pathname) ||
      /^\/calendar\/v3\/calendars\/[^/]+\/events\/?$/.test(pathname)
    );
  }
  if (collectionId === "slack") {
    return /^\/api\/(?:auth\.test|conversations\.(?:list|info|history|replies|members)|users\.(?:list|info|lookupByEmail|profile\.get|getPresence)|reactions\.get|files\.(?:info|list)|pins\.list|bookmarks\.list|team\.info)\/?$/.test(
      pathname,
    );
  }
  if (collectionId === "apple") {
    return pathname === "/.well-known/openid-configuration" || pathname === "/auth/keys";
  }
  if (collectionId === "microsoft") {
    return (
      pathname === "/.well-known/openid-configuration" ||
      pathname === "/discovery/v2.0/keys" ||
      pathname === "/oidc/userinfo" ||
      pathname === "/v1.0/me"
    );
  }
  if (collectionId === "aws") {
    if (pathname === "/" || /^\/[^/]+(?:\/.*)?$/.test(pathname)) {
      if (!/^\/(?:sqs|iam|sts)\/?$/.test(pathname)) return true;
    }
    const allowedActions = {
      "/iam/": new Set(["GetRole", "GetUser", "ListAccessKeys", "ListRoles", "ListUsers"]),
      "/sqs/": new Set(["GetQueueAttributes", "GetQueueUrl", "ListQueues"]),
      "/sts/": new Set(["GetCallerIdentity"]),
    } as const;
    return (
      allowedActions[pathname as keyof typeof allowedActions]?.has(
        searchParams.get("Action") ?? "",
      ) === true
    );
  }
  return false;
}

export class SkillConnectionService {
  private readonly pendingOAuthRequests = new Map<string, PendingOAuthRequest>();

  public constructor(
    private readonly credentials: SkillCredentialStore,
    private readonly settings: AppSettingRepository,
    private readonly skillGatewayUrl: string,
  ) {}

  public isInstalled(collectionId: string): boolean {
    return this.settings.getInstalledSkillCollectionIds().includes(collectionId);
  }

  public install(collectionId: string): void {
    this.requirePlugin(collectionId);
    const installed = new Set(this.settings.getInstalledSkillCollectionIds());
    installed.add(collectionId);
    this.settings.setInstalledSkillCollectionIds([...installed].sort(), Date.now());
  }

  public isSkillEnabled(collectionId: string, skillId: string): boolean {
    const skill = findPluginSkill(collectionId, skillId);
    if (!skill) return false;
    const disabled = this.settings.getDisabledSkillCollectionSkillIds();
    return (
      !disabled.includes(registeredSkillId(collectionId, skill.id)) &&
      !disabled.includes(`system:${skill.id}`)
    );
  }

  public getSkillContent(collectionId: string, skillId: string): string {
    const skill = findPluginSkill(collectionId, skillId);
    if (!skill) {
      throw new SkillConnectionError(
        SkillConnectionErrorCode.SKILL_NOT_FOUND,
        "插件中不存在该 Skill",
      );
    }
    return skill.instructions.replaceAll("{skillGatewayUrl}", this.skillGatewayUrl);
  }

  public setSkillEnabled(collectionId: string, skillId: string, isEnabled: boolean): void {
    this.requireInstalled(collectionId);
    const skill = findPluginSkill(collectionId, skillId);
    if (!skill) {
      throw new SkillConnectionError(
        SkillConnectionErrorCode.SKILL_NOT_FOUND,
        "插件中不存在该 Skill",
      );
    }

    const disabled = new Set(this.settings.getDisabledSkillCollectionSkillIds());
    const id = registeredSkillId(collectionId, skill.id);
    disabled.delete(`system:${skill.id}`);
    if (isEnabled) disabled.delete(id);
    else disabled.add(id);
    this.settings.setDisabledSkillCollectionSkillIds([...disabled].sort(), Date.now());
  }

  public async uninstall(collectionId: string): Promise<void> {
    const plugin = this.requirePlugin(collectionId);
    await this.credentials.delete(collectionId);
    const collectionSkillIds = new Set<string>(
      plugin.skills.flatMap(({ id }) => [registeredSkillId(collectionId, id), `system:${id}`]),
    );
    this.settings.setDisabledSkillCollectionSkillIds(
      this.settings
        .getDisabledSkillCollectionSkillIds()
        .filter((skillId) => !collectionSkillIds.has(skillId)),
      Date.now(),
    );
    const installed = new Set(this.settings.getInstalledSkillCollectionIds());
    installed.delete(collectionId);
    this.settings.setInstalledSkillCollectionIds([...installed].sort(), Date.now());
  }

  public createAuthorizationUrl(collectionId: string): string {
    const plugin = this.requireOAuthPlugin(collectionId);
    this.requireInstalled(collectionId);
    const state = randomValue();
    const codeVerifier = randomValue();
    const codeChallenge = createHash("sha256").update(codeVerifier).digest("base64url");
    this.pendingOAuthRequests.set(state, {
      collectionId,
      codeVerifier,
      expiresAt: Date.now() + OAUTH_REQUEST_TTL_MS,
    });

    const client = this.oauthClient(collectionId);
    const authorizationUrl = new URL(plugin.oauth.authorizationPath, `${this.apiUrl(plugin)}/`);
    authorizationUrl.searchParams.set("client_id", client.clientId);
    authorizationUrl.searchParams.set("redirect_uri", client.callbackUrl);
    authorizationUrl.searchParams.set("response_type", "code");
    if (plugin.oauth.scopes.length > 0) {
      authorizationUrl.searchParams.set("scope", plugin.oauth.scopes.join(" "));
    }
    authorizationUrl.searchParams.set("state", state);
    authorizationUrl.searchParams.set("code_challenge", codeChallenge);
    authorizationUrl.searchParams.set("code_challenge_method", "S256");
    return authorizationUrl.toString();
  }

  public async completeAuthorization(
    collectionId: string,
    code: string,
    state: string,
  ): Promise<void> {
    const pending = this.pendingOAuthRequests.get(state);
    this.pendingOAuthRequests.delete(state);
    if (!pending || pending.collectionId !== collectionId || pending.expiresAt < Date.now()) {
      throw new SkillConnectionError(
        SkillConnectionErrorCode.OAUTH_STATE_INVALID,
        "OAuth 请求已失效，请重新连接",
      );
    }
    const plugin = this.requireOAuthPlugin(collectionId);
    this.requireInstalled(collectionId);

    const tokenBody = await this.exchangeCode(plugin, code, pending.codeVerifier);
    const accessToken = readRequiredField(tokenBody, "access_token");
    const account = await this.fetchAccount(plugin, accessToken, tokenBody);
    await this.credentials.set(collectionId, {
      accessToken,
      account,
      connectedAt: Date.now(),
    });
  }

  public getStatus(collectionId: string): SkillConnectionStatus {
    this.requirePlugin(collectionId);
    const credential = this.credentials.read(collectionId);
    return {
      account: credential?.account ?? null,
      collectionId,
      isConnected: credential !== undefined,
    };
  }

  public async disconnect(collectionId: string): Promise<void> {
    this.requirePlugin(collectionId);
    await this.credentials.delete(collectionId);
  }

  public async request(
    collectionId: string,
    path: string,
    search: string,
    signal?: AbortSignal,
  ): Promise<SkillGatewayResponse> {
    const plugin = this.requirePlugin(collectionId);
    this.requireInstalled(collectionId);
    const credential = this.credentials.read(collectionId);
    if (plugin.type === SkillType.OAUTH && !credential) {
      throw new SkillConnectionError(
        SkillConnectionErrorCode.NOT_CONNECTED,
        `请先在插件市场连接 ${plugin.name}`,
      );
    }

    const target = new URL(`/${path.replace(/^\/+/, "")}`, `${this.apiUrl(plugin)}/`);
    target.search = search;
    if (!isAllowedPluginRequest(collectionId, target)) {
      throw new SkillConnectionError(
        SkillConnectionErrorCode.BAD_GATEWAY_PATH,
        `${plugin.name} Skill 只能访问已允许的只读 API 路径`,
      );
    }

    const shouldPostForm =
      collectionId === "slack" ||
      (collectionId === "aws" && /^\/(?:sqs|iam|sts)\/?$/.test(target.pathname));
    const formBody = shouldPostForm ? target.searchParams : undefined;
    if (shouldPostForm) target.search = "";

    let response: Response;
    try {
      response = await fetch(target, {
        ...(formBody === undefined ? {} : { body: formBody, method: "POST" }),
        headers: {
          Accept: collectionId === "github" ? "application/vnd.github+json" : "*/*",
          Authorization: `Bearer ${credential?.accessToken ?? "test_token_admin"}`,
          ...(formBody === undefined
            ? {}
            : { "Content-Type": "application/x-www-form-urlencoded" }),
          "User-Agent": "pi-harness-skill-gateway",
        },
        redirect: "error",
        signal: signal
          ? AbortSignal.any([signal, AbortSignal.timeout(REQUEST_TIMEOUT_MS)])
          : AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
    } catch {
      throw new SkillConnectionError(
        SkillConnectionErrorCode.UPSTREAM_FAILED,
        `${plugin.name} Skill 网关无法连接上游服务`,
      );
    }

    const contentLength = Number(response.headers.get("content-length"));
    if (Number.isFinite(contentLength) && contentLength > MAX_GATEWAY_RESPONSE_BYTES) {
      throw new SkillConnectionError(
        SkillConnectionErrorCode.UPSTREAM_FAILED,
        `${plugin.name} Skill 网关响应过大`,
      );
    }
    const responseBody = Buffer.from(await response.arrayBuffer());
    if (responseBody.byteLength > MAX_GATEWAY_RESPONSE_BYTES) {
      throw new SkillConnectionError(
        SkillConnectionErrorCode.UPSTREAM_FAILED,
        `${plugin.name} Skill 网关响应过大`,
      );
    }
    return {
      body: responseBody,
      contentType: response.headers.get("content-type") ?? "application/json",
      statusCode: response.status,
    };
  }

  private requireInstalled(collectionId: string): void {
    if (this.isInstalled(collectionId)) return;
    throw new SkillConnectionError(
      SkillConnectionErrorCode.NOT_INSTALLED,
      `请先在插件市场安装 ${this.requirePlugin(collectionId).name}`,
    );
  }

  private requirePlugin(collectionId: string) {
    const plugin = findPlugin(collectionId);
    if (plugin) return plugin;
    throw new SkillConnectionError(
      SkillConnectionErrorCode.COLLECTION_NOT_FOUND,
      "插件市场中不存在该插件",
    );
  }

  private requireOAuthPlugin(collectionId: string): OAuthPluginDefinition {
    const plugin = this.requirePlugin(collectionId);
    if (plugin.type === SkillType.OAUTH && plugin.oauth) {
      return { ...plugin, oauth: plugin.oauth };
    }
    throw new SkillConnectionError(
      SkillConnectionErrorCode.OAUTH_FAILED,
      `${plugin.name} 不提供 OAuth 授权`,
    );
  }

  private apiUrl(plugin: PluginDefinition): string {
    return plugin.apiUrl;
  }

  private oauthClient(collectionId: string) {
    const callbackUrl = new URL(
      `/api/skill-connections/${collectionId}/oauth/callback`,
      `${this.skillGatewayUrl}/`,
    ).toString();
    return {
      callbackUrl,
      clientId: LOCAL_OAUTH_CLIENT_ID,
      clientSecret: LOCAL_OAUTH_CLIENT_SECRET,
    };
  }

  private async exchangeCode(
    plugin: OAuthPluginDefinition,
    code: string,
    codeVerifier: string,
  ): Promise<unknown> {
    const client = this.oauthClient(plugin.id);
    const response = await fetch(new URL(plugin.oauth.tokenPath, `${this.apiUrl(plugin)}/`), {
      body: new URLSearchParams({
        client_id: client.clientId,
        client_secret: client.clientSecret,
        code,
        code_verifier: codeVerifier,
        grant_type: "authorization_code",
        redirect_uri: client.callbackUrl,
      }),
      headers: {
        Accept: "application/json",
        "Content-Type": "application/x-www-form-urlencoded",
      },
      method: "POST",
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    const body = await readJson(response);
    if (!response.ok || !isPlainObject(body) || typeof body.access_token !== "string") {
      throw new SkillConnectionError(
        SkillConnectionErrorCode.OAUTH_FAILED,
        `${plugin.name} OAuth token 交换失败`,
      );
    }
    return body;
  }

  private async fetchAccount(
    plugin: OAuthPluginDefinition,
    accessToken: string,
    tokenBody: unknown,
  ): Promise<SkillOAuthCredential["account"]> {
    const { profile } = plugin.oauth;
    let body = profile.source === "id-token" ? decodeJwtPayload(tokenBody) : tokenBody;
    if (profile.source === "userinfo") {
      if (!profile.path) {
        throw new SkillConnectionError(
          SkillConnectionErrorCode.OAUTH_FAILED,
          `${plugin.name} OAuth 账户接口未配置`,
        );
      }
      const response = await fetch(new URL(profile.path, `${this.apiUrl(plugin)}/`), {
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${accessToken}`,
          "User-Agent": "pi-harness-skill-gateway",
        },
        method: profile.method ?? "GET",
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
      body = await readJson(response);
      if (!response.ok) {
        throw new SkillConnectionError(
          SkillConnectionErrorCode.OAUTH_FAILED,
          `${plugin.name} OAuth 账户校验失败`,
        );
      }
    }
    return {
      avatarUrl: readOptionalUrl(body, profile.avatarUrlField),
      displayName: readOptionalField(body, profile.displayNameField),
      id: readRequiredField(body, profile.idField),
      username: readRequiredField(body, profile.usernameField),
    };
  }
}
