import type { FastifyReply, FastifyRequest } from "fastify";
import type { HarnessConfig } from "../config/index.js";
import type {
  InstallWorkspaceSkillDto,
  OpenWorkspacePathDto,
  ReorderWorkspacesDto,
  UpdateWorkspaceDto,
  UpdateWorkspaceSkillDto,
  WorkspaceParamsDto,
  WorkspaceSkillParamsDto,
  WritableWorkspaceSkillParamsDto,
} from "../dto/workspace-dto.js";
import { type WorkspaceService, WorkspaceServiceError } from "../services/workspace-service.js";
import { isMutationRequestAllowed, rejectMutation } from "../utils/request-security.js";
import type {
  WorkspaceContextItemVo,
  WorkspaceSkillContentVo,
  WorkspaceSkillInstallVo,
  WorkspaceSkillVo,
  WorkspaceVo,
} from "../vo/workspace-vo.js";

export class WorkspaceController {
  public constructor(
    private readonly config: HarnessConfig,
    private readonly workspaces: WorkspaceService,
  ) {}

  public list = async (): Promise<readonly WorkspaceVo[]> => this.workspaces.list();

  public listContextItems = async (
    request: FastifyRequest<{ Params: WorkspaceParamsDto }>,
    reply: FastifyReply,
  ): Promise<FastifyReply | readonly WorkspaceContextItemVo[]> => {
    const abortController = new AbortController();
    const handleAborted = () => abortController.abort();
    request.raw.once("aborted", handleAborted);
    try {
      return await this.workspaces.listContextItems(
        request.params.workspaceId,
        abortController.signal,
      );
    } catch (error: unknown) {
      return this.sendError(request, reply, error);
    } finally {
      request.raw.off("aborted", handleAborted);
    }
  };

  public listSkills = async (
    request: FastifyRequest<{ Params: WorkspaceParamsDto }>,
    reply: FastifyReply,
  ): Promise<FastifyReply | readonly WorkspaceSkillVo[]> => {
    try {
      return await this.workspaces.listSkills(request.params.workspaceId);
    } catch (error: unknown) {
      return this.sendError(request, reply, error);
    }
  };

  public installSkill = async (
    request: FastifyRequest<{ Body: InstallWorkspaceSkillDto; Params: WorkspaceParamsDto }>,
    reply: FastifyReply,
  ): Promise<FastifyReply | WorkspaceSkillInstallVo> => {
    if (!isMutationRequestAllowed(this.config, request)) return rejectMutation(reply);
    const abortController = new AbortController();
    const handleAborted = () => abortController.abort();
    request.raw.once("aborted", handleAborted);

    try {
      return await this.workspaces.installSkill(
        request.params.workspaceId,
        request.body,
        abortController.signal,
      );
    } catch (error: unknown) {
      return this.sendError(request, reply, error);
    } finally {
      request.raw.off("aborted", handleAborted);
    }
  };

  public getSkillContent = async (
    request: FastifyRequest<{ Params: WorkspaceSkillParamsDto }>,
    reply: FastifyReply,
  ): Promise<FastifyReply | WorkspaceSkillContentVo> => {
    try {
      return await this.workspaces.getSkillContent(
        request.params.workspaceId,
        request.params.name,
        request.params.scope,
      );
    } catch (error: unknown) {
      return this.sendError(request, reply, error);
    }
  };

  public openPath = async (
    request: FastifyRequest<{ Body: OpenWorkspacePathDto; Params: WorkspaceParamsDto }>,
    reply: FastifyReply,
  ): Promise<FastifyReply> => {
    if (!isMutationRequestAllowed(this.config, request)) return rejectMutation(reply);
    const abortController = new AbortController();
    const handleAborted = () => abortController.abort();
    request.raw.once("aborted", handleAborted);

    try {
      await this.workspaces.openPath(
        request.params.workspaceId,
        request.body.path,
        abortController.signal,
      );
      return reply.status(204).send();
    } catch (error: unknown) {
      return this.sendError(request, reply, error);
    } finally {
      request.raw.off("aborted", handleAborted);
    }
  };

  public openSkillDirectory = async (
    request: FastifyRequest<{ Params: WritableWorkspaceSkillParamsDto }>,
    reply: FastifyReply,
  ): Promise<FastifyReply> => {
    if (!isMutationRequestAllowed(this.config, request)) return rejectMutation(reply);
    const abortController = new AbortController();
    const handleAborted = () => abortController.abort();
    request.raw.once("aborted", handleAborted);

    try {
      await this.workspaces.openSkillDirectory(
        request.params.workspaceId,
        request.params.name,
        request.params.scope,
        abortController.signal,
      );
      return reply.status(204).send();
    } catch (error: unknown) {
      return this.sendError(request, reply, error);
    } finally {
      request.raw.off("aborted", handleAborted);
    }
  };

  public removeSkill = async (
    request: FastifyRequest<{ Params: WritableWorkspaceSkillParamsDto }>,
    reply: FastifyReply,
  ): Promise<FastifyReply> => {
    if (!isMutationRequestAllowed(this.config, request)) return rejectMutation(reply);
    try {
      await this.workspaces.removeSkill(
        request.params.workspaceId,
        request.params.name,
        request.params.scope,
      );
      return reply.status(204).send();
    } catch (error: unknown) {
      return this.sendError(request, reply, error);
    }
  };

  public updateSkill = async (
    request: FastifyRequest<{
      Body: UpdateWorkspaceSkillDto;
      Params: WritableWorkspaceSkillParamsDto;
    }>,
    reply: FastifyReply,
  ): Promise<FastifyReply> => {
    if (!isMutationRequestAllowed(this.config, request)) return rejectMutation(reply);
    try {
      await this.workspaces.setSkillEnabled(
        request.params.workspaceId,
        request.params.name,
        request.params.scope,
        request.body.isEnabled,
      );
      return reply.status(204).send();
    } catch (error: unknown) {
      return this.sendError(request, reply, error);
    }
  };

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
          : error.code === "WORKSPACE_PICKER_BUSY" || error.code === "SKILL_INSTALL_CONFLICT"
            ? 409
            : error.code === "WORKSPACE_PICKER_UNAVAILABLE" ||
                error.code === "WORKSPACE_OPEN_UNAVAILABLE" ||
                error.code === "WORKSPACE_REVEAL_UNAVAILABLE" ||
                error.code === "SKILL_INSTALL_UNAVAILABLE"
              ? 501
              : error.code === "WORKSPACE_OPEN_FAILED" ||
                  error.code === "WORKSPACE_PICKER_FAILED" ||
                  error.code === "WORKSPACE_REVEAL_FAILED" ||
                  error.code === "SKILL_INSTALL_FAILED"
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
