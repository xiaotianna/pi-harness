import type { FastifyReply, FastifyRequest } from "fastify";
import type { HarnessConfig } from "../config/index.js";
import type { GitHubCallbackDto, GitHubDeviceDto } from "../dto/auth-dto.js";
import {
  AuthService,
  type AuthSessionResponse,
  type DesktopOAuthAuthorizationRequest,
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

function renderDesktopDevicePage(userCode: string, verificationUri: string): string {
  return `<!doctype html>
<html lang="zh-CN">
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>GitHub 授权 · PI Harness</title>
<style>
  :root { color-scheme: light dark; font-family: system-ui, sans-serif; }
  body { min-height: 100vh; margin: 0; display: grid; place-items: center; background: Canvas; color: CanvasText; }
  main { width: min(360px, calc(100vw - 48px)); text-align: center; }
  code { display: block; margin: 24px 0; font: 700 32px ui-monospace, monospace; letter-spacing: .12em; }
  a { display: block; padding: 12px 16px; border-radius: 999px; background: CanvasText; color: Canvas; text-decoration: none; }
  p { color: GrayText; line-height: 1.5; }
</style>
<main>
  <h1>连接 GitHub</h1>
  <p>复制验证码，然后前往 GitHub 完成授权。</p>
  <code id="device-code">${userCode}</code>
  <a href="${verificationUri}" rel="noreferrer" target="_blank">复制验证码并继续</a>
</main>
<script>
  document.querySelector("a").addEventListener("click", () => {
    void navigator.clipboard?.writeText(document.querySelector("#device-code").textContent);
  });
</script>
</html>`;
}

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
    if (this.authService === null || !this.authService.supportsWebLogin) {
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

    let authorization: DesktopOAuthAuthorizationRequest | null = null;
    try {
      authorization = await this.authService.createDesktopGitHubAuthorizationRequest();
      const authorizationState = authorization.state;
      const devicePageUrl = new URL("/api/auth/github/device", this.config.webUrl);
      devicePageUrl.searchParams.set("state", authorizationState);
      await this.fileOpen.openSystem(devicePageUrl.toString(), AbortSignal.timeout(10_000));
      if (request.raw.aborted) {
        this.authService.cancelDesktopGitHubLogin(authorizationState);
        await authorization.result.catch(() => undefined);
        return;
      }

      const handleAbort = () => {
        this.authService?.cancelDesktopGitHubLogin(
          authorizationState,
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
      if (authorization) {
        this.authService.cancelDesktopGitHubLogin(authorization.state);
        await authorization.result.catch(() => undefined);
      }
      request.log.warn({ err: error }, "Desktop GitHub OAuth failed");
      return reply.status(400).send({
        code: "DESKTOP_OAUTH_FAILED",
        message:
          error instanceof GitHubOAuthError && error.message.includes("device_flow_disabled")
            ? "请先在 GitHub OAuth App 中启用 Device Flow"
            : "GitHub 授权未完成，请重试",
      });
    }
  };

  public showDesktopGitHubLogin = async (
    request: FastifyRequest<{ Querystring: GitHubDeviceDto }>,
    reply: FastifyReply,
  ): Promise<FastifyReply> => {
    const login = this.authService?.getDesktopGitHubLogin(request.query.state);
    if (!login) {
      return reply.status(404).type("text/plain; charset=utf-8").send("授权请求不存在或已过期");
    }
    return reply
      .headers({
        "Cache-Control": "no-store",
        "Content-Security-Policy":
          "default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline'",
        "Referrer-Policy": "no-referrer",
      })
      .type("text/html; charset=utf-8")
      .send(renderDesktopDevicePage(login.userCode, login.verificationUri));
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
