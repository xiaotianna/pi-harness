import type { FastifyInstance } from "fastify";
import { Type } from "typebox";
import type { HarnessConfig } from "../config/index.js";
import { BoardTaskController } from "../controllers/board-task-controller.js";
import {
  type BoardTaskListQueryDto,
  BoardTaskListQueryDtoSchema,
  type BoardTaskParamsDto,
  BoardTaskParamsDtoSchema,
  type CreateBoardTaskDto,
  CreateBoardTaskDtoSchema,
  type UpdateBoardTaskDto,
  UpdateBoardTaskDtoSchema,
} from "../dto/board-task-dto.js";
import type { BoardTaskService } from "../services/board-task-service.js";
import { ApiErrorVoSchema } from "../vo/auth-vo.js";
import { BoardTaskListVoSchema, BoardTaskVoSchema } from "../vo/board-task-vo.js";

export async function registerBoardTaskRoutes(
  server: FastifyInstance,
  config: HarnessConfig,
  tasks: BoardTaskService,
): Promise<void> {
  const controller = new BoardTaskController(config, tasks);
  const errors = {
    400: ApiErrorVoSchema,
    403: ApiErrorVoSchema,
    404: ApiErrorVoSchema,
    409: ApiErrorVoSchema,
  };

  server.get<{ Querystring: BoardTaskListQueryDto }>("/api/board-tasks", {
    schema: {
      querystring: BoardTaskListQueryDtoSchema,
      response: { 200: BoardTaskListVoSchema, ...errors },
    },
    handler: controller.list,
  });
  server.post<{ Body: CreateBoardTaskDto }>("/api/board-tasks", {
    schema: { body: CreateBoardTaskDtoSchema, response: { 200: BoardTaskVoSchema, ...errors } },
    handler: controller.create,
  });
  server.delete<{ Params: BoardTaskParamsDto }>("/api/board-tasks/:taskId", {
    schema: {
      params: BoardTaskParamsDtoSchema,
      response: { 204: Type.Null(), ...errors },
    },
    handler: controller.remove,
  });
  server.patch<{ Body: UpdateBoardTaskDto; Params: BoardTaskParamsDto }>(
    "/api/board-tasks/:taskId",
    {
      schema: {
        body: UpdateBoardTaskDtoSchema,
        params: BoardTaskParamsDtoSchema,
        response: { 200: BoardTaskVoSchema, ...errors },
      },
      handler: controller.update,
    },
  );
}
