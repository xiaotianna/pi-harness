import { randomUUID, timingSafeEqual } from "node:crypto";
import {
  type AuthProvider,
  auth,
  extractWWWAuthenticateParams,
  type OAuthClientInformationContext,
  type OAuthClientMetadata,
  type OAuthClientProvider,
  type OAuthDiscoveryState,
  type StoredOAuthClientInformation,
  type StoredOAuthTokens,
} from "@modelcontextprotocol/client";
import type { HarnessConfig } from "../config/index.js";
import type { McpConnectionContext } from "../mcp/client-manager.js";
import { McpError, McpErrorCode } from "../mcp/errors.js";
import { createMcpOAuthFetch } from "../mcp/transports/http-fetch.js";
import { McpAuthMode, McpAuthRequirement, type McpServerId, McpTransport } from "../schemas/mcp.js";
import type { McpServerVo } from "../vo/mcp-vo.js";
import type { McpServerService } from "./mcp-server-service.js";

const OAUTH_FLOW_TTL_MS = 10 * 60_000;

interface PendingOAuth {
  authorizationUrl?: URL;
  clientInformation?: StoredOAuthClientInformation;
  codeVerifier?: string;
  context: McpConnectionContext;
  createdAt: number;
  discoveryState?: OAuthDiscoveryState;
  identity: string;
  state: string;
}

export class McpOAuthService {
  private readonly pending = new Map<McpServerId, PendingOAuth>();
  private readonly refreshes = new Map<McpServerId, Promise<void>>();

  public constructor(
    private readonly config: HarnessConfig,
    private readonly servers: McpServerService,
    private readonly protectedLocalPorts: readonly number[],
  ) {}

  public createAuthProvider(context: McpConnectionContext): AuthProvider {
    return {
      token: async () => {
        const material = context.credential?.material;
        return material?.mode === McpAuthMode.OAUTH ? material.accessToken : undefined;
      },
      onUnauthorized: async ({ response }) => this.handleUnauthorized(context, response),
    };
  }

  public async start(serverId: string, expectedRevision: number): Promise<string> {
    const context = this.servers.createOAuthContext(
      serverId,
      expectedRevision,
      `oauth:${randomUUID()}`,
    );
    if (
      context.server.config.transport === McpTransport.STDIO ||
      context.server.config.authMode === McpAuthMode.STATIC
    ) {
      throw new McpError(McpErrorCode.INVALID_CONFIG, "该 MCP 服务未启用 OAuth 鉴权");
    }
    const pending = this.createPending(context);
    this.pending.set(serverId, pending);
    try {
      const resourceMetadataUrl = this.servers.getOAuthResourceMetadataUrl(serverId);
      const result = await auth(this.createOAuthProvider(context), {
        serverUrl: context.server.config.url,
        fetchFn: this.createFetch(context, () => this.servers.verifyOAuthContext(context)),
        forceReauthorization: true,
        ...(resourceMetadataUrl ? { resourceMetadataUrl } : {}),
      });
      if (result !== "REDIRECT" || pending.authorizationUrl === undefined) {
        throw new McpError(McpErrorCode.OAUTH_FAILED, "MCP OAuth 授权地址不可用");
      }
      this.servers.noteAuthenticationRequired(serverId, McpAuthRequirement.OAUTH);
      return pending.authorizationUrl.href;
    } catch (error: unknown) {
      this.pending.delete(serverId);
      if (error instanceof McpError) throw error;
      throw new McpError(McpErrorCode.OAUTH_FAILED, "MCP OAuth 授权启动失败");
    }
  }

  public async complete(
    serverId: string,
    authorizationCode: string,
    state: string,
    issuer?: string,
  ): Promise<McpServerVo> {
    const pending = this.requirePending(serverId);
    if (!this.matchesState(pending.state, state)) {
      throw new McpError(McpErrorCode.OAUTH_FAILED, "MCP OAuth 回调状态无效，请重新授权");
    }
    try {
      const config = pending.context.server.config;
      if (config.transport === McpTransport.STDIO) {
        throw new McpError(McpErrorCode.INVALID_CONFIG, "stdio MCP 不支持 OAuth");
      }
      const result = await auth(this.createOAuthProvider(pending.context), {
        serverUrl: config.url,
        authorizationCode,
        fetchFn: this.createFetch(pending.context, () =>
          this.servers.verifyOAuthContext(pending.context),
        ),
        ...(issuer ? { iss: issuer } : {}),
      });
      if (result !== "AUTHORIZED") {
        throw new McpError(McpErrorCode.OAUTH_FAILED, "MCP OAuth 授权未完成");
      }
      this.pending.delete(serverId);
      return this.servers.get(serverId);
    } catch (error: unknown) {
      this.pending.delete(serverId);
      if (error instanceof McpError) throw error;
      throw new McpError(McpErrorCode.OAUTH_FAILED, "MCP OAuth 授权失败，请重新授权");
    }
  }

