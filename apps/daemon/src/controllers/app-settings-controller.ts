import type { FastifyReply, FastifyRequest } from "fastify";
import type { HarnessConfig } from "../config/index.js";
import type { UpdateAppSettingsDto } from "../dto/app-settings-dto.js";
import type { AppSettingsService } from "../services/app-settings-service.js";
import {
  FileOpenErrorCode,
  type FileOpenService,
  FileOpenServiceError,
} from "../services/file-open-service.js";
import { isMutationRequestAllowed, rejectMutation } from "../utils/request-security.js";
import type { AppSettingsVo } from "../vo/app-settings-vo.js";

export class AppSettingsController {
  public constructor(
    private readonly config: HarnessConfig,
    private readonly settings: AppSettingsService,
    private readonly fileOpen: FileOpenService,
  ) {}

  public get = async (
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<AppSettingsVo | FastifyReply> => {
    try {
      return this.settings.get();
    } catch (error: unknown) {
      return this.sendError(request, reply, error);
    }
  };

  public update = async (
    request: FastifyRequest<{ Body: UpdateAppSettingsDto }>,
    reply: FastifyReply,
  ): Promise<AppSettingsVo | FastifyReply> => {
    if (!isMutationRequestAllowed(this.config, request)) return rejectMutation(reply);
    try {
      return this.settings.update(request.body);
    } catch (error: unknown) {
      return this.sendError(request, reply, error);
    }
  };

  public selectFileOpenApplication = async (
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<AppSettingsVo | FastifyReply> => {
    if (!isMutationRequestAllowed(this.config, request)) return rejectMutation(reply);
    const abortController = new AbortController();
    const handleAborted = () => abortController.abort();
    request.raw.once("aborted", handleAborted);
    try {
      const selected = await this.fileOpen.selectDefaultApplication(abortController.signal);
      return selected ? this.settings.get() : reply.status(204).send();
    } catch (error: unknown) {
      return this.sendError(request, reply, error);
    } finally {
      request.raw.off("aborted", handleAborted);
    }
  };

  private sendError(request: FastifyRequest, reply: FastifyReply, error: unknown): FastifyReply {
    if (error instanceof FileOpenServiceError) {
      const status =
        error.code === FileOpenErrorCode.PICKER_BUSY
          ? 409
          : error.code === FileOpenErrorCode.PICKER_UNAVAILABLE
            ? 501
            : 500;
      return reply.status(status).send({ code: error.code, message: error.message });
    }
    request.log.error({ err: error }, "App settings operation failed");
    return reply.status(500).send({
      code: "APP_SETTINGS_OPERATION_FAILED",
      message: "应用设置操作失败",
    });
  }
}
