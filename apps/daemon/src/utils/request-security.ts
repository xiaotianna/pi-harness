import type { FastifyReply, FastifyRequest } from "fastify";
import type { HarnessConfig } from "../config/index.js";

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
