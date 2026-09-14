import { type Static, Type } from "typebox";
import { Value } from "typebox/value";
import { apiRequest } from "../../../api/request";
import { BoardTaskStatus } from "../constants/board-task";

const BoardTaskSchema = Type.Object({
  archivedAt: Type.Union([Type.Integer({ minimum: 0 }), Type.Null()]),
  attentionReason: Type.Union([Type.String(), Type.Null()]),
  completedAt: Type.Union([Type.Integer({ minimum: 0 }), Type.Null()]),
  createdAt: Type.Integer({ minimum: 0 }),
  currentStep: Type.Union([Type.String(), Type.Null()]),
  fileChangeCount: Type.Integer({ minimum: 0 }),
  id: Type.String({ minLength: 1 }),
  objective: Type.String(),
  position: Type.Integer({ minimum: 0 }),
  progress: Type.Union([
    Type.Object({ completed: Type.Integer({ minimum: 0 }), total: Type.Integer({ minimum: 0 }) }),
    Type.Null(),
  ]),
  rootRunId: Type.Union([Type.String({ minLength: 1 }), Type.Null()]),
  sessionId: Type.Union([Type.String({ minLength: 1 }), Type.Null()]),
  status: Type.Union([
    Type.Literal(BoardTaskStatus.PENDING),
    Type.Literal(BoardTaskStatus.IN_PROGRESS),
    Type.Literal(BoardTaskStatus.WAITING),
    Type.Literal(BoardTaskStatus.CONFIRMATION),
    Type.Literal(BoardTaskStatus.COMPLETED),
  ]),
  title: Type.String({ minLength: 1 }),
  updatedAt: Type.Integer({ minimum: 0 }),
  workspaceId: Type.String({ minLength: 1 }),
  workspaceName: Type.String({ minLength: 1 }),
});
const BoardTaskListSchema = Type.Array(BoardTaskSchema);

export type BoardTask = Static<typeof BoardTaskSchema>;

export interface CreateBoardTaskInput {
  objective: string;
  title: string;
  workspaceId: string;
}

export interface UpdateBoardTaskInput {
  objective?: string;
  status?: typeof BoardTaskStatus.COMPLETED;
  title?: string;
}

function readTask(value: unknown): BoardTask {
  if (!Value.Check(BoardTaskSchema, value)) throw new Error("daemon 返回了无效的看板任务");
  return value;
}

export async function listBoardTasks(signal?: AbortSignal): Promise<readonly BoardTask[]> {
  const body = (await (
    await apiRequest("/api/board-tasks", signal ? { signal } : undefined)
  ).json()) as unknown;
  if (!Value.Check(BoardTaskListSchema, body)) throw new Error("daemon 返回了无效的看板任务列表");
  return body;
}

export async function createBoardTask(input: CreateBoardTaskInput): Promise<BoardTask> {
  const response = await apiRequest("/api/board-tasks", {
    body: JSON.stringify(input),
    method: "POST",
  });
  return readTask((await response.json()) as unknown);
}

export async function deleteBoardTask(taskId: string): Promise<void> {
  await apiRequest(`/api/board-tasks/${encodeURIComponent(taskId)}`, { method: "DELETE" });
}

export async function updateBoardTask(
  taskId: string,
  input: UpdateBoardTaskInput,
): Promise<BoardTask> {
  const response = await apiRequest(`/api/board-tasks/${encodeURIComponent(taskId)}`, {
    body: JSON.stringify(input),
    method: "PATCH",
  });
  return readTask((await response.json()) as unknown);
}
