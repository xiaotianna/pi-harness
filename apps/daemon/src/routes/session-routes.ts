import type { FastifyInstance } from "fastify";
import { Type } from "typebox";
import type { HarnessConfig } from "../config/index.js";
import { SessionController } from "../controllers/session-controller.js";
import { SessionEventsController } from "../controllers/session-events-controller.js";
import {
  type CreateSessionDto,
  CreateSessionDtoSchema,
  type SessionEventsQueryDto,
  SessionEventsQueryDtoSchema,
  type SessionParamsDto,
  SessionParamsDtoSchema,
  type SessionRunParamsDto,
  SessionRunParamsDtoSchema,
  type StartRunDto,
  StartRunDtoSchema,
  type UpdateSessionDto,
  UpdateSessionDtoSchema,
  type UpdateSessionModelDto,
  UpdateSessionModelDtoSchema,
} from "../dto/session-dto.js";
import type { SessionService } from "../services/session-service.js";
import type { SessionEventBroker } from "../sse/session-event-broker.js";
import { ApiErrorVoSchema } from "../vo/auth-vo.js";
import {
  RunAcceptedVoSchema,
  SessionListVoSchema,
  SessionSnapshotVoSchema,
  SessionVoSchema,
} from "../vo/session-vo.js";

export async function registerSessionRoutes(
  server: FastifyInstance,
  config: HarnessConfig,
  sessions: SessionService,
  broker: SessionEventBroker,
): Promise<void> {
  const controller = new SessionController(config, sessions);
  const eventsController = new SessionEventsController(sessions, broker);
  const errors = {
    400: ApiErrorVoSchema,
    403: ApiErrorVoSchema,
    404: ApiErrorVoSchema,
    409: ApiErrorVoSchema,
    500: ApiErrorVoSchema,
  };

  server.get(
    "/api/sessions",
    { schema: { response: { 200: SessionListVoSchema } } },
    controller.list,
  );

  server.post<{ Body: CreateSessionDto }>(
    "/api/sessions",
    {
      schema: {
        body: CreateSessionDtoSchema,
        response: { 200: SessionVoSchema, ...errors },
      },
    },
    controller.create,
  );

  server.get<{ Params: SessionParamsDto }>(
    "/api/sessions/:sessionId",
    {
      schema: {
        params: SessionParamsDtoSchema,
        response: { 200: SessionSnapshotVoSchema, ...errors },
      },
    },
    controller.get,
  );

  server.patch<{ Body: UpdateSessionDto; Params: SessionParamsDto }>(
    "/api/sessions/:sessionId",
    {
      schema: {
        body: UpdateSessionDtoSchema,
        params: SessionParamsDtoSchema,
        response: { 200: SessionVoSchema, ...errors },
      },
    },
    controller.update,
  );

  server.patch<{ Body: UpdateSessionModelDto; Params: SessionParamsDto }>(
    "/api/sessions/:sessionId/model",
    {
      schema: {
        body: UpdateSessionModelDtoSchema,
        params: SessionParamsDtoSchema,
        response: { 200: SessionVoSchema, ...errors },
      },
    },
    controller.updateModel,
  );

  server.post<{ Body: StartRunDto; Params: SessionParamsDto }>(
    "/api/sessions/:sessionId/runs",
    {
      schema: {
        body: StartRunDtoSchema,
        params: SessionParamsDtoSchema,
        response: { 202: RunAcceptedVoSchema, ...errors },
      },
    },
    controller.startRun,
  );

  server.delete<{ Params: SessionRunParamsDto }>(
    "/api/sessions/:sessionId/runs/:runId",
    {
      schema: {
        params: SessionRunParamsDtoSchema,
        response: { 204: Type.Null(), ...errors },
      },
    },
    controller.abortRun,
  );

  server.get<{ Params: SessionParamsDto; Querystring: SessionEventsQueryDto }>(
    "/api/sessions/:sessionId/events",
    {
      schema: {
        params: SessionParamsDtoSchema,
        querystring: SessionEventsQueryDtoSchema,
      },
    },
    eventsController.stream,
  );
}
