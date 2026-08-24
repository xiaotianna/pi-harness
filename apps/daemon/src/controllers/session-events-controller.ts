import type { ServerResponse } from "node:http";
import type { HarnessEvent } from "@pi-harness/agent-runtime";
import type { FastifyReply, FastifyRequest } from "fastify";
import type { SessionEventsQueryDto, SessionParamsDto } from "../dto/session-dto.js";
import { type SessionService, SessionServiceError } from "../services/session-service.js";
import type { SessionEventBroker } from "../sse/session-event-broker.js";

const SSE_HEARTBEAT_INTERVAL_MS = 15_000;

function writeEvent(response: ServerResponse, event: HarnessEvent): void {
  response.write(`id: ${event.id}\n`);
  response.write(`event: ${event.type}\n`);
  response.write(`data: ${JSON.stringify(event)}\n\n`);
}

function readLastEventId(request: FastifyRequest): string | undefined {
  const value = request.headers["last-event-id"];
  return Array.isArray(value) ? value[0] : value;
}

export class SessionEventsController {
  public constructor(
    private readonly sessions: SessionService,
    private readonly broker: SessionEventBroker,
  ) {}

  public stream = async (
    request: FastifyRequest<{
      Params: SessionParamsDto;
      Querystring: SessionEventsQueryDto;
    }>,
    reply: FastifyReply,
  ): Promise<void> => {
    const sessionId = request.params.sessionId;
    const pendingLiveEvents: HarnessEvent[] = [];
    let isReplaying = true;
    let lastSentSeq = 0;
    let isClosed = false;

    const send = (event: HarnessEvent) => {
      if (isClosed || event.seq <= lastSentSeq) return;
      try {
        writeEvent(reply.raw, event);
        lastSentSeq = event.seq;
      } catch {
        close();
      }
    };
    const unsubscribe = this.broker.subscribe(sessionId, (event) => {
      if (isReplaying) pendingLiveEvents.push(event);
      else send(event);
    });
    let heartbeat: NodeJS.Timeout | undefined;
    const close = () => {
      if (isClosed) return;
      isClosed = true;
      unsubscribe();
      if (heartbeat !== undefined) clearInterval(heartbeat);
      if (!reply.raw.destroyed) reply.raw.end();
    };

    try {
      const snapshot = await this.sessions.getSnapshot(sessionId);
      const lastEventId = readLastEventId(request);
      const resumedEvent =
        lastEventId === undefined
          ? undefined
          : snapshot.events.find((event) => event.id === lastEventId);
      lastSentSeq = request.query.afterSeq ?? resumedEvent?.seq ?? 0;

      reply.hijack();
      reply.raw.writeHead(200, {
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
        "Content-Type": "text/event-stream; charset=utf-8",
        "X-Accel-Buffering": "no",
      });
      reply.raw.write("retry: 2000\n\n");

      for (const event of snapshot.events) send(event);
      isReplaying = false;
      pendingLiveEvents.sort((left, right) => left.seq - right.seq);
      for (const event of pendingLiveEvents) send(event);
      pendingLiveEvents.length = 0;

      heartbeat = setInterval(() => {
        if (isClosed) return;
        try {
          reply.raw.write(": heartbeat\n\n");
        } catch {
          close();
        }
      }, SSE_HEARTBEAT_INTERVAL_MS);
      heartbeat.unref();
      request.raw.once("close", close);
      await new Promise<void>((resolve) => request.raw.once("close", resolve));
    } catch (error: unknown) {
      unsubscribe();
      if (!reply.raw.headersSent) {
        if (error instanceof SessionServiceError) {
          reply
            .status(error.code === "SESSION_NOT_FOUND" ? 404 : 400)
            .send({ code: error.code, message: error.message });
          return;
        }
        request.log.error({ err: error, sessionId }, "Session event stream failed to start");
        reply.status(500).send({
          code: "SESSION_EVENT_STREAM_FAILED",
          message: "无法建立 Session 事件流",
        });
        return;
      }
      request.log.warn({ err: error, sessionId }, "Session event stream closed unexpectedly");
    } finally {
      close();
    }
  };
}
