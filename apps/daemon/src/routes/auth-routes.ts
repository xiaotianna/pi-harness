import type { FastifyInstance } from "fastify";
import { Type } from "typebox";
import type { HarnessConfig } from "../config/index.js";
import { AuthController } from "../controllers/auth-controller.js";
import { type GitHubCallbackDto, GitHubCallbackDtoSchema } from "../dto/auth-dto.js";
import type { FileOpenService } from "../services/file-open-service.js";
import type { AuthSessionRepository } from "../storage/database.js";
import { ApiErrorVoSchema, AuthSessionVoSchema } from "../vo/auth-vo.js";

/** 仅声明认证接口路径、参数 schema 与对应 controller。 */
export async function registerAuthRoutes(
  server: FastifyInstance,
  config: HarnessConfig,
  sessions: AuthSessionRepository,
  fileOpen: FileOpenService,
): Promise<void> {
  const controller = new AuthController(config, sessions, fileOpen);

  server.get("/api/auth/github", controller.startGitHubLogin);

  server.post(
    "/api/auth/github/desktop",
    {
      schema: {
        response: {
          204: Type.Null(),
          400: ApiErrorVoSchema,
          403: ApiErrorVoSchema,
          503: ApiErrorVoSchema,
        },
      },
    },
    controller.startDesktopGitHubLogin,
  );

  server.get<{ Querystring: GitHubCallbackDto }>(
    "/api/auth/github/callback",
    { schema: { querystring: GitHubCallbackDtoSchema } },
    controller.completeGitHubLogin,
  );

  server.get(
    "/api/auth/session",
    { schema: { response: { 200: AuthSessionVoSchema } } },
    controller.getSession,
  );

  server.post(
    "/api/auth/logout",
    { schema: { response: { 204: Type.Null(), 403: ApiErrorVoSchema } } },
    controller.logout,
  );
}
