import {
  type CreateMemoryInput,
  type DeleteMemoryInput,
  MemoryError,
  MemoryErrorCode,
  type MemoryParams,
  type MemoryRecord,
  type MemoryService,
  type MemorySettings,
  type MemoryState,
  type UpdateMemoryInput,
  type UpdateMemorySettingsInput,
} from "@pi-harness/memory";
import type { FastifyReply, FastifyRequest } from "fastify";
import type { HarnessConfig } from "../config/index.js";
import { isMutationRequestAllowed, rejectMutation } from "../utils/request-security.js";

export class MemoryController {
  public constructor(
    private readonly config: HarnessConfig,
    private readonly memories: MemoryService,
  ) {}

  public list = async (
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<MemoryState | FastifyReply> => {
    try {
      return this.memories.getState();
    } catch (error: unknown) {
      return this.sendError(request, reply, error);
    }
  };

  public create = async (
    request: FastifyRequest<{ Body: CreateMemoryInput }>,
    reply: FastifyReply,
  ): Promise<MemoryRecord | FastifyReply> => {
    if (!isMutationRequestAllowed(this.config, request)) return rejectMutation(reply);
    try {
      return await this.withRequestSignal(reply, (signal) =>
        this.memories.createManual(request.body, signal),
      );
    } catch (error: unknown) {
      return this.sendError(request, reply, error);
    }
  };

  public update = async (
    request: FastifyRequest<{ Body: UpdateMemoryInput; Params: MemoryParams }>,
    reply: FastifyReply,
  ): Promise<MemoryRecord | FastifyReply> => {
    if (!isMutationRequestAllowed(this.config, request)) return rejectMutation(reply);
    try {
      return await this.withRequestSignal(reply, (signal) =>
        this.memories.update(request.params.memoryId, request.body, signal),
      );
    } catch (error: unknown) {
      return this.sendError(request, reply, error);
    }
  };

  public remove = async (
    request: FastifyRequest<{ Body: DeleteMemoryInput; Params: MemoryParams }>,
    reply: FastifyReply,
  ): Promise<FastifyReply> => {
    if (!isMutationRequestAllowed(this.config, request)) return rejectMutation(reply);
    try {
      await this.memories.delete(request.params.memoryId, request.body.expectedRevision);
      return reply.status(204).send();
    } catch (error: unknown) {
      return this.sendError(request, reply, error);
    }
  };

  public updateSettings = async (
    request: FastifyRequest<{ Body: UpdateMemorySettingsInput }>,
    reply: FastifyReply,
  ): Promise<MemorySettings | FastifyReply> => {
    if (!isMutationRequestAllowed(this.config, request)) return rejectMutation(reply);
    try {
      return await this.memories.updateSettings(request.body);
    } catch (error: unknown) {
      return this.sendError(request, reply, error);
    }
  };

  private sendError(request: FastifyRequest, reply: FastifyReply, error: unknown): FastifyReply {
    if (error instanceof MemoryError) {
      const status =
        error.code === MemoryErrorCode.INVALID
          ? 400
          : error.code === MemoryErrorCode.EMBEDDING_FAILED
            ? 502
            : error.code === MemoryErrorCode.NOT_FOUND ||
                error.code === MemoryErrorCode.WORKSPACE_NOT_FOUND
              ? 404
              : 409;
      return reply.status(status).send({ code: error.code, message: error.message });
    }
    request.log.error({ err: error }, "Memory operation failed");
    return reply.status(500).send({
      code: "MEMORY_OPERATION_FAILED",
      message: "记忆操作失败",
    });
  }

  private async withRequestSignal<T>(
    reply: FastifyReply,
    operation: (signal: AbortSignal) => Promise<T>,
  ): Promise<T> {
    const controller = new AbortController();
    const abort = () => {
      if (!reply.raw.writableEnded) controller.abort();
    };
    reply.raw.once("close", abort);
    try {
      return await operation(controller.signal);
    } finally {
      reply.raw.off("close", abort);
    }
  }
}
