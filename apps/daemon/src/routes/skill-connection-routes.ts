import type { FastifyInstance } from "fastify";
import { Type } from "typebox";
import type { HarnessConfig } from "../config/index.js";
import { SkillConnectionController } from "../controllers/skill-connection-controller.js";
import { type SkillOAuthCallbackDto, SkillOAuthCallbackDtoSchema } from "../dto/auth-dto.js";
import {
  type SkillCollectionSkillParamsDto,
  SkillCollectionSkillParamsDtoSchema,
  type SkillConnectionParamsDto,
  SkillConnectionParamsDtoSchema,
  type SkillGatewayParamsDto,
  SkillGatewayParamsDtoSchema,
  type UpdateSkillCollectionSkillDto,
  UpdateSkillCollectionSkillDtoSchema,
} from "../dto/skill-connection-dto.js";
import type { SkillConnectionService } from "../services/skill-connection-service.js";
import { ApiErrorVoSchema } from "../vo/auth-vo.js";
import {
  SkillCollectionListVoSchema,
  SkillCollectionSkillContentVoSchema,
  SkillConnectionStatusVoSchema,
  SkillOAuthStartVoSchema,
} from "../vo/skill-connection-vo.js";

export async function registerSkillConnectionRoutes(
  server: FastifyInstance,
  config: HarnessConfig,
  connections: SkillConnectionService,
  gatewayToken: string,
): Promise<void> {
  const controller = new SkillConnectionController(config, connections, gatewayToken);

  server.get(
    "/api/skill-collections",
    { schema: { response: { 200: SkillCollectionListVoSchema } } },
    controller.listCollections,
  );

  server.post<{ Params: SkillConnectionParamsDto }>(
    "/api/skill-collections/:collectionId",
    {
      schema: {
        params: SkillConnectionParamsDtoSchema,
        response: { 204: Type.Null(), 403: ApiErrorVoSchema, 404: ApiErrorVoSchema },
      },
    },
    controller.install,
  );

  server.delete<{ Params: SkillConnectionParamsDto }>(
    "/api/skill-collections/:collectionId",
    {
      schema: {
        params: SkillConnectionParamsDtoSchema,
        response: { 204: Type.Null(), 403: ApiErrorVoSchema, 404: ApiErrorVoSchema },
      },
    },
    controller.uninstall,
  );

  server.get<{ Params: SkillCollectionSkillParamsDto }>(
    "/api/skill-collections/:collectionId/skills/:skillId",
    {
      schema: {
        params: SkillCollectionSkillParamsDtoSchema,
        response: { 200: SkillCollectionSkillContentVoSchema, 404: ApiErrorVoSchema },
      },
    },
    controller.getSkillContent,
  );

  server.patch<{
    Body: UpdateSkillCollectionSkillDto;
    Params: SkillCollectionSkillParamsDto;
  }>(
    "/api/skill-collections/:collectionId/skills/:skillId",
    {
      schema: {
        body: UpdateSkillCollectionSkillDtoSchema,
        params: SkillCollectionSkillParamsDtoSchema,
        response: {
          204: Type.Null(),
          403: ApiErrorVoSchema,
          404: ApiErrorVoSchema,
          409: ApiErrorVoSchema,
        },
      },
    },
    controller.updateSkill,
  );

  server.get<{ Params: SkillConnectionParamsDto }>(
    "/api/skill-connections/:collectionId",
    {
      schema: {
        params: SkillConnectionParamsDtoSchema,
        response: { 200: SkillConnectionStatusVoSchema, 404: ApiErrorVoSchema },
      },
    },
    controller.getStatus,
  );

  server.post<{ Params: SkillConnectionParamsDto }>(
    "/api/skill-connections/:collectionId/oauth",
    {
      schema: {
        params: SkillConnectionParamsDtoSchema,
        response: { 200: SkillOAuthStartVoSchema, 403: ApiErrorVoSchema, 409: ApiErrorVoSchema },
      },
    },
    controller.startOAuth,
  );

  server.get<{ Params: SkillConnectionParamsDto; Querystring: SkillOAuthCallbackDto }>(
    "/api/skill-connections/:collectionId/oauth/callback",
    {
      schema: {
        params: SkillConnectionParamsDtoSchema,
        querystring: SkillOAuthCallbackDtoSchema,
      },
    },
    controller.completeOAuth,
  );

  server.delete<{ Params: SkillConnectionParamsDto }>(
    "/api/skill-connections/:collectionId",
    {
      schema: {
        params: SkillConnectionParamsDtoSchema,
        response: { 204: Type.Null(), 403: ApiErrorVoSchema, 404: ApiErrorVoSchema },
      },
    },
    controller.disconnect,
  );

  server.get<{ Params: SkillGatewayParamsDto }>(
    "/api/skill-gateway/:collectionId/*",
    { schema: { params: SkillGatewayParamsDtoSchema } },
    controller.gateway,
  );
}
