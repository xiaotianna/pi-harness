import type { FastifyReply, FastifyRequest } from "fastify";
import type { HarnessConfig } from "../config/index.js";
import { createDesktopAuthCookie } from "../utils/auth-cookies.js";
import { isDesktopTokenValid } from "../utils/request-security.js";

const BOOTSTRAP_PAGE = `<!doctype html>
<meta charset="utf-8">
<title>PI Harness</title>
<body>正在启动 PI Harness…</body>
<script>
  fetch(location.pathname, {
    method: "POST",
    headers: { Authorization: "Bearer " + location.hash.slice(1) }
  }).then((response) => {
    if (!response.ok) throw new Error("Desktop authorization failed");
    location.replace("/");
  }).catch(() => { document.body.textContent = "PI Harness 启动失败"; });
</script>`;

export class DesktopController {
  public constructor(
    private readonly config: HarnessConfig,
    private readonly shutdownDaemon: () => Promise<void>,
  ) {}

  public getBootstrapPage = async (_request: FastifyRequest, reply: FastifyReply) => {
    return reply
      .headers({
        "Cache-Control": "no-store",
        "Content-Security-Policy":
          "default-src 'none'; script-src 'unsafe-inline'; connect-src 'self'",
        "Referrer-Policy": "no-referrer",
      })
      .type("text/html; charset=utf-8")
      .send(BOOTSTRAP_PAGE);
  };

  public authorize = async (request: FastifyRequest, reply: FastifyReply) => {
    const authorization = request.headers.authorization;
    const token = authorization?.startsWith("Bearer ") ? authorization.slice(7) : null;
    if (
      this.config.desktopToken === null ||
      !isDesktopTokenValid(this.config.desktopToken, token)
    ) {
      return reply.status(401).send({
        code: "DESKTOP_AUTH_REQUIRED",
        message: "Desktop authorization is required",
      });
    }

    return reply
      .header("Set-Cookie", createDesktopAuthCookie(this.config.desktopToken))
      .status(204)
      .send();
  };

  public shutdown = async (request: FastifyRequest, reply: FastifyReply) => {
    const authorization = request.headers.authorization;
    const token = authorization?.startsWith("Bearer ") ? authorization.slice(7) : null;
    if (
      this.config.desktopToken === null ||
      !isDesktopTokenValid(this.config.desktopToken, token)
    ) {
      return reply.status(401).send({
        code: "DESKTOP_AUTH_REQUIRED",
        message: "Desktop authorization is required",
      });
    }

    reply.status(202).send();
    setImmediate(() => {
      void this.shutdownDaemon().catch((error: unknown) => {
        request.log.error({ err: error }, "Desktop daemon shutdown failed");
      });
    });
    return reply;
  };
}
