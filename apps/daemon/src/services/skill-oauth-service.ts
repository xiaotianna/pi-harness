import { createHash, randomBytes } from "node:crypto";
import type { PluginDefinition } from "@pi-harness/tools";
import { isPlainObject } from "es-toolkit";
import type {
  SkillCredentialStore,
  SkillOAuthCredential,
} from "../storage/skill-credential-store.js";
import { SkillConnectionError, SkillConnectionErrorCode } from "./skill-connection-types.js";

const REQUEST_TIMEOUT_MS = 10_000;
const OAUTH_REQUEST_TTL_MS = 10 * 60_000;
const TOKEN_REFRESH_LEEWAY_MS = 60_000;

interface PendingOAuthRequest {
  collectionId: string;
  codeVerifier: string;
  expiresAt: number;
}

export type OAuthPluginDefinition = PluginDefinition & {
  oauth: NonNullable<PluginDefinition["oauth"]>;
};

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

function readOptionalPositiveNumber(input: unknown, path: string): number | null {
  const value = readField(input, path);
  const number = typeof value === "number" ? value : typeof value === "string" ? Number(value) : 0;
  return Number.isFinite(number) && number > 0 ? number : null;
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

function isLoopbackUrl(value: string): boolean {
  const hostname = new URL(value).hostname;
  return (
    hostname === "127.0.0.1" ||
    hostname === "localhost" ||
    hostname.endsWith(".localhost") ||
    hostname === "[::1]"
  );
}

function credentialFromToken(
  tokenBody: unknown,
  base: Pick<SkillOAuthCredential, "account" | "apiUrl" | "connectedAt">,
  fallbackRefreshToken?: string,
): SkillOAuthCredential {
  const expiresIn = readOptionalPositiveNumber(tokenBody, "expires_in");
  const refreshToken = readOptionalField(tokenBody, "refresh_token") ?? fallbackRefreshToken;
  return {
    accessToken: readRequiredField(tokenBody, "access_token"),
    ...base,
    ...(expiresIn === null ? {} : { expiresAt: Date.now() + expiresIn * 1_000 }),
    ...(refreshToken === undefined ? {} : { refreshToken }),
  };
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

export class SkillOAuthService {
  private readonly pendingRequests = new Map<string, PendingOAuthRequest>();
  private readonly refreshingCredentials = new Map<string, Promise<SkillOAuthCredential>>();

  public constructor(
    private readonly credentials: SkillCredentialStore,
    private readonly skillGatewayUrl: string,
  ) {}

  public createAuthorizationUrl(plugin: OAuthPluginDefinition): string {
    const client = this.oauthClient(plugin);
    const state = randomValue();
    const codeVerifier = randomValue();
    this.pendingRequests.set(state, {
      collectionId: plugin.id,
      codeVerifier,
      expiresAt: Date.now() + OAUTH_REQUEST_TTL_MS,
    });

    const authorizationUrl = new URL(plugin.oauth.authorizationPath, `${plugin.apiUrl}/`);
    authorizationUrl.searchParams.set("client_id", client.clientId);
    authorizationUrl.searchParams.set("redirect_uri", client.callbackUrl);
    authorizationUrl.searchParams.set("response_type", "code");
    authorizationUrl.searchParams.set("state", state);
    if (plugin.oauth.scopes.length > 0) {
      authorizationUrl.searchParams.set("scope", plugin.oauth.scopes.join(" "));
    }
    for (const [name, value] of Object.entries(plugin.oauth.authorizationParams ?? {})) {
      authorizationUrl.searchParams.set(name, value);
    }
    if (plugin.oauth.pkce) {
      authorizationUrl.searchParams.set(
        "code_challenge",
        createHash("sha256").update(codeVerifier).digest("base64url"),
      );
      authorizationUrl.searchParams.set("code_challenge_method", "S256");
    }
    return authorizationUrl.toString();
  }

  public async completeAuthorization(
    plugin: OAuthPluginDefinition,
    code: string,
    state: string,
  ): Promise<void> {
    const pending = this.pendingRequests.get(state);
    this.pendingRequests.delete(state);
    if (!pending || pending.collectionId !== plugin.id || pending.expiresAt < Date.now()) {
      throw new SkillConnectionError(
        SkillConnectionErrorCode.OAUTH_STATE_INVALID,
        "OAuth 请求已失效，请重新连接",
      );
    }

    const tokenBody = await this.exchangeCode(plugin, code, pending.codeVerifier);
    const accessToken = readRequiredField(tokenBody, "access_token");
    const account = plugin.oauth.profile
      ? await this.fetchAccount(plugin, accessToken, tokenBody)
      : null;
    await this.credentials.set(
      plugin.id,
      credentialFromToken(tokenBody, { account, apiUrl: plugin.apiUrl, connectedAt: Date.now() }),
    );
  }

  public readCredential(plugin: PluginDefinition): SkillOAuthCredential | undefined {
    const credential = this.credentials.read(plugin.id);
    if (!credential) return undefined;
    if (credential.apiUrl === plugin.apiUrl) return credential;
    return credential.apiUrl === undefined && isLoopbackUrl(plugin.apiUrl) ? credential : undefined;
  }

  public async requireCredential(
    plugin: OAuthPluginDefinition,
    signal?: AbortSignal,
  ): Promise<SkillOAuthCredential> {
    const credential = this.readCredential(plugin);
    if (!credential) {
      throw new SkillConnectionError(
        SkillConnectionErrorCode.NOT_CONNECTED,
        `请先在插件市场连接 ${plugin.name}`,
      );
    }
    if (
      credential.expiresAt === undefined ||
      credential.expiresAt > Date.now() + TOKEN_REFRESH_LEEWAY_MS
    ) {
      return credential;
    }
    if (!credential.refreshToken) {
      throw new SkillConnectionError(
        SkillConnectionErrorCode.NOT_CONNECTED,
        `${plugin.name} 授权已过期，请重新连接`,
      );
    }

    const existing = this.refreshingCredentials.get(plugin.id);
    if (existing) return existing;
    const refreshing = this.refreshCredential(plugin, credential, signal).finally(() => {
      this.refreshingCredentials.delete(plugin.id);
    });
    this.refreshingCredentials.set(plugin.id, refreshing);
    return refreshing;
  }

  private oauthClient(plugin: OAuthPluginDefinition) {
    if (!plugin.oauth.clientId || !plugin.oauth.clientSecret) {
      throw new SkillConnectionError(
        SkillConnectionErrorCode.OAUTH_FAILED,
        `${plugin.name} OAuth 客户端未配置`,
      );
    }
    return {
      callbackUrl:
        plugin.oauth.callbackUrl ??
        new URL(
          `/api/skill-connections/${plugin.id}/oauth/callback`,
          `${this.skillGatewayUrl}/`,
        ).toString(),
      clientId: plugin.oauth.clientId,
      clientSecret: plugin.oauth.clientSecret,
    };
  }

  private async exchangeCode(
    plugin: OAuthPluginDefinition,
    code: string,
    codeVerifier: string,
  ): Promise<unknown> {
    const client = this.oauthClient(plugin);
    const body = new URLSearchParams({
      code,
      grant_type: "authorization_code",
      redirect_uri: client.callbackUrl,
    });
    if (plugin.oauth.pkce) body.set("code_verifier", codeVerifier);
    if (plugin.oauth.tokenAuth === "body") {
      body.set("client_id", client.clientId);
      body.set("client_secret", client.clientSecret);
    }
    return this.requestToken(plugin, body);
  }

  private async refreshCredential(
    plugin: OAuthPluginDefinition,
    credential: SkillOAuthCredential,
    signal?: AbortSignal,
  ): Promise<SkillOAuthCredential> {
    const client = this.oauthClient(plugin);
    const body = new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: credential.refreshToken ?? "",
    });
    if (plugin.oauth.tokenAuth === "body") {
      body.set("client_id", client.clientId);
      body.set("client_secret", client.clientSecret);
    }
    const tokenBody = await this.requestToken(plugin, body, signal);
    const refreshed = credentialFromToken(
      tokenBody,
      {
        account: credential.account,
        apiUrl: plugin.apiUrl,
        connectedAt: credential.connectedAt,
      },
      credential.refreshToken,
    );
    await this.credentials.set(plugin.id, refreshed);
    return refreshed;
  }

  private async requestToken(
    plugin: OAuthPluginDefinition,
    body: URLSearchParams,
    signal?: AbortSignal,
  ): Promise<unknown> {
    const client = this.oauthClient(plugin);
    const isJson = plugin.oauth.tokenFormat === "json";
    const response = await fetch(new URL(plugin.oauth.tokenPath, `${plugin.apiUrl}/`), {
      body: isJson ? JSON.stringify(Object.fromEntries(body)) : body,
      headers: {
        Accept: "application/json",
        ...(plugin.oauth.tokenAuth === "basic"
          ? {
              Authorization: `Basic ${Buffer.from(`${client.clientId}:${client.clientSecret}`).toString("base64")}`,
            }
          : {}),
        "Content-Type": isJson ? "application/json" : "application/x-www-form-urlencoded",
      },
      method: "POST",
      signal: signal
        ? AbortSignal.any([signal, AbortSignal.timeout(REQUEST_TIMEOUT_MS)])
        : AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    const tokenBody = await readJson(response);
    if (!response.ok || !isPlainObject(tokenBody) || typeof tokenBody.access_token !== "string") {
      throw new SkillConnectionError(
        SkillConnectionErrorCode.OAUTH_FAILED,
        `${plugin.name} OAuth token 交换失败`,
      );
    }
    return tokenBody;
  }

  private async fetchAccount(
    plugin: OAuthPluginDefinition,
    accessToken: string,
    tokenBody: unknown,
  ): Promise<NonNullable<SkillOAuthCredential["account"]>> {
    const profile = plugin.oauth.profile;
    if (!profile) {
      throw new SkillConnectionError(
        SkillConnectionErrorCode.OAUTH_FAILED,
        `${plugin.name} OAuth 账户接口未配置`,
      );
    }
    let body = profile.source === "id-token" ? decodeJwtPayload(tokenBody) : tokenBody;
    if (profile.source === "userinfo") {
      if (!profile.path) {
        throw new SkillConnectionError(
          SkillConnectionErrorCode.OAUTH_FAILED,
          `${plugin.name} OAuth 账户接口未配置`,
        );
      }
      const response = await fetch(new URL(profile.path, `${plugin.apiUrl}/`), {
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
          `${plugin.name} OAuth 账户校验失败（HTTP ${response.status}）`,
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
