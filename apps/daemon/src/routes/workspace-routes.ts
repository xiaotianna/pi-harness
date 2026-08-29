import type { FastifyInstance } from "fastify";
import { Type } from "typebox";
import type { HarnessConfig } from "../config/index.js";
import { WorkspaceController } from "../controllers/workspace-controller.js";
import {
  type InstallWorkspaceSkillDto,
  InstallWorkspaceSkillDtoSchema,
  type OpenWorkspacePathDto,
  OpenWorkspacePathDtoSchema,
  type ReorderWorkspacesDto,
  ReorderWorkspacesDtoSchema,
  type UpdateWorkspaceDto,
  UpdateWorkspaceDtoSchema,
  type UpdateWorkspaceSkillDto,
  UpdateWorkspaceSkillDtoSchema,
  type WorkspaceParamsDto,
  WorkspaceParamsDtoSchema,
  type WorkspaceSkillParamsDto,
  WorkspaceSkillParamsDtoSchema,
  type WritableWorkspaceSkillParamsDto,
  WritableWorkspaceSkillParamsDtoSchema,
} from "../dto/workspace-dto.js";
import type { WorkspaceService } from "../services/workspace-service.js";
import { ApiErrorVoSchema } from "../vo/auth-vo.js";
import {
  WorkspaceListVoSchema,
  WorkspaceSkillContentVoSchema,
  WorkspaceSkillInstallVoSchema,
  WorkspaceSkillListVoSchema,
  WorkspaceVoSchema,
} from "../vo/workspace-vo.js";

export async function registerWorkspaceRoutes(
  server: FastifyInstance,
  config: HarnessConfig,
  workspaces: WorkspaceService,
): Promise<void> {
  const controller = new WorkspaceController(config, workspaces);
  const errors = {
    400: ApiErrorVoSchema,
    403: ApiErrorVoSchema,
    404: ApiErrorVoSchema,
    409: ApiErrorVoSchema,
    500: ApiErrorVoSchema,
    501: ApiErrorVoSchema,
  };

  server.get(
    "/api/workspaces",
    { schema: { response: { 200: WorkspaceListVoSchema } } },
    controller.list,
  );

  server.get<{ Params: WorkspaceParamsDto }>(
    "/api/workspaces/:workspaceId/skills",
    {
      schema: {
        params: WorkspaceParamsDtoSchema,
        response: { 200: WorkspaceSkillListVoSchema, ...errors },
      },
    },
    controller.listSkills,
  );

  server.post<{ Body: InstallWorkspaceSkillDto; Params: WorkspaceParamsDto }>(
    "/api/workspaces/:workspaceId/skills/install",
    {
      schema: {
        body: InstallWorkspaceSkillDtoSchema,
        params: WorkspaceParamsDtoSchema,
        response: { 200: WorkspaceSkillInstallVoSchema, ...errors },
      },
    },
    controller.installSkill,
  );

  server.get<{ Params: WorkspaceSkillParamsDto }>(
    "/api/workspaces/:workspaceId/skills/:scope/:name",
    {
      schema: {
        params: WorkspaceSkillParamsDtoSchema,
        response: { 200: WorkspaceSkillContentVoSchema, ...errors },
      },
    },
    controller.getSkillContent,
  );

  server.patch<{ Body: UpdateWorkspaceSkillDto; Params: WritableWorkspaceSkillParamsDto }>(
    "/api/workspaces/:workspaceId/skills/:scope/:name",
    {
      schema: {
        body: UpdateWorkspaceSkillDtoSchema,
        params: WritableWorkspaceSkillParamsDtoSchema,
        response: { 204: Type.Null(), ...errors },
      },
    },
    controller.updateSkill,
  );

  server.post<{ Params: WritableWorkspaceSkillParamsDto }>(
    "/api/workspaces/:workspaceId/skills/:scope/:name/open",
    {
      schema: {
        params: WritableWorkspaceSkillParamsDtoSchema,
        response: { 204: Type.Null(), ...errors },
      },
    },
    controller.openSkillDirectory,
  );

  server.delete<{ Params: WritableWorkspaceSkillParamsDto }>(
    "/api/workspaces/:workspaceId/skills/:scope/:name",
    {
      schema: {
        params: WritableWorkspaceSkillParamsDtoSchema,
        response: { 204: Type.Null(), ...errors },
      },
    },
    controller.removeSkill,
  );

  server.post(
    "/api/workspaces",
    {
      schema: {
        response: {
          200: WorkspaceVoSchema,
          204: Type.Null(),
          ...errors,
        },
      },
    },
    controller.select,
  );

  server.put<{ Body: ReorderWorkspacesDto }>(
    "/api/workspaces/order",
    {
      schema: {
        body: ReorderWorkspacesDtoSchema,
        response: { 200: WorkspaceListVoSchema, ...errors },
      },
    },
    controller.reorder,
  );

  server.patch<{ Body: UpdateWorkspaceDto; Params: WorkspaceParamsDto }>(
    "/api/workspaces/:workspaceId",
    {
      schema: {
        body: UpdateWorkspaceDtoSchema,
        params: WorkspaceParamsDtoSchema,
        response: { 200: WorkspaceVoSchema, ...errors },
      },
    },
    controller.update,
  );

  server.post<{ Params: WorkspaceParamsDto }>(
    "/api/workspaces/:workspaceId/reveal",
    {
      schema: {
        params: WorkspaceParamsDtoSchema,
        response: { 204: Type.Null(), ...errors },
      },
    },
    controller.reveal,
  );

  server.post<{ Body: OpenWorkspacePathDto; Params: WorkspaceParamsDto }>(
    "/api/workspaces/:workspaceId/open",
    {
      schema: {
        body: OpenWorkspacePathDtoSchema,
        params: WorkspaceParamsDtoSchema,
        response: { 204: Type.Null(), ...errors },
      },
    },
    controller.openPath,
  );

  server.delete<{ Params: WorkspaceParamsDto }>(
    "/api/workspaces/:workspaceId",
    {
      schema: {
        params: WorkspaceParamsDtoSchema,
        response: { 204: Type.Null(), ...errors },
      },
    },
    controller.remove,
  );
}
