import type { FastifyReply, FastifyRequest } from "fastify";
import type { HarnessConfig } from "../config/index.js";
import type {
  CreateSessionDto,
  ResolveApprovalDto,
  SessionApprovalParamsDto,
  SessionParamsDto,
  SessionRunParamsDto,
  StartRunDto,
  UpdateSessionDto,
  UpdateSessionModelDto,
} from "../dto/session-dto.js";
import {
  HumanInteractionErrorCode,
  HumanInteractionServiceError,
} from "../services/human-interaction-service.js";
import { ProviderServiceError } from "../services/provider-service.js";
import { type SessionService, SessionServiceError } from "../services/session-service.js";
import { isMutationRequestAllowed, rejectMutation } from "../utils/request-security.js";
import type {
  PendingToolApprovalVo,
  RunAcceptedVo,
  SessionSnapshotVo,
  SessionVo,
} from "../vo/session-vo.js";

export class SessionController {
  public constructor(
    private readonly config: HarnessConfig,
    private readonly sessions: SessionService,
  ) {}

  public list = async (): Promise<readonly SessionVo[]> => this.sessions.list();

  public create = async (
    request: FastifyRequest<{ Body: CreateSessionDto }>,
    reply: FastifyReply,
  ): Promise<FastifyReply | SessionVo> => {
    if (!isMutationRequestAllowed(this.config, request)) return rejectMutation(reply);
    try {
      return await this.sessions.create(request.body);
    } catch (error: unknown) {
      return this.sendError(request, reply, error);
    }
  };

  public get = async (
    request: FastifyRequest<{ Params: SessionParamsDto }>,
    reply: FastifyReply,
  ): Promise<FastifyReply | SessionSnapshotVo> => {
    try {
      const snapshot = await this.sessions.getSnapshot(request.params.sessionId);
      return { events: [...snapshot.events], session: snapshot.session };
    } catch (error: unknown) {
      return this.sendError(request, reply, error);
    }
  };

  public updateModel = async (
    request: FastifyRequest<{ Body: UpdateSessionModelDto; Params: SessionParamsDto }>,
    reply: FastifyReply,
  ): Promise<FastifyReply | SessionVo> => {
    if (!isMutationRequestAllowed(this.config, request)) return rejectMutation(reply);
    try {
      return await this.sessions.updateModel(
        request.params.sessionId,
        request.body.providerId,
        request.body.modelId,
      );
    } catch (error: unknown) {
      return this.sendError(request, reply, error);
    }
  };

  public update = async (
    request: FastifyRequest<{ Body: UpdateSessionDto; Params: SessionParamsDto }>,
    reply: FastifyReply,
  ): Promise<FastifyReply | SessionVo> => {
    if (!isMutationRequestAllowed(this.config, request)) return rejectMutation(reply);
    try {
      return this.sessions.update(request.params.sessionId, request.body);
    } catch (error: unknown) {
      return this.sendError(request, reply, error);
    }
  };

  public startRun = async (
    request: FastifyRequest<{ Body: StartRunDto; Params: SessionParamsDto }>,
    reply: FastifyReply,
  ): Promise<FastifyReply | RunAcceptedVo> => {
    if (!isMutationRequestAllowed(this.config, request)) return rejectMutation(reply);
    try {
      const accepted = await this.sessions.startRun(request.params.sessionId, request.body.prompt);
      return reply.status(202).send(accepted);
    } catch (error: unknown) {
      return this.sendError(request, reply, error);
    }
  };

  public abortRun = async (
    request: FastifyRequest<{ Params: SessionRunParamsDto }>,
    reply: FastifyReply,
  ): Promise<FastifyReply> => {
    if (!isMutationRequestAllowed(this.config, request)) return rejectMutation(reply);
    try {
      this.sessions.abortRun(request.params.sessionId, request.params.runId);
      return reply.status(204).send();
    } catch (error: unknown) {
      return this.sendError(request, reply, error);
    }
  };

  public getPendingApproval = async (
    request: FastifyRequest<{ Params: SessionRunParamsDto }>,
    reply: FastifyReply,
  ): Promise<FastifyReply | PendingToolApprovalVo | null> => {
    try {
      return this.sessions.getPendingApproval(request.params.sessionId, request.params.runId);
    } catch (error: unknown) {
      return this.sendError(request, reply, error);
    }
  };

  public resolveApproval = async (
    request: FastifyRequest<{ Body: ResolveApprovalDto; Params: SessionApprovalParamsDto }>,
    reply: FastifyReply,
  ): Promise<FastifyReply> => {
    if (!isMutationRequestAllowed(this.config, request)) return rejectMutation(reply);
    try {
      this.sessions.resolveApproval(
        request.params.sessionId,
        request.params.runId,
        request.params.approvalId,
        request.body.decision,
      );
      return reply.status(204).send();
    } catch (error: unknown) {
      return this.sendError(request, reply, error);
    }
  };

  private sendError(request: FastifyRequest, reply: FastifyReply, error: unknown): FastifyReply {
    if (error instanceof SessionServiceError) {
      const status =
        error.code === "SESSION_NOT_FOUND" || error.code === "RUN_NOT_FOUND"
          ? 404
          : error.code === "SESSION_BUSY"
            ? 409
            : 400;
      return reply.status(status).send({ code: error.code, message: error.message });
    }

    if (error instanceof ProviderServiceError) {
      const status =
        error.code === "PROVIDER_NOT_FOUND" ? 404 : error.code === "PROVIDER_IN_USE" ? 409 : 400;
      return reply.status(status).send({ code: error.code, message: error.message });
    }

    if (error instanceof HumanInteractionServiceError) {
      return reply
        .status(error.code === HumanInteractionErrorCode.CONFLICT ? 409 : 404)
        .send({ code: error.code, message: error.message });
    }

    request.log.error({ err: error }, "Session operation failed");
    return reply.status(500).send({
      code: "SESSION_OPERATION_FAILED",
      message: "Session 操作失败",
    });
  }
}
