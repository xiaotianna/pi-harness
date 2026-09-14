import { type Static, Type } from "typebox";
import { BoardTaskStatus } from "../schemas/board-task.js";

export const BoardTaskVoSchema = Type.Object({
  archivedAt: Type.Union([Type.Integer({ minimum: 0 }), Type.Null()]),
  attentionReason: Type.Union([Type.String(), Type.Null()]),
  completedAt: Type.Union([Type.Integer({ minimum: 0 }), Type.Null()]),
  createdAt: Type.Integer({ minimum: 0 }),
  currentStep: Type.Union([Type.String(), Type.Null()]),
  fileChangeCount: Type.Integer({ minimum: 0 }),
  id: Type.String({ format: "uuid" }),
  objective: Type.String(),
  position: Type.Integer({ minimum: 0 }),
  progress: Type.Union([
    Type.Object({ completed: Type.Integer({ minimum: 0 }), total: Type.Integer({ minimum: 0 }) }),
    Type.Null(),
  ]),
  rootRunId: Type.Union([Type.String({ format: "uuid" }), Type.Null()]),
  sessionId: Type.Union([Type.String({ format: "uuid" }), Type.Null()]),
  status: Type.Union([
    Type.Literal(BoardTaskStatus.PENDING),
    Type.Literal(BoardTaskStatus.IN_PROGRESS),
    Type.Literal(BoardTaskStatus.WAITING),
    Type.Literal(BoardTaskStatus.CONFIRMATION),
    Type.Literal(BoardTaskStatus.COMPLETED),
  ]),
  title: Type.String({ minLength: 1 }),
  updatedAt: Type.Integer({ minimum: 0 }),
  workspaceId: Type.String({ format: "uuid" }),
  workspaceName: Type.String({ minLength: 1 }),
});

export const BoardTaskListVoSchema = Type.Array(BoardTaskVoSchema);
export type BoardTaskVo = Static<typeof BoardTaskVoSchema>;
