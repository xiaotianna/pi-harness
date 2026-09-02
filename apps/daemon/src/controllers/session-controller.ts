import type { FastifyReply, FastifyRequest } from "fastify";
import type { HarnessConfig } from "../config/index.js";
import type {
  CreateSessionDto,
  ResolveApprovalDto,
  RetryUserMessageDto,
  SessionApprovalParamsDto,
  SessionCheckpointParamsDto,
  SessionListQueryDto,
  SessionMessageParamsDto,
  SessionParamsDto,
  SessionQueuedInputParamsDto,
  SessionRunParamsDto,
  SessionSearchQueryDto,
  StartRunDto,
  UpdateQueuedInputDto,
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
  QueuedRunInputVo,
  RunAcceptedVo,
  SessionSearchResultVo,
  SessionSnapshotVo,
  SessionVo,
} from "../vo/session-vo.js";

export class SessionController {
  public constructor(
    private readonly config: HarnessConfig,
    private readonly sessions: SessionService,
  ) {}

  public list = async (
    request: FastifyRequest<{ Querystring: SessionListQueryDto }>,
  ): Promise<readonly SessionVo[]> => this.sessions.list(request.query.archived ?? false);

  public search = async (
    request: FastifyRequest<{ Querystring: SessionSearchQueryDto }>,
    reply: FastifyReply,
  ): Promise<FastifyReply | readonly SessionSearchResultVo[]> => {
    try {
      return await this.sessions.search(request.query.query ?? "");
    } catch (error: unknown) {
      return this.sendError(request, reply, error);
    }
  };

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

