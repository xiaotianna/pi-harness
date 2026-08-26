import type { FastifyInstance } from "fastify";
import type { HarnessConfig } from "../config/index.js";
import { AppSettingsController } from "../controllers/app-settings-controller.js";
import { type UpdateAppSettingsDto, UpdateAppSettingsDtoSchema } from "../dto/app-settings-dto.js";
import type { AppSettingsService } from "../services/app-settings-service.js";
import { AppSettingsVoSchema } from "../vo/app-settings-vo.js";
import { ApiErrorVoSchema } from "../vo/auth-vo.js";

export async function registerAppSettingsRoutes(
  server: FastifyInstance,
  config: HarnessConfig,
  settings: AppSettingsService,
): Promise<void> {
  const controller = new AppSettingsController(config, settings);

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
}
