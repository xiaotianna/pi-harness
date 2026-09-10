import type { FastifyInstance } from "fastify";
import { Type } from "typebox";
import type { HarnessConfig } from "../config/index.js";
import { McpController } from "../controllers/mcp-controller.js";
import {
  type CreateMcpServerDto,
  CreateMcpServerDtoSchema,
  type ImportMcpServersDto,
  ImportMcpServersDtoSchema,
  McpJsonDtoSchema,
  type McpOAuthCallbackDto,
  McpOAuthCallbackDtoSchema,
  type McpRevisionDto,
  McpRevisionDtoSchema,
  type McpServerParamsDto,
  McpServerParamsDtoSchema,
  type PutMcpCredentialDto,
  PutMcpCredentialDtoSchema,
  type TestMcpConnectionDto,
  TestMcpConnectionDtoSchema,
  type UpdateMcpServerDto,
  UpdateMcpServerDtoSchema,
} from "../dto/mcp-dto.js";
import type { McpDiagnosticsService } from "../services/mcp-diagnostics-service.js";
import type { McpOAuthService } from "../services/mcp-oauth-service.js";
import type { McpServerService } from "../services/mcp-server-service.js";
import { ApiErrorVoSchema } from "../vo/auth-vo.js";
import {
  McpDiagnosticsVoSchema,
  McpOAuthStartVoSchema,
  McpServerListVoSchema,
  McpServerVoSchema,
} from "../vo/mcp-vo.js";

export async function registerMcpRoutes(
  server: FastifyInstance,
  config: HarnessConfig,
  servers: McpServerService,
  diagnostics: McpDiagnosticsService,
  oauth: McpOAuthService,
): Promise<void> {
  const controller = new McpController(config, servers, diagnostics, oauth);
  const errors = {
    400: ApiErrorVoSchema,
    401: ApiErrorVoSchema,
    403: ApiErrorVoSchema,
    404: ApiErrorVoSchema,
    409: ApiErrorVoSchema,
    422: ApiErrorVoSchema,
    429: ApiErrorVoSchema,
    500: ApiErrorVoSchema,
    502: ApiErrorVoSchema,
  };
  const params = McpServerParamsDtoSchema;
  const recordResponse = { 200: McpServerVoSchema, ...errors };
  const emptyResponse = { 204: Type.Null(), ...errors };
  server.get(
    "/api/mcp-servers",
    { schema: { response: { 200: McpServerListVoSchema, ...errors } } },
    controller.list,
  );
  server.post<{ Body: CreateMcpServerDto }>(
    "/api/mcp-servers",
    { schema: { body: CreateMcpServerDtoSchema, response: recordResponse } },
    controller.create,
  );
  server.get<{ Params: McpServerParamsDto }>(
    "/api/mcp-servers/:serverId",
    { schema: { params, response: recordResponse } },
    controller.get,
  );
  server.put<{ Params: McpServerParamsDto; Body: UpdateMcpServerDto }>(
    "/api/mcp-servers/:serverId",
    { schema: { params, body: UpdateMcpServerDtoSchema, response: recordResponse } },
    controller.update,
  );
  server.delete<{ Params: McpServerParamsDto; Body: McpRevisionDto }>(
    "/api/mcp-servers/:serverId",
    { schema: { params, body: McpRevisionDtoSchema, response: emptyResponse } },
    controller.remove,
  );
  server.post<{ Params: McpServerParamsDto; Body: McpRevisionDto }>(
    "/api/mcp-servers/:serverId/trust",
    { schema: { params, body: McpRevisionDtoSchema, response: recordResponse } },
    controller.trust,
  );
  server.delete<{ Params: McpServerParamsDto }>(
    "/api/mcp-servers/:serverId/trust",
    { schema: { params, response: emptyResponse } },
    controller.revokeTrust,
  );
  server.put<{ Params: McpServerParamsDto; Body: PutMcpCredentialDto }>(
    "/api/mcp-servers/:serverId/credentials",
    { schema: { params, body: PutMcpCredentialDtoSchema, response: recordResponse } },
    controller.putCredential,
  );
  server.delete<{ Params: McpServerParamsDto; Body: McpRevisionDto }>(
    "/api/mcp-servers/:serverId/credentials",
    { schema: { params, body: McpRevisionDtoSchema, response: emptyResponse } },
    controller.deleteCredential,
  );
  server.post<{ Params: McpServerParamsDto; Body: McpRevisionDto }>(
    "/api/mcp-servers/:serverId/authorizations",
    {
      schema: {
        params,
        body: McpRevisionDtoSchema,
        response: { 200: McpOAuthStartVoSchema, ...errors },
      },
    },
    controller.startOAuth,
  );
  server.get<{ Params: McpServerParamsDto; Querystring: McpOAuthCallbackDto }>(
    "/api/mcp-servers/:serverId/authorizations/callback",
    { schema: { params, querystring: McpOAuthCallbackDtoSchema } },
    controller.completeOAuth,
  );
  server.post<{ Params: McpServerParamsDto; Body: TestMcpConnectionDto }>(
    "/api/mcp-servers/:serverId/tests",
    {
      schema: {
        params,
        body: TestMcpConnectionDtoSchema,
        response: { 200: McpDiagnosticsVoSchema, ...errors },
      },
    },
    controller.test,
  );
  server.post<{ Body: ImportMcpServersDto }>(
    "/api/mcp-servers/import/preview",
    {
      schema: {
        body: ImportMcpServersDtoSchema,
        response: { 200: McpJsonDtoSchema, ...errors },
      },
    },
    controller.previewImport,
  );
  server.post<{ Body: ImportMcpServersDto }>(
    "/api/mcp-servers/import",
    {
      schema: {
        body: ImportMcpServersDtoSchema,
        response: { 200: McpServerListVoSchema, ...errors },
      },
    },
    controller.importServers,
  );
  server.get<{ Params: McpServerParamsDto }>(
    "/api/mcp-servers/:serverId/export",
    { schema: { params, response: { 200: McpJsonDtoSchema, ...errors } } },
    controller.exportServer,
  );
}
