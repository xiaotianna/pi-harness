import type { FastifyInstance } from "fastify";
import { Type } from "typebox";
import type { HarnessConfig } from "../config/index.js";
import { AppSettingsController } from "../controllers/app-settings-controller.js";
import {
  type ComputerUseAllowedAppParams,
  ComputerUseAllowedAppParamsSchema,
  type ComputerUsePermissionParams,
  ComputerUsePermissionParamsSchema,
  type UpdateAppSettingsDto,
  UpdateAppSettingsDtoSchema,
} from "../dto/app-settings-dto.js";
import type { AppSettingsService } from "../services/app-settings-service.js";
import type { ComputerUsePermissionService } from "../services/computer-use-permission-service.js";
import type { FileOpenService } from "../services/file-open-service.js";
import { AppSettingsVoSchema, ComputerUsePermissionsVoSchema } from "../vo/app-settings-vo.js";
import { ApiErrorVoSchema } from "../vo/auth-vo.js";

export async function registerAppSettingsRoutes(
  server: FastifyInstance,
  config: HarnessConfig,
  settings: AppSettingsService,
  fileOpen: FileOpenService,
  computerUsePermissions: ComputerUsePermissionService,
): Promise<void> {
  const controller = new AppSettingsController(config, settings, fileOpen, computerUsePermissions);

  server.get(
    "/api/settings",
    { schema: { response: { 200: AppSettingsVoSchema, 500: ApiErrorVoSchema } } },
    controller.get,
  );

  server.patch<{ Body: UpdateAppSettingsDto }>(
    "/api/settings",
    {
      schema: {
        body: UpdateAppSettingsDtoSchema,
        response: { 200: AppSettingsVoSchema, 403: ApiErrorVoSchema, 500: ApiErrorVoSchema },
      },
    },
    controller.update,
  );

  server.post(
    "/api/settings/file-open-application",
    {
      schema: {
        response: {
          200: AppSettingsVoSchema,
          204: Type.Null(),
          403: ApiErrorVoSchema,
          409: ApiErrorVoSchema,
          500: ApiErrorVoSchema,
          501: ApiErrorVoSchema,
        },
      },
    },
    controller.selectFileOpenApplication,
  );

  server.delete<{ Params: ComputerUseAllowedAppParams }>(
    "/api/settings/computer-use/allowed-apps/:bundleId",
    {
      schema: {
        params: ComputerUseAllowedAppParamsSchema,
        response: { 204: Type.Null(), 403: ApiErrorVoSchema, 500: ApiErrorVoSchema },
      },
    },
    controller.revokeComputerUseApp,
  );

  server.get<{ Params: ComputerUseAllowedAppParams }>(
    "/api/settings/computer-use/allowed-apps/:bundleId/icon",
    { schema: { params: ComputerUseAllowedAppParamsSchema } },
    controller.getComputerUseAppIcon,
  );

  server.get(
    "/api/settings/computer-use/permissions",
    {
      schema: {
        response: { 200: ComputerUsePermissionsVoSchema, 500: ApiErrorVoSchema },
      },
    },
    controller.getComputerUsePermissions,
  );

  server.post<{ Params: ComputerUsePermissionParams }>(
    "/api/settings/computer-use/permissions/:permission",
    {
      schema: {
        params: ComputerUsePermissionParamsSchema,
        response: {
          200: ComputerUsePermissionsVoSchema,
          403: ApiErrorVoSchema,
          500: ApiErrorVoSchema,
        },
      },
    },
    controller.requestComputerUsePermission,
  );

  server.post<{ Params: ComputerUsePermissionParams }>(
    "/api/settings/computer-use/permissions/:permission/settings",
    {
      schema: {
        params: ComputerUsePermissionParamsSchema,
        response: {
          204: Type.Null(),
          403: ApiErrorVoSchema,
          500: ApiErrorVoSchema,
        },
      },
    },
    controller.openComputerUsePermissionSettings,
  );
}
