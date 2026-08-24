import type { FastifyReply, FastifyRequest } from "fastify";
import type { HarnessConfig } from "../config/index.js";
import type {
  CreateProviderDto,
  CustomProviderConnectionTestDto,
  ProviderConnectionTestDto,
  ProviderCredentialDto,
  ProviderOAuthPromptAnswerDto,
  ProviderParamsDto,
  UpdateProviderDto,
} from "../dto/provider-dto.js";
import { type ProviderService, ProviderServiceError } from "../services/provider-service.js";
import { isMutationRequestAllowed, rejectMutation } from "../utils/request-security.js";
import type { ProviderOAuthStateVo, ProviderVo } from "../vo/provider-vo.js";

export class ProviderController {
  public constructor(
    private readonly config: HarnessConfig,
    private readonly providers: ProviderService,
  ) {}

  public list = async (): Promise<readonly ProviderVo[]> => this.providers.list();

  public create = async (
    request: FastifyRequest<{ Body: CreateProviderDto }>,
    reply: FastifyReply,
  ): Promise<FastifyReply | ProviderVo> => {
    if (!isMutationRequestAllowed(this.config, request)) return rejectMutation(reply);
    try {
      return await this.providers.createProvider(request.body);
    } catch (error: unknown) {
      return this.sendError(request, reply, error);
    }
  };

  public update = async (
    request: FastifyRequest<{ Body: UpdateProviderDto; Params: ProviderParamsDto }>,
    reply: FastifyReply,
  ): Promise<FastifyReply | ProviderVo> => {
    if (!isMutationRequestAllowed(this.config, request)) return rejectMutation(reply);
    try {
      return await this.providers.updateProvider(request.params.providerId, request.body);
    } catch (error: unknown) {
      return this.sendError(request, reply, error);
    }
  };

  public remove = async (
    request: FastifyRequest<{ Params: ProviderParamsDto }>,
    reply: FastifyReply,
  ): Promise<FastifyReply> => {
    if (!isMutationRequestAllowed(this.config, request)) return rejectMutation(reply);
    try {
      await this.providers.deleteProvider(request.params.providerId);
      return reply.status(204).send();
    } catch (error: unknown) {
      return this.sendError(request, reply, error);
    }
  };

  public saveCredential = async (
    request: FastifyRequest<{ Body: ProviderCredentialDto; Params: ProviderParamsDto }>,
    reply: FastifyReply,
  ): Promise<FastifyReply> => {
    if (!isMutationRequestAllowed(this.config, request)) return rejectMutation(reply);
    try {
      await this.providers.saveApiKey(request.params.providerId, request.body.apiKey);
      return reply.status(204).send();
    } catch (error: unknown) {
      return this.sendError(request, reply, error);
    }
  };

  public removeCredential = async (
    request: FastifyRequest<{ Params: ProviderParamsDto }>,
    reply: FastifyReply,
  ): Promise<FastifyReply> => {
    if (!isMutationRequestAllowed(this.config, request)) return rejectMutation(reply);
    try {
      await this.providers.deleteCredential(request.params.providerId);
      return reply.status(204).send();
    } catch (error: unknown) {
      return this.sendError(request, reply, error);
    }
  };

  public startOAuth = async (
    request: FastifyRequest<{ Params: ProviderParamsDto }>,
    reply: FastifyReply,
  ): Promise<FastifyReply | ProviderOAuthStateVo> => {
    if (!isMutationRequestAllowed(this.config, request)) return rejectMutation(reply);
    try {
      return this.providers.startOAuth(request.params.providerId);
    } catch (error: unknown) {
      return this.sendError(request, reply, error);
    }
  };

  public getOAuthState = async (
    request: FastifyRequest<{ Params: ProviderParamsDto }>,
    reply: FastifyReply,
  ): Promise<FastifyReply | ProviderOAuthStateVo> => {
    try {
      return this.providers.getOAuthState(request.params.providerId);
    } catch (error: unknown) {
      return this.sendError(request, reply, error);
    }
  };

  public answerOAuthPrompt = async (
    request: FastifyRequest<{
      Body: ProviderOAuthPromptAnswerDto;
      Params: ProviderParamsDto;
    }>,
    reply: FastifyReply,
  ): Promise<FastifyReply> => {
    if (!isMutationRequestAllowed(this.config, request)) return rejectMutation(reply);
    try {
      this.providers.answerOAuthPrompt(
        request.params.providerId,
        request.body.promptId,
        request.body.value,
      );
      return reply.status(204).send();
    } catch (error: unknown) {
      return this.sendError(request, reply, error);
    }
  };

  public cancelOAuth = async (
    request: FastifyRequest<{ Params: ProviderParamsDto }>,
    reply: FastifyReply,
  ): Promise<FastifyReply> => {
    if (!isMutationRequestAllowed(this.config, request)) return rejectMutation(reply);
    try {
      await this.providers.cancelOAuth(request.params.providerId);
      return reply.status(204).send();
    } catch (error: unknown) {
      return this.sendError(request, reply, error);
    }
  };

  public testConnection = async (
    request: FastifyRequest<{ Body: ProviderConnectionTestDto; Params: ProviderParamsDto }>,
    reply: FastifyReply,
  ): Promise<FastifyReply> => {
    if (!isMutationRequestAllowed(this.config, request)) return rejectMutation(reply);
    try {
      await this.providers.testConnection(
        request.params.providerId,
        request.body.modelId,
        request.body.apiKey,
      );
      return reply.status(204).send();
    } catch (error: unknown) {
      return this.sendError(request, reply, error);
    }
  };

  public testCustomConnection = async (
    request: FastifyRequest<{ Body: CustomProviderConnectionTestDto }>,
    reply: FastifyReply,
  ): Promise<FastifyReply> => {
    if (!isMutationRequestAllowed(this.config, request)) return rejectMutation(reply);
    try {
      await this.providers.testCustomConnection(request.body);
      return reply.status(204).send();
    } catch (error: unknown) {
      return this.sendError(request, reply, error);
    }
  };

  private sendError(request: FastifyRequest, reply: FastifyReply, error: unknown): FastifyReply {
    if (error instanceof ProviderServiceError) {
      const status =
        error.code === "PROVIDER_NOT_FOUND" || error.code === "PROVIDER_OAUTH_NOT_STARTED"
          ? 404
          : error.code === "PROVIDER_OAUTH_PROMPT_NOT_FOUND" || error.code === "PROVIDER_IN_USE"
            ? 409
            : error.code === "PROVIDER_CONNECTION_FAILED"
              ? 502
              : 400;
      return reply.status(status).send({ code: error.code, message: error.message });
    }

    request.log.error({ err: error }, "Provider operation failed");
    return reply.status(500).send({
      code: "PROVIDER_OPERATION_FAILED",
      message: "Provider 操作失败",
    });
  }
}
