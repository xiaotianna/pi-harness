import type { DatabaseSync } from "node:sqlite";
import { type BoardTaskStatus, isBoardTaskStatus } from "../schemas/board-task.js";

export interface BoardTaskRecord {
  archivedAt: number | null;
  completedAt: number | null;
  createdAt: number;
  id: string;
  objective: string;
  position: number;
  rootRunId: string | null;
  sessionId: string | null;
  status: BoardTaskStatus;
  title: string;
  updatedAt: number;
  workspaceId: string;
}

export interface CreateBoardTaskRecord {
  createdAt: number;
  id: string;
  objective: string;
  rootRunId?: string;
  sessionId?: string;
  status: BoardTaskStatus;
  title: string;
  workspaceId: string;
}

export interface UpdateBoardTaskRecord {
  completedAt?: number | null;
  objective?: string;
  rootRunId?: string;
  sessionId?: string;
  status?: BoardTaskStatus;
  title?: string;
  updatedAt: number;
}

export interface BoardTaskRepository {
  create(task: CreateBoardTaskRecord): BoardTaskRecord;
  find(taskId: string): BoardTaskRecord | null;
  findByRunId(runId: string): BoardTaskRecord | null;
  list(): readonly BoardTaskRecord[];
  update(taskId: string, input: UpdateBoardTaskRecord): BoardTaskRecord | null;
}

interface DatabaseRow {
  [key: string]: unknown;
}

function readString(row: DatabaseRow, key: string): string {
  const value = row[key];
  if (typeof value !== "string") throw new Error(`Invalid database value for ${key}`);
  return value;
}

function readNullableString(row: DatabaseRow, key: string): string | null {
  const value = row[key];
  if (value !== null && typeof value !== "string") {
    throw new Error(`Invalid database value for ${key}`);
  }
  return value;
}

function readNumber(row: DatabaseRow, key: string): number {
  const value = row[key];
  if (typeof value !== "number" || !Number.isSafeInteger(value)) {
    throw new Error(`Invalid database value for ${key}`);
  }
  return value;
}

function readNullableNumber(row: DatabaseRow, key: string): number | null {
  const value = row[key];
  if (value !== null && (typeof value !== "number" || !Number.isSafeInteger(value))) {
    throw new Error(`Invalid database value for ${key}`);
  }
  return value;
}

function mapBoardTask(row: DatabaseRow): BoardTaskRecord {
  const status = readString(row, "status");
  if (!isBoardTaskStatus(status)) throw new Error("Invalid database value for status");
  return {
    archivedAt: readNullableNumber(row, "archived_at"),
    completedAt: readNullableNumber(row, "completed_at"),
    createdAt: readNumber(row, "created_at"),
    id: readString(row, "id"),
    objective: readString(row, "objective"),
    position: readNumber(row, "position"),
    rootRunId: readNullableString(row, "root_run_id"),
    sessionId: readNullableString(row, "session_id"),
    status,
    title: readString(row, "title"),
    updatedAt: readNumber(row, "updated_at"),
    workspaceId: readString(row, "workspace_id"),
  };
}

export class SqliteBoardTaskRepository implements BoardTaskRepository {
  public constructor(private readonly database: DatabaseSync) {}

  public create(task: CreateBoardTaskRecord): BoardTaskRecord {
    const positionRow = this.database
      .prepare(
        `SELECT COALESCE(MAX(position), -1) + 1 AS next_position
         FROM board_tasks
         WHERE status = ? AND archived_at IS NULL`,
      )
      .get(task.status) as DatabaseRow;
    const position = readNumber(positionRow, "next_position");
    this.database
      .prepare(
        `INSERT INTO board_tasks (
           id, workspace_id, session_id, root_run_id, title, objective, status, position,
           created_at, updated_at, completed_at, archived_at
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, NULL)`,
      )
      .run(
        task.id,
        task.workspaceId,
        task.sessionId ?? null,
        task.rootRunId ?? null,
        task.title,
        task.objective,
        task.status,
        position,
        task.createdAt,
        task.createdAt,
      );
    const created = this.find(task.id);
    if (!created) throw new Error("Created board task could not be read");
    return created;
  }

  public find(taskId: string): BoardTaskRecord | null {
    const row = this.database.prepare("SELECT * FROM board_tasks WHERE id = ?").get(taskId) as
      | DatabaseRow
      | undefined;
    return row ? mapBoardTask(row) : null;
  }

  public findByRunId(runId: string): BoardTaskRecord | null {
    const row = this.database
      .prepare("SELECT * FROM board_tasks WHERE root_run_id = ?")
      .get(runId) as DatabaseRow | undefined;
    return row ? mapBoardTask(row) : null;
  }

  public list(): readonly BoardTaskRecord[] {
    const rows = this.database
      .prepare(
        `SELECT board_tasks.*
         FROM board_tasks
         INNER JOIN workspaces ON workspaces.id = board_tasks.workspace_id
         WHERE board_tasks.archived_at IS NULL AND workspaces.removed_at IS NULL
         ORDER BY board_tasks.status, board_tasks.position, board_tasks.updated_at DESC`,
      )
      .all() as DatabaseRow[];
    return rows.map(mapBoardTask);
  }

  public update(taskId: string, input: UpdateBoardTaskRecord): BoardTaskRecord | null {
    const current = this.find(taskId);
    if (!current) return null;
    const status = input.status ?? current.status;
    const moved = status !== current.status;
    const position = moved
      ? readNumber(
          this.database
            .prepare(
              `SELECT COALESCE(MAX(position), -1) + 1 AS next_position
               FROM board_tasks
               WHERE status = ? AND archived_at IS NULL`,
            )
            .get(status) as DatabaseRow,
          "next_position",
        )
      : current.position;
    this.database
      .prepare(
        `UPDATE board_tasks SET
           session_id = ?, root_run_id = ?, title = ?, objective = ?, status = ?, position = ?,
           updated_at = ?, completed_at = ?
         WHERE id = ? AND archived_at IS NULL`,
      )
      .run(
        input.sessionId ?? current.sessionId,
        input.rootRunId ?? current.rootRunId,
        input.title ?? current.title,
        input.objective ?? current.objective,
        status,
        position,
        input.updatedAt,
        input.completedAt === undefined ? current.completedAt : input.completedAt,
        taskId,
      );
    return this.find(taskId);
  }
}
