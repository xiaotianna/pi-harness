import { type Static, Type } from "typebox";
import { BoardTaskStatus } from "../schemas/board-task.js";

export const BoardTaskParamsDtoSchema = Type.Object({
  taskId: Type.String({ format: "uuid" }),
});
export type BoardTaskParamsDto = Static<typeof BoardTaskParamsDtoSchema>;

export const BoardTaskListQueryDtoSchema = Type.Object({
  workspaceId: Type.Optional(Type.String({ format: "uuid" })),
});
export type BoardTaskListQueryDto = Static<typeof BoardTaskListQueryDtoSchema>;

export const CreateBoardTaskDtoSchema = Type.Object({
  objective: Type.String({ maxLength: 20_000 }),
  title: Type.String({ maxLength: 200, minLength: 1 }),
  workspaceId: Type.String({ format: "uuid" }),
});
export type CreateBoardTaskDto = Static<typeof CreateBoardTaskDtoSchema>;

export const UpdateBoardTaskDtoSchema = Type.Object(
  {
    objective: Type.Optional(Type.String({ maxLength: 20_000 })),
    status: Type.Optional(Type.Literal(BoardTaskStatus.COMPLETED)),
    title: Type.Optional(Type.String({ maxLength: 200, minLength: 1 })),
  },
  { minProperties: 1 },
);
export type UpdateBoardTaskDto = Static<typeof UpdateBoardTaskDtoSchema>;