  private async handleUnauthorized(
    context: McpConnectionContext,
    response: Response,
  ): Promise<void> {
    const challenge = extractWWWAuthenticateParams(response);
    const material = context.credential?.material;
    const isOAuth =
      context.server.config.transport !== McpTransport.STDIO &&
      (context.server.config.authMode === McpAuthMode.OAUTH ||
        material?.mode === McpAuthMode.OAUTH ||
        challenge.resourceMetadataUrl !== undefined);
    if (!isOAuth) {
      this.servers.noteAuthenticationRequired(context.server.id, McpAuthRequirement.STATIC);
      throw new McpError(
        McpErrorCode.STATIC_CREDENTIAL_REQUIRED,
        "该 MCP 服务需要 Token 或 API Key，请设置请求头凭据",
      );
    }
    this.servers.noteAuthenticationRequired(
      context.server.id,
      McpAuthRequirement.OAUTH,
      challenge.resourceMetadataUrl,
    );
    if (material?.mode !== McpAuthMode.OAUTH || material.refreshToken === undefined) {
      throw new McpError(McpErrorCode.OAUTH_REQUIRED, "该 MCP 服务需要 OAuth 授权");
    }
    const current = this.refreshes.get(context.server.id);
    if (current !== undefined) {
      await current;
      this.servers.synchronizeOAuthCredential(context);
      return;
    }
    const refresh = this.refresh(context, challenge.resourceMetadataUrl).finally(() => {
      this.refreshes.delete(context.server.id);
    });
    this.refreshes.set(context.server.id, refresh);
    return refresh;
  }

  private async refresh(context: McpConnectionContext, resourceMetadataUrl?: URL): Promise<void> {
    try {
      const result = await auth(this.createOAuthProvider(context), {
        serverUrl:
          context.server.config.transport === McpTransport.STDIO ? "" : context.server.config.url,
        fetchFn: this.createFetch(context, () => this.servers.verifyContext(context)),
        ...(resourceMetadataUrl ? { resourceMetadataUrl } : {}),
      });
      if (result === "AUTHORIZED") return;
    } catch (error: unknown) {
      if (error instanceof McpError && error.code !== McpErrorCode.OAUTH_REQUIRED) throw error;
    }
    throw new McpError(McpErrorCode.OAUTH_REQUIRED, "MCP OAuth 授权已失效，请重新授权");
  }

  private createOAuthProvider(context: McpConnectionContext): OAuthClientProvider {
    const redirectUrl = this.callbackUrl(context.server.id);
    const clientMetadata: OAuthClientMetadata = {
      redirect_uris: [redirectUrl],
      client_name: "PI Harness",
      grant_types: ["authorization_code", "refresh_token"],
      response_types: ["code"],
      token_endpoint_auth_method: "none",
    };
    return {
      redirectUrl,
      clientMetadata,
      state: () => this.ensurePending(context).state,
      clientInformation: () => {
        const pending = this.pending.get(context.server.id);
        if (pending?.clientInformation) return pending.clientInformation;
        const material = context.credential?.material;
        return material?.mode === McpAuthMode.OAUTH
          ? {
              client_id: material.clientId,
              ...(material.clientSecret ? { client_secret: material.clientSecret } : {}),
              issuer: material.issuer,
            }
          : undefined;
      },
      saveClientInformation: (clientInformation) => {
        this.ensurePending(context).clientInformation = clientInformation;
      },
      tokens: () => this.readTokens(context),
      saveTokens: (tokens, authContext) => this.saveTokens(context, tokens, authContext),
      redirectToAuthorization: (authorizationUrl) => {
        this.assertAuthorizationUrl(authorizationUrl);
        this.ensurePending(context).authorizationUrl = authorizationUrl;
      },
      saveCodeVerifier: (codeVerifier) => {
        this.ensurePending(context).codeVerifier = codeVerifier;
      },
      codeVerifier: () => {
        const value = this.requirePending(context.server.id).codeVerifier;
        if (value === undefined) {
          throw new McpError(McpErrorCode.OAUTH_FAILED, "MCP OAuth 校验信息已失效");
        }
        return value;
      },
      saveDiscoveryState: (discoveryState) => {
        const pending = this.pending.get(context.server.id);
        if (pending) pending.discoveryState = discoveryState;
      },
      discoveryState: () => this.pending.get(context.server.id)?.discoveryState,
    };
  }

