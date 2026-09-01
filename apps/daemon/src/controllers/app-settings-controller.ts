import type { FastifyReply, FastifyRequest } from "fastify";
import type { HarnessConfig } from "../config/index.js";
import type { UpdateAppSettingsDto } from "../dto/app-settings-dto.js";
import type { AppSettingsService } from "../services/app-settings-service.js";
import { isMutationRequestAllowed, rejectMutation } from "../utils/request-security.js";
import type { AppSettingsVo } from "../vo/app-settings-vo.js";

export class AppSettingsController {
  public constructor(
    private readonly config: HarnessConfig,
    private readonly settings: AppSettingsService,
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

  private sendError(request: FastifyRequest, reply: FastifyReply, error: unknown): FastifyReply {
    request.log.error({ err: error }, "App settings operation failed");
    return reply.status(500).send({
      code: "APP_SETTINGS_OPERATION_FAILED",
      message: "应用设置操作失败",
    });
  }
}
