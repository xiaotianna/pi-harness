import type { FastifyInstance } from "fastify";
import { Type } from "typebox";
import type { HarnessConfig } from "../config/index.js";
import { ProviderController } from "../controllers/provider-controller.js";
import {
  type CreateProviderDto,
  CreateProviderDtoSchema,
  type CustomProviderConnectionTestDto,
  CustomProviderConnectionTestDtoSchema,
  type ProviderConnectionTestDto,
  ProviderConnectionTestDtoSchema,
  type ProviderCredentialDto,
  ProviderCredentialDtoSchema,
  type ProviderParamsDto,
  ProviderParamsDtoSchema,
  type UpdateProviderDto,
  UpdateProviderDtoSchema,
} from "../dto/provider-dto.js";
import type { ProviderService } from "../services/provider-service.js";
import { ApiErrorVoSchema } from "../vo/auth-vo.js";
import {
  ProviderListVoSchema,
  ProviderOAuthStateVoSchema,
  ProviderVoSchema,
} from "../vo/provider-vo.js";

export async function registerProviderRoutes(
  server: FastifyInstance,
  config: HarnessConfig,
  providers: ProviderService,
): Promise<void> {
  const controller = new ProviderController(config, providers);
  const mutationErrors = {
    400: ApiErrorVoSchema,
    403: ApiErrorVoSchema,
    404: ApiErrorVoSchema,
    500: ApiErrorVoSchema,
  };

  server.get(
    "/api/providers",
    { schema: { response: { 200: ProviderListVoSchema } } },
    controller.list,
  );

  server.post<{ Body: CreateProviderDto }>(
    "/api/providers",
    {
      schema: {
        body: CreateProviderDtoSchema,
        response: { 200: ProviderVoSchema, ...mutationErrors },
      },
    },
    controller.create,
  );

  server.patch<{ Body: UpdateProviderDto; Params: ProviderParamsDto }>(
    "/api/providers/:providerId",
    {
      schema: {
        body: UpdateProviderDtoSchema,
        params: ProviderParamsDtoSchema,
        response: { 200: ProviderVoSchema, ...mutationErrors },
      },
    },
    controller.update,
  );

  server.delete<{ Params: ProviderParamsDto }>(
    "/api/providers/:providerId",
    {
      schema: {
        params: ProviderParamsDtoSchema,
        response: { 204: Type.Null(), ...mutationErrors },
      },
    },
    controller.remove,
  );

  server.put<{ Body: ProviderCredentialDto; Params: ProviderParamsDto }>(
    "/api/providers/:providerId/credential",
    {
      schema: {
        body: ProviderCredentialDtoSchema,
        params: ProviderParamsDtoSchema,
        response: { 204: Type.Null(), ...mutationErrors },
      },
    },
    controller.saveCredential,
  );

  server.delete<{ Params: ProviderParamsDto }>(
    "/api/providers/:providerId/credential",
    {
      schema: {
        params: ProviderParamsDtoSchema,
        response: { 204: Type.Null(), ...mutationErrors },
      },
    },
    controller.removeCredential,
  );

  server.post<{ Params: ProviderParamsDto }>(
    "/api/providers/:providerId/oauth",
    {
      schema: {
        params: ProviderParamsDtoSchema,
        response: { 200: ProviderOAuthStateVoSchema, ...mutationErrors },
      },
    },
    controller.startOAuth,
  );

  server.get<{ Params: ProviderParamsDto }>(
    "/api/providers/:providerId/oauth",
    {
      schema: {
        params: ProviderParamsDtoSchema,
        response: { 200: ProviderOAuthStateVoSchema, ...mutationErrors },
      },
    },
    controller.getOAuthState,
  );

  server.delete<{ Params: ProviderParamsDto }>(
    "/api/providers/:providerId/oauth",
    {
      schema: {
        params: ProviderParamsDtoSchema,
        response: { 204: Type.Null(), ...mutationErrors },
      },
    },
    controller.cancelOAuth,
  );

  server.post<{ Body: CustomProviderConnectionTestDto }>(
    "/api/providers/test",
    {
      schema: {
        body: CustomProviderConnectionTestDtoSchema,
        response: { 204: Type.Null(), 502: ApiErrorVoSchema, ...mutationErrors },
      },
    },
    controller.testCustomConnection,
  );

  server.post<{ Body: ProviderConnectionTestDto; Params: ProviderParamsDto }>(
    "/api/providers/:providerId/test",
    {
      schema: {
        body: ProviderConnectionTestDtoSchema,
        params: ProviderParamsDtoSchema,
        response: { 204: Type.Null(), 502: ApiErrorVoSchema, ...mutationErrors },
      },
    },
    controller.testConnection,
  );
}
