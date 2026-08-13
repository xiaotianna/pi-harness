import { timingSafeEqual } from "node:crypto";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { type Static, Type } from "typebox";
import type { WorkbenchConfig } from "../config/index.js";
import { AuthService } from "../services/auth-service.js";
import type { AuthSessionRepository } from "../storage/database.js";

const AUTH_SESSION_COOKIE = "pi_workbench_session";
const GITHUB_OAUTH_COOKIE = "pi_workbench_github_oauth";
const OAUTH_COOKIE_MAX_AGE_SECONDS = 10 * 60;
const SESSION_MAX_AGE_SECONDS = 30 * 24 * 60 * 60;

const AuthErrorCode = {
  ACCESS_DENIED: "access_denied",
  INVALID_STATE: "invalid_state",
  NOT_CONFIGURED: "not_configured",
  OAUTH_FAILED: "oauth_failed",
} as const;

const AuthUserSchema = Type.Object({
  id: Type.String({ minLength: 1 }),
  username: Type.String({ minLength: 1 }),
  displayName: Type.Union([Type.String({ minLength: 1 }), Type.Null()]),
  avatarUrl: Type.String({ format: "uri" }),
  profileUrl: Type.String({ format: "uri" }),
});

const AuthSessionResponseSchema = Type.Union([
  Type.Object({ authenticated: Type.Literal(false) }),
  Type.Object({ authenticated: Type.Literal(true), user: AuthUserSchema }),
]);

const ApiErrorResponseSchema = Type.Object({
  code: Type.String({ minLength: 1 }),
  message: Type.String({ minLength: 1 }),
});

const GitHubCallbackQuerySchema = Type.Object({
  code: Type.Optional(Type.String({ minLength: 1 })),
  error: Type.Optional(Type.String({ minLength: 1 })),
  state: Type.Optional(Type.String({ minLength: 1 })),
});

interface CookieOptions {
  httpOnly?: boolean;
  maxAgeSeconds: number;
  path: string;
  secure?: boolean;
}

interface GitHubOAuthCookie {
  codeVerifier: string;
  state: string;
}

function parseCookie(header: string | undefined, name: string): string | null {
  if (header === undefined) {
    return null;
  }

  for (const part of header.split(";")) {
    const separator = part.indexOf("=");
    if (separator < 0 || part.slice(0, separator).trim() !== name) {
      continue;
    }

    try {
      return decodeURIComponent(part.slice(separator + 1).trim());
    } catch {
      return null;
    }
  }

  return null;
}

function serializeCookie(name: string, value: string, options: CookieOptions): string {
  const attributes = [
    `${name}=${encodeURIComponent(value)}`,
    `Path=${options.path}`,
    `Max-Age=${options.maxAgeSeconds}`,
    "SameSite=Lax",
  ];

  if (options.httpOnly === true) {
    attributes.push("HttpOnly");
  }
  if (options.secure === true) {
    attributes.push("Secure");
  }

  return attributes.join("; ");
}

function clearCookie(name: string, path: string, isSecure: boolean): string {
  return serializeCookie(name, "", {
    httpOnly: true,
    maxAgeSeconds: 0,
    path,
    secure: isSecure,
  });
}

function serializeGitHubOAuthCookie(value: GitHubOAuthCookie, isSecure: boolean): string {
  return serializeCookie(GITHUB_OAUTH_COOKIE, `${value.state}.${value.codeVerifier}`, {
    httpOnly: true,
    maxAgeSeconds: OAUTH_COOKIE_MAX_AGE_SECONDS,
    path: "/api/auth/github/callback",
    secure: isSecure,
  });
}

function parseGitHubOAuthCookie(
  header: string | undefined,
  callbackState: string,
): GitHubOAuthCookie | null {
  const cookie = parseCookie(header, GITHUB_OAUTH_COOKIE);
  if (cookie === null) {
    return null;
  }

  const separator = cookie.indexOf(".");
  if (separator < 1) {
    return null;
  }

  const state = cookie.slice(0, separator);
  const codeVerifier = cookie.slice(separator + 1);
  const actualState = Buffer.from(state);
  const expectedState = Buffer.from(callbackState);

  // 检查长度后，以恒定时间比较 state。该 Cookie 将回调绑定到发起 OAuth 的浏览器，
  // 防止伪造回调创建本地会话。
  const stateMatches =
    actualState.length === expectedState.length && timingSafeEqual(actualState, expectedState);
  return codeVerifier.length > 0 && stateMatches ? { codeVerifier, state } : null;
}

