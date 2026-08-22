import type { FastifyReply, FastifyRequest } from "fastify";
import type { HarnessConfig } from "../config/index.js";
import type { GitHubCallbackDto } from "../dto/auth-dto.js";
import { AuthService, type AuthSessionResponse } from "../services/auth-service.js";
import type { AuthSessionRepository } from "../storage/database.js";
import {
  clearGitHubOAuthCookie,
  clearSessionCookie,
  createGitHubOAuthCookie,
  createSessionCookie,
  readGitHubOAuthCookie,
  readSessionCookie,
} from "../utils/auth-cookies.js";

const AuthErrorCode = {
  ACCESS_DENIED: "access_denied",
  INVALID_STATE: "invalid_state",
  NOT_CONFIGURED: "not_configured",
  OAUTH_FAILED: "oauth_failed",
} as const;

/** 处理认证相关的 HTTP 请求，业务流程交由 AuthService 执行。 */
export class AuthController {
  private readonly authService: AuthService | null;
  private readonly isSecure: boolean;

  public constructor(
    private readonly config: HarnessConfig,
    sessions: AuthSessionRepository,
  ) {
    this.authService = config.githubOAuth ? new AuthService(config.githubOAuth, sessions) : null;
    this.isSecure = config.githubOAuth?.callbackUrl.startsWith("https://") ?? false;
  }

  public startGitHubLogin = async (
    _request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<FastifyReply | undefined> => {
    if (this.authService === null) {
      this.redirectToLogin(reply, AuthErrorCode.NOT_CONFIGURED);
      return;
    }

    const authorization = this.authService.createGitHubAuthorizationRequest();
    reply.header(
      "Set-Cookie",
      createGitHubOAuthCookie(
        { codeVerifier: authorization.codeVerifier, state: authorization.state },
        this.isSecure,
      ),
    );
    return reply.redirect(authorization.authorizationUrl);
  };

  public completeGitHubLogin = async (
    request: FastifyRequest<{ Querystring: GitHubCallbackDto }>,
    reply: FastifyReply,
  ): Promise<FastifyReply | undefined> => {
    reply.header("Set-Cookie", clearGitHubOAuthCookie(this.isSecure));

    if (this.authService === null) {
      this.redirectToLogin(reply, AuthErrorCode.NOT_CONFIGURED);
      return;
    }
    if (request.query.error !== undefined) {
      this.redirectToLogin(reply, AuthErrorCode.ACCESS_DENIED);
      return;
    }

    const { code, state } = request.query;
    if (code === undefined || state === undefined) {
      this.redirectToLogin(reply, AuthErrorCode.INVALID_STATE);
      return;
    }

    const oauthCookie = readGitHubOAuthCookie(request.headers.cookie, state);
    if (oauthCookie === null) {
      this.redirectToLogin(reply, AuthErrorCode.INVALID_STATE);
      return;
    }

    try {
      const session = await this.authService.completeGitHubLogin(code, oauthCookie.codeVerifier);
      reply.header("Set-Cookie", [
        clearGitHubOAuthCookie(this.isSecure),
        createSessionCookie(session.token, this.isSecure),
      ]);
      return reply.redirect(this.config.webUrl);
    } catch (error: unknown) {
      request.log.warn({ err: error }, "GitHub OAuth callback failed");
      this.redirectToLogin(reply, AuthErrorCode.OAUTH_FAILED);
    }
  };

  public getSession = async (request: FastifyRequest): Promise<AuthSessionResponse> => {
    const token = readSessionCookie(request.headers.cookie);
    return this.authService?.findSession(token) ?? { authenticated: false };
  };

  public logout = async (request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> => {
    if (
      request.headers.origin !== this.config.webUrl ||
      request.headers["x-pi-harness-request"] !== "1"
    ) {
      return reply.status(403).send({
        code: "INVALID_REQUEST_ORIGIN",
        message: "The request origin is not allowed",
      });
    }

    const token = readSessionCookie(request.headers.cookie);
    if (token !== null) {
      this.authService?.deleteSession(token);
    }

    reply.header("Set-Cookie", clearSessionCookie(this.isSecure));
    return reply.status(204).send();
  };

  private redirectToLogin(reply: FastifyReply, errorCode: string): void {
    const redirectUrl = new URL("/login", this.config.webUrl);
    redirectUrl.searchParams.set("authError", errorCode);
    void reply.redirect(redirectUrl.toString());
  }
}
