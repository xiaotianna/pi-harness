import {
  type CreateMemoryInput,
  CreateMemoryInputSchema,
  type DeleteMemoryInput,
  DeleteMemoryInputSchema,
  type MemoryParams,
  MemoryParamsSchema,
  MemoryRecordSchema,
  type MemoryService,
  MemorySettingsSchema,
  MemoryStateSchema,
  type UpdateMemoryInput,
  UpdateMemoryInputSchema,
  type UpdateMemorySettingsInput,
  UpdateMemorySettingsInputSchema,
} from "@pi-harness/memory";
import type { FastifyInstance } from "fastify";
import { Type } from "typebox";
import type { HarnessConfig } from "../config/index.js";
import { MemoryController } from "../controllers/memory-controller.js";
import { ApiErrorVoSchema } from "../vo/auth-vo.js";

export async function registerMemoryRoutes(
  server: FastifyInstance,
  config: HarnessConfig,
  memories: MemoryService,
): Promise<void> {
  const controller = new MemoryController(config, memories);
  const errors = {
    400: ApiErrorVoSchema,
    403: ApiErrorVoSchema,
    404: ApiErrorVoSchema,
    409: ApiErrorVoSchema,
    502: ApiErrorVoSchema,
    500: ApiErrorVoSchema,
  };

  server.get(
    "/api/memories",
    { schema: { response: { 200: MemoryStateSchema, 500: ApiErrorVoSchema } } },
    controller.list,
  );
  server.post<{ Body: CreateMemoryInput }>(
    "/api/memories",
    {
      schema: {
        body: CreateMemoryInputSchema,
        response: { 200: MemoryRecordSchema, ...errors },
      },
    },
    controller.create,
  );
  server.patch<{ Body: UpdateMemoryInput; Params: MemoryParams }>(
    "/api/memories/:memoryId",
    {
      schema: {
        body: UpdateMemoryInputSchema,
        params: MemoryParamsSchema,
        response: { 200: MemoryRecordSchema, ...errors },
      },
    },
    controller.update,
  );
  server.delete<{ Body: DeleteMemoryInput; Params: MemoryParams }>(
    "/api/memories/:memoryId",
    {
      schema: {
        body: DeleteMemoryInputSchema,
        params: MemoryParamsSchema,
        response: { 204: Type.Null(), ...errors },
      },
    },
    controller.remove,
  );
  server.patch<{ Body: UpdateMemorySettingsInput }>(
    "/api/memory-settings",
    {
      schema: {
        body: UpdateMemorySettingsInputSchema,
        response: { 200: MemorySettingsSchema, ...errors },
      },
    },
    controller.updateSettings,
  );
}
