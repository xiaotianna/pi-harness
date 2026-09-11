import { timingSafeEqual } from "node:crypto";
import type { FastifyReply, FastifyRequest } from "fastify";
import type { HarnessConfig } from "../config/index.js";
import { readDesktopAuthCookie } from "./auth-cookies.js";

const DESKTOP_AUTH_EXEMPT_PATHS = [
  /^\/api\/health$/,
  /^\/api\/auth\/github\/callback$/,
  /^\/api\/mcp-servers\/[^/]+\/authorizations\/callback$/,
  /^\/api\/skill-connections\/[^/]+\/oauth\/callback$/,
] as const;

export function isDesktopTokenValid(expected: string, actual: string | null): boolean {
  if (actual === null) return false;
  const expectedBytes = Buffer.from(expected);
  const actualBytes = Buffer.from(actual);
  return expectedBytes.length === actualBytes.length && timingSafeEqual(expectedBytes, actualBytes);
}

export function isDesktopRequestAllowed(config: HarnessConfig, request: FastifyRequest): boolean {
  if (config.desktopToken === null) return true;
  const path = request.url.split("?", 1)[0] ?? request.url;
  if (DESKTOP_AUTH_EXEMPT_PATHS.some((pattern) => pattern.test(path))) return true;
  return isDesktopTokenValid(config.desktopToken, readDesktopAuthCookie(request.headers.cookie));
}

export function isMutationRequestAllowed(config: HarnessConfig, request: FastifyRequest): boolean {
  return (
    request.headers.origin === config.webUrl && request.headers["x-pi-harness-request"] === "1"
  );
}

export function rejectMutation(reply: FastifyReply): FastifyReply {
  return reply.status(403).send({
    code: "INVALID_REQUEST_ORIGIN",
    message: "The request origin is not allowed",
  });
}
