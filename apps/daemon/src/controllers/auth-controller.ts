import type { FastifyReply, FastifyRequest } from "fastify";
import type { HarnessConfig } from "../config/index.js";
import type { GitHubCallbackDto } from "../dto/auth-dto.js";
import {
  AuthService,
  type AuthSessionResponse,
  GitHubOAuthError,
} from "../services/auth-service.js";
import type { FileOpenService } from "../services/file-open-service.js";
import type { AuthSessionRepository } from "../storage/database.js";
import {
  clearGitHubOAuthCookie,
  clearSessionCookie,
  createGitHubOAuthCookie,
  createSessionCookie,
  readGitHubOAuthCookie,
  readSessionCookie,
} from "../utils/auth-cookies.js";
import { isMutationRequestAllowed } from "../utils/request-security.js";

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
    private readonly fileOpen: FileOpenService,
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

  public startDesktopGitHubLogin = async (
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<FastifyReply | undefined> => {
    if (!isMutationRequestAllowed(this.config, request)) {
      return reply.status(403).send({
        code: "INVALID_REQUEST_ORIGIN",
        message: "The request origin is not allowed",
      });
    }
    if (this.authService === null) {
      return reply.status(503).send({
        code: "AUTH_NOT_CONFIGURED",
        message: "GitHub 登录尚未配置",
      });
    }

    const authorization = this.authService.createDesktopGitHubAuthorizationRequest();
    try {
      await this.fileOpen.openSystem(authorization.authorizationUrl, AbortSignal.timeout(10_000));
      if (request.raw.aborted) {
        this.authService.cancelDesktopGitHubLogin(authorization.state);
        return;
      }

      const handleAbort = () => {
        this.authService?.cancelDesktopGitHubLogin(
          authorization.state,
          new GitHubOAuthError("GitHub desktop authorization was cancelled"),
        );
      };
      request.raw.once("aborted", handleAbort);
      const session = await authorization.result.finally(() => {
        request.raw.off("aborted", handleAbort);
      });
      reply.header("Set-Cookie", createSessionCookie(session.token, this.isSecure));
      return reply.status(204).send();
    } catch (error: unknown) {
      this.authService.cancelDesktopGitHubLogin(authorization.state);
      request.log.warn({ err: error }, "Desktop GitHub OAuth failed");
      return reply.status(400).send({
        code: "DESKTOP_OAUTH_FAILED",
        message: "GitHub 授权未完成，请重试",
      });
    }
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
    const callbackState = request.query.state;
    if (request.query.error !== undefined) {
      if (
        callbackState &&
        this.authService.cancelDesktopGitHubLogin(
          callbackState,
          new GitHubOAuthError("GitHub desktop authorization was denied"),
        )
      ) {
        this.redirectToDesktopLoginResult(reply, "error", AuthErrorCode.ACCESS_DENIED);
        return;
      }
      this.redirectToLogin(reply, AuthErrorCode.ACCESS_DENIED);
      return;
    }

    const { code, state } = request.query;
    if (code === undefined || state === undefined) {
      if (
        state &&
        this.authService.cancelDesktopGitHubLogin(
          state,
          new GitHubOAuthError("GitHub desktop authorization callback was invalid"),
        )
      ) {
        this.redirectToDesktopLoginResult(reply, "error", AuthErrorCode.INVALID_STATE);
        return;
      }
      this.redirectToLogin(reply, AuthErrorCode.INVALID_STATE);
      return;
    }

    if (this.authService.hasPendingDesktopLogin(state)) {
      try {
        await this.authService.completeDesktopGitHubLogin(code, state);
        this.redirectToDesktopLoginResult(reply, "success");
      } catch (error: unknown) {
        request.log.warn({ err: error }, "Desktop GitHub OAuth callback failed");
        this.redirectToDesktopLoginResult(reply, "error", AuthErrorCode.OAUTH_FAILED);
      }
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

  private redirectToDesktopLoginResult(
    reply: FastifyReply,
    status: "error" | "success",
    errorCode?: string,
  ): void {
    const redirectUrl = new URL("/login", this.config.webUrl);
    redirectUrl.searchParams.set("desktopAuth", status);
    if (errorCode) redirectUrl.searchParams.set("authError", errorCode);
    void reply.redirect(redirectUrl.toString());
  }
}
