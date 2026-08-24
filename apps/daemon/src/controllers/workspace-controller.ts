import type { FastifyReply, FastifyRequest } from "fastify";
import type { HarnessConfig } from "../config/index.js";
import type {
  ReorderWorkspacesDto,
  UpdateWorkspaceDto,
  WorkspaceParamsDto,
} from "../dto/workspace-dto.js";
import { type WorkspaceService, WorkspaceServiceError } from "../services/workspace-service.js";
import { isMutationRequestAllowed, rejectMutation } from "../utils/request-security.js";
import type { WorkspaceVo } from "../vo/workspace-vo.js";

export class WorkspaceController {
  public constructor(
    private readonly config: HarnessConfig,
    private readonly workspaces: WorkspaceService,
  ) {}

  public list = async (): Promise<readonly WorkspaceVo[]> => this.workspaces.list();

  public remove = async (
    request: FastifyRequest<{ Params: WorkspaceParamsDto }>,
    reply: FastifyReply,
  ): Promise<FastifyReply> => {
    if (!isMutationRequestAllowed(this.config, request)) return rejectMutation(reply);
    try {
      this.workspaces.remove(request.params.workspaceId);
      return reply.status(204).send();
    } catch (error: unknown) {
      return this.sendError(request, reply, error);
    }
  };

  public reorder = async (
    request: FastifyRequest<{ Body: ReorderWorkspacesDto }>,
    reply: FastifyReply,
  ): Promise<FastifyReply | readonly WorkspaceVo[]> => {
    if (!isMutationRequestAllowed(this.config, request)) return rejectMutation(reply);
    try {
      return this.workspaces.reorder(request.body.workspaceIds);
    } catch (error: unknown) {
      return this.sendError(request, reply, error);
    }
  };

  public reveal = async (
    request: FastifyRequest<{ Params: WorkspaceParamsDto }>,
    reply: FastifyReply,
  ): Promise<FastifyReply> => {
    if (!isMutationRequestAllowed(this.config, request)) return rejectMutation(reply);
    const abortController = new AbortController();
    const handleAborted = () => abortController.abort();
    request.raw.once("aborted", handleAborted);

    try {
      await this.workspaces.reveal(request.params.workspaceId, abortController.signal);
      return reply.status(204).send();
    } catch (error: unknown) {
      return this.sendError(request, reply, error);
    } finally {
      request.raw.off("aborted", handleAborted);
    }
  };

  public select = async (
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<FastifyReply | WorkspaceVo> => {
    if (!isMutationRequestAllowed(this.config, request)) return rejectMutation(reply);

    const abortController = new AbortController();
    const handleAborted = () => abortController.abort();
    request.raw.once("aborted", handleAborted);

    try {
      const workspace = await this.workspaces.select(abortController.signal);
      return workspace ?? reply.status(204).send();
    } catch (error: unknown) {
      return this.sendError(request, reply, error);
    } finally {
      request.raw.off("aborted", handleAborted);
    }
  };

  public update = async (
    request: FastifyRequest<{ Body: UpdateWorkspaceDto; Params: WorkspaceParamsDto }>,
    reply: FastifyReply,
  ): Promise<FastifyReply | WorkspaceVo> => {
    if (!isMutationRequestAllowed(this.config, request)) return rejectMutation(reply);
    try {
      return this.workspaces.updateName(request.params.workspaceId, request.body.name);
    } catch (error: unknown) {
      return this.sendError(request, reply, error);
    }
  };

  private sendError(request: FastifyRequest, reply: FastifyReply, error: unknown): FastifyReply {
    if (error instanceof WorkspaceServiceError) {
      const status =
        error.code === "WORKSPACE_NOT_FOUND"
          ? 404
          : error.code === "WORKSPACE_PICKER_BUSY"
            ? 409
            : error.code === "WORKSPACE_PICKER_UNAVAILABLE" ||
                error.code === "WORKSPACE_REVEAL_UNAVAILABLE"
              ? 501
              : error.code === "WORKSPACE_PICKER_FAILED" || error.code === "WORKSPACE_REVEAL_FAILED"
                ? 500
                : 400;
      return reply.status(status).send({ code: error.code, message: error.message });
    }

    request.log.error({ err: error }, "Workspace operation failed");
    return reply.status(500).send({
      code: "WORKSPACE_OPERATION_FAILED",
      message: "Workspace 操作失败",
    });
  }
}
