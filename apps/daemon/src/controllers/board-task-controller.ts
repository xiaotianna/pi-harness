import type { FastifyReply, FastifyRequest } from "fastify";
import type { HarnessConfig } from "../config/index.js";
import type {
  BoardTaskListQueryDto,
  BoardTaskParamsDto,
  CreateBoardTaskDto,
  UpdateBoardTaskDto,
} from "../dto/board-task-dto.js";
import {
  BoardTaskErrorCode,
  type BoardTaskService,
  BoardTaskServiceError,
} from "../services/board-task-service.js";
import { isMutationRequestAllowed, rejectMutation } from "../utils/request-security.js";

export class BoardTaskController {
  public constructor(
    private readonly config: HarnessConfig,
    private readonly tasks: BoardTaskService,
  ) {}

  public list = (request: FastifyRequest<{ Querystring: BoardTaskListQueryDto }>) =>
    this.tasks.list(request.query.workspaceId);

  public create = async (
    request: FastifyRequest<{ Body: CreateBoardTaskDto }>,
    reply: FastifyReply,
  ) => {
    if (!isMutationRequestAllowed(this.config, request)) return rejectMutation(reply);
    try {
      return await this.tasks.create(request.body);
    } catch (error: unknown) {
      return this.sendError(reply, error);
    }
  };

  public update = async (
    request: FastifyRequest<{ Body: UpdateBoardTaskDto; Params: BoardTaskParamsDto }>,
    reply: FastifyReply,
  ) => {
    if (!isMutationRequestAllowed(this.config, request)) return rejectMutation(reply);
    try {
      return await this.tasks.update(request.params.taskId, request.body);
    } catch (error: unknown) {
      return this.sendError(reply, error);
    }
  };

  private sendError(reply: FastifyReply, error: unknown): FastifyReply {
    if (error instanceof BoardTaskServiceError) {
      const status =
        error.code === BoardTaskErrorCode.NOT_FOUND
          ? 404
          : error.code === BoardTaskErrorCode.RUN_CONFLICT
            ? 409
            : 400;
      return reply.status(status).send({ code: error.code, message: error.message });
    }
    throw error;
  }
}