  public restoreContextCheckpoint = async (
    request: FastifyRequest<{ Params: SessionCheckpointParamsDto }>,
    reply: FastifyReply,
  ): Promise<FastifyReply> => {
    if (!isMutationRequestAllowed(this.config, request)) return rejectMutation(reply);
    try {
      await this.sessions.restoreContextCheckpoint(
        request.params.sessionId,
        request.params.eventSeq,
      );
      return reply.status(204).send();
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
        request.body.thinkingLevel,
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
      const accepted = await this.sessions.startRun(request.params.sessionId, {
        attachments: request.body.attachments ?? [],
        prompt: request.body.prompt,
        references: request.body.references ?? [],
      });
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

  public retryUserMessage = async (
    request: FastifyRequest<{ Body: RetryUserMessageDto; Params: SessionMessageParamsDto }>,
    reply: FastifyReply,
  ): Promise<FastifyReply | RunAcceptedVo> => {
    if (!isMutationRequestAllowed(this.config, request)) return rejectMutation(reply);
    try {
      const accepted = await this.sessions.retryUserMessage(
        request.params.sessionId,
        request.params.messageEventId,
        request.body.prompt,
      );
      return reply.status(202).send(accepted);
    } catch (error: unknown) {
      return this.sendError(request, reply, error);
    }
  };

  public followUpRun = async (
    request: FastifyRequest<{ Body: StartRunDto; Params: SessionRunParamsDto }>,
    reply: FastifyReply,
  ): Promise<FastifyReply | QueuedRunInputVo> => {
    if (!isMutationRequestAllowed(this.config, request)) return rejectMutation(reply);
    try {
      const queued = await this.sessions.followUpRun(
        request.params.sessionId,
        request.params.runId,
        {
          attachments: request.body.attachments ?? [],
          prompt: request.body.prompt,
          references: request.body.references ?? [],
        },
      );
      return reply.status(201).send(queued);
    } catch (error: unknown) {
      return this.sendError(request, reply, error);
    }
  };

  public steerRun = async (
    request: FastifyRequest<{ Body: StartRunDto; Params: SessionRunParamsDto }>,
    reply: FastifyReply,
  ): Promise<FastifyReply> => {
    if (!isMutationRequestAllowed(this.config, request)) return rejectMutation(reply);
    try {
      await this.sessions.steerRun(request.params.sessionId, request.params.runId, {
        attachments: request.body.attachments ?? [],
        prompt: request.body.prompt,
        references: request.body.references ?? [],
      });
      return reply.status(204).send();
    } catch (error: unknown) {
      return this.sendError(request, reply, error);
    }
  };

  public listQueuedFollowUps = async (
    request: FastifyRequest<{ Params: SessionRunParamsDto }>,
    reply: FastifyReply,
  ): Promise<FastifyReply | readonly QueuedRunInputVo[]> => {
    try {
      return this.sessions
        .listQueuedFollowUps(request.params.sessionId, request.params.runId)
        .map((item) => ({
          ...item,
          attachments: [...item.attachments],
          references: [...item.references],
        }));
    } catch (error: unknown) {
      return this.sendError(request, reply, error);
    }
  };

  public updateQueuedFollowUp = async (
    request: FastifyRequest<{
      Body: UpdateQueuedInputDto;
      Params: SessionQueuedInputParamsDto;
    }>,
    reply: FastifyReply,
  ): Promise<FastifyReply | QueuedRunInputVo> => {
    if (!isMutationRequestAllowed(this.config, request)) return rejectMutation(reply);
    try {
      const item = await this.sessions.updateQueuedFollowUp(
        request.params.sessionId,
        request.params.runId,
        request.params.queuedInputId,
        request.body.prompt,
      );
      return {
        ...item,
        attachments: [...item.attachments],
        references: [...item.references],
      };
    } catch (error: unknown) {
      return this.sendError(request, reply, error);
    }
  };

  public removeQueuedFollowUp = async (
    request: FastifyRequest<{ Params: SessionQueuedInputParamsDto }>,
    reply: FastifyReply,
  ): Promise<FastifyReply> => {
    if (!isMutationRequestAllowed(this.config, request)) return rejectMutation(reply);
    try {
      await this.sessions.removeQueuedFollowUp(
        request.params.sessionId,
        request.params.runId,
        request.params.queuedInputId,
      );
      return reply.status(204).send();
    } catch (error: unknown) {
      return this.sendError(request, reply, error);
    }
  };

  public steerQueuedFollowUp = async (
    request: FastifyRequest<{ Params: SessionQueuedInputParamsDto }>,
    reply: FastifyReply,
  ): Promise<FastifyReply> => {
    if (!isMutationRequestAllowed(this.config, request)) return rejectMutation(reply);
    try {
      await this.sessions.steerQueuedFollowUp(
        request.params.sessionId,
        request.params.runId,
        request.params.queuedInputId,
      );
      return reply.status(204).send();
    } catch (error: unknown) {
      return this.sendError(request, reply, error);
    }
  };

  public revertRunChanges = async (
    request: FastifyRequest<{ Params: SessionRunParamsDto }>,
    reply: FastifyReply,
  ): Promise<FastifyReply> => {
    if (!isMutationRequestAllowed(this.config, request)) return rejectMutation(reply);
    try {
      await this.sessions.revertRunChanges(request.params.sessionId, request.params.runId);
      return reply.status(204).send();
    } catch (error: unknown) {
      return this.sendError(request, reply, error);
    }
  };

  public reapplyRunChanges = async (
    request: FastifyRequest<{ Params: SessionRunParamsDto }>,
    reply: FastifyReply,
  ): Promise<FastifyReply> => {
    if (!isMutationRequestAllowed(this.config, request)) return rejectMutation(reply);
    try {
      await this.sessions.reapplyRunChanges(request.params.sessionId, request.params.runId);
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
        error.code === "SESSION_NOT_FOUND" ||
        error.code === "RUN_NOT_FOUND" ||
        error.code === "MESSAGE_NOT_FOUND" ||
        error.code === "QUEUED_INPUT_NOT_FOUND" ||
        error.code === "CONTEXT_CHECKPOINT_NOT_FOUND"
          ? 404
          : error.code === "SESSION_BUSY" || error.code === "RUN_CHANGES_CONFLICT"
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
