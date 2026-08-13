import { createHash, randomBytes } from "node:crypto";
import { Type } from "typebox";
import { Value } from "typebox/value";
import type { GitHubOAuthConfig } from "../config/index.js";
import type { AuthSessionRepository, AuthUser, GitHubIdentity } from "../storage/database.js";

const GITHUB_AUTHORIZE_URL = "https://github.com/login/oauth/authorize";
const GITHUB_ACCESS_TOKEN_URL = "https://github.com/login/oauth/access_token";
const GITHUB_USER_URL = "https://api.github.com/user";
const GITHUB_API_VERSION = "2026-03-10";
const GITHUB_REQUEST_TIMEOUT_MS = 10_000;
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1_000;

const GitHubTokenResponseSchema = Type.Object({
  access_token: Type.String({ minLength: 1 }),
  token_type: Type.String({ minLength: 1 }),
});

const GitHubOAuthErrorSchema = Type.Object({
  error: Type.String({ minLength: 1 }),
  error_description: Type.Optional(Type.String()),
});

const GitHubUserResponseSchema = Type.Object({
  id: Type.Integer({ minimum: 1 }),
  login: Type.String({ minLength: 1 }),
  name: Type.Union([Type.String({ minLength: 1 }), Type.Null()]),
  avatar_url: Type.String({ format: "uri" }),
  html_url: Type.String({ format: "uri" }),
});

export class GitHubOAuthError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = "GitHubOAuthError";
  }
}

export interface OAuthAuthorizationRequest {
  authorizationUrl: string;
  codeVerifier: string;
  state: string;
}

export interface CreatedAuthSession {
  expiresAt: number;
  token: string;
  user: AuthUser;
}

export type AuthSessionResponse =
  | { authenticated: false }
  | { authenticated: true; user: AuthUser };

function createRandomValue(): string {
  return randomBytes(32).toString("base64url");
}

function hash(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    throw new GitHubOAuthError("GitHub returned an invalid JSON response");
  }
}

/**
 * 负责 OAuth 交换和本地会话生命周期。Cookie、重定向等 HTTP 逻辑留在路由层，
 * SQLite 细节由 AuthSessionRepository 封装。
 */
export class AuthService {
  public constructor(
    private readonly githubConfig: GitHubOAuthConfig,
    private readonly sessions: AuthSessionRepository,
  ) {}

  public createGitHubAuthorizationRequest(): OAuthAuthorizationRequest {
    const state = createRandomValue();
    const codeVerifier = createRandomValue();
    const codeChallenge = createHash("sha256").update(codeVerifier).digest("base64url");
    const authorizationUrl = new URL(GITHUB_AUTHORIZE_URL);

    authorizationUrl.searchParams.set("client_id", this.githubConfig.clientId);
    authorizationUrl.searchParams.set("redirect_uri", this.githubConfig.callbackUrl);
    // 用于daemon验证授权是否一致，会塞入cookie中，防止伪造 OAuth 回调。
    authorizationUrl.searchParams.set("state", state);
    authorizationUrl.searchParams.set("code_challenge", codeChallenge);
    authorizationUrl.searchParams.set("code_challenge_method", "S256");
    authorizationUrl.searchParams.set("prompt", "select_account");

    return { authorizationUrl: authorizationUrl.toString(), codeVerifier, state };
  }

  public async completeGitHubLogin(
    code: string,
    codeVerifier: string,
  ): Promise<CreatedAuthSession> {
    const accessToken = await this.exchangeCode(code, codeVerifier);
    const identity = await this.fetchGitHubIdentity(accessToken);
    const token = createRandomValue();
    const createdAt = Date.now();
    const expiresAt = createdAt + SESSION_TTL_MS;

    // 只持久化本地会话令牌的哈希。登录不需要持续访问 GitHub API，
    // 因此 GitHub 令牌在完成身份校验后立即丢弃。
    const user = this.sessions.createSession(identity, hash(token), createdAt, expiresAt);
    return { expiresAt, token, user };
  }

  public deleteSession(token: string): void {
    this.sessions.deleteSession(hash(token));
  }

  public findSession(token: string | null): AuthSessionResponse {
    if (token === null) {
      return { authenticated: false };
    }

    const user = this.sessions.findSessionUser(hash(token), Date.now());
    return user ? { authenticated: true, user } : { authenticated: false };
  }

  private async exchangeCode(code: string, codeVerifier: string): Promise<string> {
    const response = await fetch(GITHUB_ACCESS_TOKEN_URL, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_id: this.githubConfig.clientId,
        client_secret: this.githubConfig.clientSecret,
        code,
        code_verifier: codeVerifier,
        redirect_uri: this.githubConfig.callbackUrl,
      }),
      signal: AbortSignal.timeout(GITHUB_REQUEST_TIMEOUT_MS),
    });
    const body = await readJson(response);

    if (Value.Check(GitHubOAuthErrorSchema, body)) {
      throw new GitHubOAuthError(`GitHub rejected the authorization code: ${body.error}`);
    }

    if (!response.ok || !Value.Check(GitHubTokenResponseSchema, body)) {
      throw new GitHubOAuthError("GitHub access token exchange failed");
    }

    return body.access_token;
  }

  private async fetchGitHubIdentity(accessToken: string): Promise<GitHubIdentity> {
    const response = await fetch(GITHUB_USER_URL, {
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${accessToken}`,
        "User-Agent": "pi-workbench",
        "X-GitHub-Api-Version": GITHUB_API_VERSION,
      },
      signal: AbortSignal.timeout(GITHUB_REQUEST_TIMEOUT_MS),
    });
    const body = await readJson(response);

    if (!response.ok || !Value.Check(GitHubUserResponseSchema, body)) {
      throw new GitHubOAuthError("GitHub user identity validation failed");
    }

    return {
      githubUserId: String(body.id),
      username: body.login,
      displayName: body.name,
      avatarUrl: body.avatar_url,
      profileUrl: body.html_url,
    };
  }
}
