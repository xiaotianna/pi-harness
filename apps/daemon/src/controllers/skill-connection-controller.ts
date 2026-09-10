import { timingSafeEqual } from "node:crypto";
import { AVAILABLE_PLUGINS, SkillType } from "@pi-harness/tools";
import type { FastifyReply, FastifyRequest } from "fastify";
import type { HarnessConfig } from "../config/index.js";
import type { SkillOAuthCallbackDto } from "../dto/auth-dto.js";
import type {
  SkillCollectionSkillParamsDto,
  SkillConnectionParamsDto,
  SkillGatewayParamsDto,
  UpdateSkillCollectionSkillDto,
} from "../dto/skill-connection-dto.js";
import {
  SkillConnectionError,
  SkillConnectionErrorCode,
  type SkillConnectionService,
} from "../services/skill-connection-service.js";
import { isMutationRequestAllowed, rejectMutation } from "../utils/request-security.js";
import { resolveSkillIcon } from "../utils/skill-icon.js";
import type {
  SkillCollectionSkillContentVo,
  SkillCollectionVo,
  SkillConnectionStatusVo,
  SkillOAuthStartVo,
} from "../vo/skill-connection-vo.js";

export class SkillConnectionController {
  public constructor(
    private readonly config: HarnessConfig,
    private readonly connections: SkillConnectionService,
    private readonly gatewayToken: string,
  ) {}

  public listCollections = async (): Promise<readonly SkillCollectionVo[]> =>
    AVAILABLE_PLUGINS.map((collection) => ({
      category: collection.category,
      description: collection.description,
      id: collection.id,
      isInstalled: this.connections.isInstalled(collection.id),
      logo: collection.logo ?? null,
      name: collection.name,
      skills: collection.skills.map((skill) => ({
        description: skill.description,
        icon: resolveSkillIcon(collection.id, skill.id),
        id: skill.id,
        isEnabled: this.connections.isSkillEnabled(collection.id, skill.id),
        name: skill.displayName ?? skill.name,
        type: skill.type ?? SkillType.NONE,
      })),
      type: collection.type,
    }));

  public getStatus = async (
    request: FastifyRequest<{ Params: SkillConnectionParamsDto }>,
    reply: FastifyReply,
  ): Promise<FastifyReply | SkillConnectionStatusVo> => {
    try {
      return this.connections.getStatus(request.params.collectionId);
    } catch (cause: unknown) {
      if (!(cause instanceof SkillConnectionError)) throw cause;
      return reply.status(404).send({ code: cause.code, message: cause.message });
    }
  };

  public getSkillContent = async (
    request: FastifyRequest<{ Params: SkillCollectionSkillParamsDto }>,
    reply: FastifyReply,
  ): Promise<FastifyReply | SkillCollectionSkillContentVo> => {
    try {
      return {
        content: this.connections.getSkillContent(
          request.params.collectionId,
          request.params.skillId,
        ),
      };
    } catch (cause: unknown) {
      if (!(cause instanceof SkillConnectionError)) throw cause;
      return reply.status(404).send({ code: cause.code, message: cause.message });
    }
  };

  public install = async (
    request: FastifyRequest<{ Params: SkillConnectionParamsDto }>,
    reply: FastifyReply,
  ): Promise<FastifyReply> => {
    if (!isMutationRequestAllowed(this.config, request)) return rejectMutation(reply);
    try {
      this.connections.install(request.params.collectionId);
      return reply.status(204).send();
    } catch (cause: unknown) {
      if (!(cause instanceof SkillConnectionError)) throw cause;
      return reply.status(404).send({ code: cause.code, message: cause.message });
    }
  };

  public uninstall = async (
    request: FastifyRequest<{ Params: SkillConnectionParamsDto }>,
    reply: FastifyReply,
  ): Promise<FastifyReply> => {
    if (!isMutationRequestAllowed(this.config, request)) return rejectMutation(reply);
    try {
      await this.connections.uninstall(request.params.collectionId);
      return reply.status(204).send();
    } catch (cause: unknown) {
      if (!(cause instanceof SkillConnectionError)) throw cause;
      return reply.status(404).send({ code: cause.code, message: cause.message });
    }
  };

  public updateSkill = async (
    request: FastifyRequest<{
      Body: UpdateSkillCollectionSkillDto;
      Params: SkillCollectionSkillParamsDto;
    }>,
    reply: FastifyReply,
  ): Promise<FastifyReply> => {
    if (!isMutationRequestAllowed(this.config, request)) return rejectMutation(reply);
    try {
      this.connections.setSkillEnabled(
        request.params.collectionId,
        request.params.skillId,
        request.body.isEnabled,
      );
      return reply.status(204).send();
    } catch (cause: unknown) {
      if (!(cause instanceof SkillConnectionError)) throw cause;
      return reply
        .status(cause.code === SkillConnectionErrorCode.SKILL_NOT_FOUND ? 404 : 409)
        .send({ code: cause.code, message: cause.message });
    }
  };