function redirectToLogin(reply: FastifyReply, webUrl: string, errorCode: string): void {
  const redirectUrl = new URL("/login", webUrl);
  redirectUrl.searchParams.set("authError", errorCode);
  void reply.redirect(redirectUrl.toString());
}

function requireSameOrigin(request: FastifyRequest, config: WorkbenchConfig): boolean {
  return request.headers.origin === config.webUrl;
}

/** 注册 GitHub 登录、会话查询和退出登录接口。 */
export async function registerAuthRoutes(
  server: FastifyInstance,
  config: WorkbenchConfig,
  sessions: AuthSessionRepository,
): Promise<void> {
  const githubConfig = config.githubOAuth;
  const authService = githubConfig ? new AuthService(githubConfig, sessions) : null;
  const isSecure = githubConfig?.callbackUrl.startsWith("https://") ?? false;

  server.get("/api/auth/github", {}, async (_request, reply) => {
    if (authService === null) {
      redirectToLogin(reply, config.webUrl, AuthErrorCode.NOT_CONFIGURED);
      return;
    }

    const authorization = authService.createGitHubAuthorizationRequest();
    reply.header(
      "Set-Cookie",
      serializeGitHubOAuthCookie(
        { codeVerifier: authorization.codeVerifier, state: authorization.state },
        isSecure,
      ),
    );
    return reply.redirect(authorization.authorizationUrl);
  });

  server.get<{ Querystring: Static<typeof GitHubCallbackQuerySchema> }>(
    "/api/auth/github/callback",
    { schema: { querystring: GitHubCallbackQuerySchema } },
    async (request, reply) => {
      reply.header(
        "Set-Cookie",
        clearCookie(GITHUB_OAUTH_COOKIE, "/api/auth/github/callback", isSecure),
      );

      if (authService === null) {
        redirectToLogin(reply, config.webUrl, AuthErrorCode.NOT_CONFIGURED);
        return;
      }
      if (request.query.error !== undefined) {
        redirectToLogin(reply, config.webUrl, AuthErrorCode.ACCESS_DENIED);
        return;
      }

      const { code, state } = request.query;
      if (code === undefined || state === undefined) {
        redirectToLogin(reply, config.webUrl, AuthErrorCode.INVALID_STATE);
        return;
      }

      const oauthCookie = parseGitHubOAuthCookie(request.headers.cookie, state);
      if (oauthCookie === null) {
        redirectToLogin(reply, config.webUrl, AuthErrorCode.INVALID_STATE);
        return;
      }

      try {
        const session = await authService.completeGitHubLogin(code, oauthCookie.codeVerifier);
        reply.header("Set-Cookie", [
          clearCookie(GITHUB_OAUTH_COOKIE, "/api/auth/github/callback", isSecure),
          serializeCookie(AUTH_SESSION_COOKIE, session.token, {
            httpOnly: true,
            maxAgeSeconds: SESSION_MAX_AGE_SECONDS,
            path: "/",
            secure: isSecure,
          }),
        ]);
        return reply.redirect(config.webUrl);
      } catch (error: unknown) {
        request.log.warn({ err: error }, "GitHub OAuth callback failed");
        redirectToLogin(reply, config.webUrl, AuthErrorCode.OAUTH_FAILED);
      }
    },
  );

  server.get(
    "/api/auth/session",
    { schema: { response: { 200: AuthSessionResponseSchema } } },
    async (request) => {
      const token = parseCookie(request.headers.cookie, AUTH_SESSION_COOKIE);
      return authService?.findSession(token) ?? { authenticated: false };
    },
  );

  server.post(
    "/api/auth/logout",
    {
      schema: {
        response: { 204: Type.Null(), 403: ApiErrorResponseSchema },
      },
    },
    async (request, reply) => {
      if (
        !requireSameOrigin(request, config) ||
        request.headers["x-pi-workbench-request"] !== "1"
      ) {
        return reply.status(403).send({
          code: "INVALID_REQUEST_ORIGIN",
          message: "The request origin is not allowed",
        });
      }

      const token = parseCookie(request.headers.cookie, AUTH_SESSION_COOKIE);
      if (token !== null) {
        authService?.deleteSession(token);
      }
      reply.header("Set-Cookie", clearCookie(AUTH_SESSION_COOKIE, "/", isSecure));
      return reply.status(204).send();
    },
  );
}