  private readTokens(context: McpConnectionContext): StoredOAuthTokens | undefined {
    const material = context.credential?.material;
    if (material?.mode !== McpAuthMode.OAUTH) return undefined;
    const remainingSeconds =
      material.expiresAt === undefined
        ? undefined
        : Math.max(0, Math.floor((material.expiresAt - Date.now()) / 1_000));
    return {
      access_token: material.accessToken,
      token_type: "Bearer",
      issuer: material.issuer,
      ...(material.refreshToken ? { refresh_token: material.refreshToken } : {}),
      ...(remainingSeconds === undefined ? {} : { expires_in: remainingSeconds }),
      ...(material.scope ? { scope: material.scope } : {}),
    };
  }

  private async saveTokens(
    context: McpConnectionContext,
    tokens: StoredOAuthTokens,
    authContext?: OAuthClientInformationContext,
  ): Promise<void> {
    if (context.server.config.transport === McpTransport.STDIO) {
      throw new McpError(McpErrorCode.INVALID_CONFIG, "stdio MCP 不支持 OAuth");
    }
    const pending = this.pending.get(context.server.id);
    const current = context.credential?.material;
    const clientInformation = pending?.clientInformation;
    const issuer = tokens.issuer ?? authContext?.issuer;
    const clientId =
      clientInformation?.client_id ??
      (current?.mode === McpAuthMode.OAUTH ? current.clientId : undefined);
    if (issuer === undefined || clientId === undefined) {
      throw new McpError(McpErrorCode.OAUTH_FAILED, "MCP OAuth 服务未返回完整授权信息");
    }
    const material = {
      mode: McpAuthMode.OAUTH,
      issuer,
      resource: context.server.config.url,
      clientId,
      ...(clientInformation?.client_secret
        ? { clientSecret: clientInformation.client_secret }
        : current?.mode === McpAuthMode.OAUTH && current.clientSecret
          ? { clientSecret: current.clientSecret }
          : {}),
      accessToken: tokens.access_token,
      ...(tokens.refresh_token
        ? { refreshToken: tokens.refresh_token }
        : current?.mode === McpAuthMode.OAUTH && current.refreshToken
          ? { refreshToken: current.refreshToken }
          : {}),
      ...(tokens.expires_in === undefined
        ? {}
        : { expiresAt: Date.now() + Math.max(0, Math.floor(tokens.expires_in * 1_000)) }),
      ...(tokens.scope ? { scope: tokens.scope } : {}),
    } as const;
    if (pending) {
      await this.servers.saveOAuthCredential(context, material, pending.identity);
      return;
    }
    await this.servers.refreshOAuthCredential(context, material);
  }

  private createFetch(context: McpConnectionContext, verifyContext: () => void) {
    const config = context.server.config;
    if (config.transport === McpTransport.STDIO) {
      throw new McpError(McpErrorCode.INVALID_CONFIG, "stdio MCP 不支持 OAuth");
    }
    return createMcpOAuthFetch(
      {
        allowPrivateNetwork: config.allowPrivateNetwork,
        protectedLocalPorts: this.protectedLocalPorts,
        timeoutMs: config.requestTimeoutMs,
      },
      verifyContext,
    );
  }

  private createPending(context: McpConnectionContext): PendingOAuth {
    return {
      context,
      createdAt: Date.now(),
      identity: randomUUID(),
      state: randomUUID(),
    };
  }

  private ensurePending(context: McpConnectionContext): PendingOAuth {
    const current = this.pending.get(context.server.id);
    if (current && Date.now() - current.createdAt <= OAUTH_FLOW_TTL_MS) return current;
    const pending = this.createPending(context);
    this.pending.set(context.server.id, pending);
    return pending;
  }

  private requirePending(serverId: McpServerId): PendingOAuth {
    const pending = this.pending.get(serverId);
    if (pending === undefined || Date.now() - pending.createdAt > OAUTH_FLOW_TTL_MS) {
      this.pending.delete(serverId);
      throw new McpError(McpErrorCode.OAUTH_FAILED, "MCP OAuth 授权已超时，请重新授权");
    }
    return pending;
  }

  private matchesState(expected: string, received: string): boolean {
    const left = Buffer.from(expected);
    const right = Buffer.from(received);
    return left.length === right.length && timingSafeEqual(left, right);
  }

  private callbackUrl(serverId: string): string {
    return new URL(
      `/api/mcp-servers/${encodeURIComponent(serverId)}/authorizations/callback`,
      this.config.skillGatewayUrl,
    ).href;
  }

  private assertAuthorizationUrl(url: URL): void {
    const isLoopback =
      url.hostname === "127.0.0.1" ||
      url.hostname === "localhost" ||
      url.hostname.endsWith(".localhost") ||
      url.hostname === "[::1]";
    if (
      (url.protocol !== "https:" && !(url.protocol === "http:" && isLoopback)) ||
      url.username ||
      url.password
    ) {
      throw new McpError(McpErrorCode.OAUTH_FAILED, "MCP OAuth 授权地址不安全");
    }
  }
}