  public startOAuth = async (
    request: FastifyRequest<{ Params: SkillConnectionParamsDto }>,
    reply: FastifyReply,
  ): Promise<FastifyReply | SkillOAuthStartVo> => {
    if (!isMutationRequestAllowed(this.config, request)) return rejectMutation(reply);
    try {
      return {
        authorizationUrl: this.connections.createAuthorizationUrl(request.params.collectionId),
      };
    } catch (cause: unknown) {
      if (!(cause instanceof SkillConnectionError)) throw cause;
      return reply.status(409).send({ code: cause.code, message: cause.message });
    }
  };

  public completeOAuth = async (
    request: FastifyRequest<{
      Params: SkillConnectionParamsDto;
      Querystring: SkillOAuthCallbackDto;
    }>,
    reply: FastifyReply,
  ): Promise<FastifyReply> => {
    const { code, error, state } = request.query;
    if (error !== undefined || code === undefined || state === undefined) {
      const reason = error === undefined ? "missing_callback_parameters" : "provider_error";
      request.log.warn(
        { code: SkillConnectionErrorCode.OAUTH_FAILED, reason },
        "Plugin OAuth callback failed",
      );
      return this.redirectToOAuthResult(
        reply,
        request.params.collectionId,
        false,
        error === undefined
          ? "OAuth 回调缺少 code 或 state，请重新连接。"
          : "OAuth 提供方拒绝或取消了授权，请重新连接。",
      );
    }

    try {
      await this.connections.completeAuthorization(request.params.collectionId, code, state);
      return this.redirectToOAuthResult(reply, request.params.collectionId, true);
    } catch (cause: unknown) {
      const error =
        cause instanceof SkillConnectionError
          ? cause
          : new SkillConnectionError(
              SkillConnectionErrorCode.OAUTH_FAILED,
              "插件 OAuth 授权失败，请查看 daemon 日志。",
            );
      request.log.warn(
        {
          code: error.code,
          err: cause,
          reason: error.message,
        },
        "Plugin OAuth callback failed",
      );
      return this.redirectToOAuthResult(reply, request.params.collectionId, false, error.message);
    }
  };

  public disconnect = async (
    request: FastifyRequest<{ Params: SkillConnectionParamsDto }>,
    reply: FastifyReply,
  ): Promise<FastifyReply> => {
    if (!isMutationRequestAllowed(this.config, request)) return rejectMutation(reply);
    try {
      await this.connections.disconnect(request.params.collectionId);
      return reply.status(204).send();
    } catch (cause: unknown) {
      if (!(cause instanceof SkillConnectionError)) throw cause;
      return reply.status(404).send({ code: cause.code, message: cause.message });
    }
  };

  public gateway = async (
    request: FastifyRequest<{ Params: SkillGatewayParamsDto }>,
    reply: FastifyReply,
  ): Promise<FastifyReply> => {
    if (!this.isGatewayRequest(request.headers["x-pi-harness-skill-gateway"])) {
      return reply.status(403).send({
        code: "SKILL_GATEWAY_FORBIDDEN",
        message: "Skill gateway request is not allowed",
      });
    }

    const abortController = new AbortController();
    const handleAborted = () => abortController.abort();
    request.raw.once("aborted", handleAborted);
    try {
      const response = await this.connections.request(
        request.params.collectionId,
        request.params["*"],
        request.url.includes("?") ? request.url.slice(request.url.indexOf("?")) : "",
        abortController.signal,
      );
      return reply.status(response.statusCode).type(response.contentType).send(response.body);
    } catch (cause: unknown) {
      const error =
        cause instanceof SkillConnectionError
          ? cause
          : new SkillConnectionError(
              SkillConnectionErrorCode.UPSTREAM_FAILED,
              "插件 Skill 网关请求失败",
            );
      request.log.warn({ code: error.code }, "Plugin Skill gateway request failed");
      const statusCode =
        error.code === SkillConnectionErrorCode.BAD_GATEWAY_PATH
          ? 400
          : error.code === SkillConnectionErrorCode.NOT_CONNECTED ||
              error.code === SkillConnectionErrorCode.NOT_INSTALLED
            ? 409
            : 502;
      return reply.status(statusCode).send({ code: error.code, message: error.message });
    } finally {
      request.raw.off("aborted", handleAborted);
    }
  };

  private isGatewayRequest(value: string | string[] | undefined): boolean {
    if (typeof value !== "string") return false;
    const actual = Buffer.from(value);
    const expected = Buffer.from(this.gatewayToken);
    return actual.length === expected.length && timingSafeEqual(actual, expected);
  }

  private redirectToOAuthResult(
    reply: FastifyReply,
    collectionId: string,
    isSuccessful: boolean,
    failureMessage?: string,
  ): FastifyReply {
    const resultUrl = new URL("/skill-oauth/result", this.config.webUrl);
    resultUrl.searchParams.set(
      "name",
      AVAILABLE_PLUGINS.find(({ id }) => id === collectionId)?.name ?? "插件",
    );
    resultUrl.searchParams.set("status", isSuccessful ? "success" : "error");
    if (failureMessage !== undefined) resultUrl.searchParams.set("message", failureMessage);
    return reply.redirect(resultUrl.toString());
  }
}
