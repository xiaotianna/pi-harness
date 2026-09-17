import { randomUUID } from "node:crypto";
import { basename } from "node:path";
import {
  type ApprovalRequestedData,
  type FileChangedData,
  type HarnessEvent,
  HarnessEventType,
  type InputRequestedData,
  type RunFailureData,
} from "@pi-harness/agent-runtime";
import {
  isPlanUpdatedData,
  isTodoUpdatedData,
  PlanStepStatus,
  TodoStatus,
} from "@pi-harness/tools";
import { isPlainObject } from "es-toolkit";
import {
  BoardTaskStatus,
  type BoardTaskStatus as BoardTaskStatusValue,
} from "../schemas/board-task.js";
import type { BoardTaskRecord, BoardTaskRepository } from "../storage/board-task-repository.js";
import type { WorkspaceRepository } from "../storage/database.js";
import type { SessionEventStore } from "../storage/session-event-store.js";

const BOARD_TASK_STATUS_ORDER = [
  BoardTaskStatus.PENDING,
  BoardTaskStatus.IN_PROGRESS,
  BoardTaskStatus.WAITING,
  BoardTaskStatus.CONFIRMATION,
  BoardTaskStatus.COMPLETED,
] as const;

const BOARD_TASK_EVENT_TYPES = new Set<string>([
  HarnessEventType.APPROVAL_REQUESTED,
  HarnessEventType.APPROVAL_RESOLVED,
  HarnessEventType.INPUT_REQUESTED,
  HarnessEventType.INPUT_RESOLVED,
  HarnessEventType.INPUT_EXPIRED,
  HarnessEventType.RUN_FAILED,
  HarnessEventType.RUN_ABORTED,
  HarnessEventType.RUN_COMPLETED,
  HarnessEventType.TODO_UPDATED,
  HarnessEventType.PLAN_UPDATED,
  HarnessEventType.FILE_CHANGED,
]);

export const BoardTaskErrorCode = {
  INVALID_INPUT: "BOARD_TASK_INVALID",
  NOT_FOUND: "BOARD_TASK_NOT_FOUND",
  RUN_CONFLICT: "BOARD_TASK_RUN_CONFLICT",
  WORKSPACE_INVALID: "WORKSPACE_INVALID",
} as const;

export type BoardTaskErrorCode = (typeof BoardTaskErrorCode)[keyof typeof BoardTaskErrorCode];

export class BoardTaskServiceError extends Error {
  public constructor(
    public readonly code: BoardTaskErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "BoardTaskServiceError";
  }
}

export interface BoardTaskProgress {
  completed: number;
  total: number;
}

export interface BoardTaskView extends BoardTaskRecord {
  attentionReason: string | null;
  currentStep: string | null;
  fileChangeCount: number;
  progress: BoardTaskProgress | null;
  workspaceName: string;
}

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

interface AttachBoardTaskRunInput {
  objective: string;
  runId: string;
  sessionId: string;
  taskId?: string;
  title: string;
  workspaceId: string;
}

function readIdentifier(data: unknown, key: string): string | null {
  if (!isPlainObject(data)) return null;
  const value = data[key];
  return typeof value === "string" ? value : null;
}

function deriveAttentionReason(events: readonly HarnessEvent[], runId: string): string | null {
  const pendingApprovals = new Map<string, string>();
  const pendingInputs = new Map<string, string>();
  let failure: string | null = null;

  for (const event of events) {
    if (event.runId !== runId) continue;
    if (event.type === HarnessEventType.APPROVAL_REQUESTED) {
      const approvalId = readIdentifier(event.data, "approvalId");
      if (approvalId) {
        const data = event.data as ApprovalRequestedData;
        pendingApprovals.set(approvalId, data.summary || "需要批准一项操作");
      }
    }
    if (event.type === HarnessEventType.APPROVAL_RESOLVED) {
      const approvalId = readIdentifier(event.data, "approvalId");
      if (approvalId) pendingApprovals.delete(approvalId);
    }
    if (event.type === HarnessEventType.INPUT_REQUESTED) {
      const inputId = readIdentifier(event.data, "inputId");
      if (inputId) {
        const data = event.data as InputRequestedData;
        pendingInputs.set(inputId, data.questions[0]?.question ?? "需要补充信息");
      }
    }
    if (
      event.type === HarnessEventType.INPUT_RESOLVED ||
      event.type === HarnessEventType.INPUT_EXPIRED
    ) {
      const inputId = readIdentifier(event.data, "inputId");
      if (inputId) pendingInputs.delete(inputId);
    }
    if (
      (event.type === HarnessEventType.RUN_FAILED || event.type === HarnessEventType.RUN_ABORTED) &&
      isPlainObject(event.data) &&
      typeof event.data.message === "string"
    ) {
      failure = (event.data as RunFailureData).message;
    }
    if (event.type === HarnessEventType.RUN_COMPLETED) failure = null;
  }

  return [...pendingApprovals.values()].at(-1) ?? [...pendingInputs.values()].at(-1) ?? failure;
}

function deriveProgress(events: readonly HarnessEvent[], runId: string) {
  let currentStep: string | null = null;
  let progress: BoardTaskProgress | null = null;

  for (const event of events) {
    if (event.runId !== runId) continue;
    if (event.type === HarnessEventType.TODO_UPDATED && isTodoUpdatedData(event.data)) {
      const todos = event.data.todos.filter((todo) => todo.status !== TodoStatus.CANCELLED);
      currentStep =
        todos.find((todo) => todo.status === TodoStatus.IN_PROGRESS)?.content ??
        todos.find((todo) => todo.status === TodoStatus.BLOCKED)?.content ??
        todos.find((todo) => todo.status === TodoStatus.PENDING)?.content ??
        currentStep;
      progress = {
        completed: todos.filter((todo) => todo.status === TodoStatus.COMPLETED).length,
        total: todos.length,
      };
    }
    if (event.type === HarnessEventType.PLAN_UPDATED && isPlanUpdatedData(event.data)) {
      currentStep =
        event.data.plan.find((step) => step.status === PlanStepStatus.IN_PROGRESS)?.step ??
        event.data.plan.find((step) => step.status === PlanStepStatus.PENDING)?.step ??
        currentStep;
      if (progress === null) {
        progress = {
          completed: event.data.plan.filter((step) => step.status === PlanStepStatus.COMPLETED)
            .length,
          total: event.data.plan.length,
        };
      }
    }
  }
  return { currentStep, progress };
}

export class BoardTaskService {
  public constructor(
    private readonly tasks: BoardTaskRepository,
    private readonly workspaces: WorkspaceRepository,
    private readonly eventStore: SessionEventStore,
  ) {}

  public async list(workspaceId?: string): Promise<readonly BoardTaskView[]> {
    const rank = new Map(BOARD_TASK_STATUS_ORDER.map((status, index) => [status, index]));
    const tasks = this.tasks
      .list()
      .filter((task) => workspaceId === undefined || task.workspaceId === workspaceId)
      .toSorted(
        (left, right) =>
          (rank.get(left.status) ?? 0) - (rank.get(right.status) ?? 0) ||
          left.position - right.position,
      );
    const runsBySession = new Map<string, Set<string>>();
    for (const task of tasks) {
      if (!task.sessionId || !task.rootRunId) continue;
      const runIds = runsBySession.get(task.sessionId) ?? new Set<string>();
      runIds.add(task.rootRunId);
      runsBySession.set(task.sessionId, runIds);
    }
    const eventsByRunId = new Map<string, readonly HarnessEvent[]>();
    for (const [sessionId, runIds] of runsBySession) {
      const events = await this.eventStore.loadRunEvents(sessionId, runIds, BOARD_TASK_EVENT_TYPES);
      for (const [runId, runEvents] of events) eventsByRunId.set(runId, runEvents);
    }
    return Promise.all(
      tasks.map((task) => this.toView(task, eventsByRunId.get(task.rootRunId ?? "") ?? [])),
    );
  }

  public async create(input: CreateBoardTaskInput): Promise<BoardTaskView> {
    this.assertWorkspace(input.workspaceId);
    const title = input.title.trim();
    if (!title) {
      throw new BoardTaskServiceError(BoardTaskErrorCode.INVALID_INPUT, "任务标题不能为空");
    }
    const created = this.tasks.create({
      createdAt: Date.now(),
      id: randomUUID(),
      objective: input.objective.trim(),
      status: BoardTaskStatus.PENDING,
      title,
      workspaceId: input.workspaceId,
    });
    return this.toView(created);
  }

  public delete(taskId: string): void {
    this.getRequired(taskId);
    if (!this.tasks.delete(taskId)) {
      throw new BoardTaskServiceError(BoardTaskErrorCode.NOT_FOUND, "看板任务不存在");
    }
  }

  public async update(taskId: string, input: UpdateBoardTaskInput): Promise<BoardTaskView> {
    const current = this.getRequired(taskId);
    const title = input.title?.trim();
    if (title !== undefined && !title) {
      throw new BoardTaskServiceError(BoardTaskErrorCode.INVALID_INPUT, "任务标题不能为空");
    }
    if (
      input.status === BoardTaskStatus.COMPLETED &&
      current.status !== BoardTaskStatus.CONFIRMATION &&
      current.status !== BoardTaskStatus.COMPLETED
    ) {
      throw new BoardTaskServiceError(
        BoardTaskErrorCode.INVALID_INPUT,
        "只有待确认任务可以确认完成",
      );
    }
    const status = input.status ?? current.status;
    const updated = this.tasks.update(taskId, {
      completedAt:
        status === BoardTaskStatus.COMPLETED
          ? (current.completedAt ?? Date.now())
          : status === current.status
            ? current.completedAt
            : null,
      ...(input.objective === undefined ? {} : { objective: input.objective.trim() }),
      status,
      ...(title === undefined ? {} : { title }),
      updatedAt: Date.now(),
    });
    if (!updated) {
      throw new BoardTaskServiceError(BoardTaskErrorCode.NOT_FOUND, "看板任务不存在");
    }
    return this.toView(updated);
  }

  public attachRun(input: AttachBoardTaskRunInput): BoardTaskRecord {
    if (input.taskId === undefined) {
      return this.tasks.create({
        createdAt: Date.now(),
        id: randomUUID(),
        objective: input.objective.trim(),
        rootRunId: input.runId,
        sessionId: input.sessionId,
        status: BoardTaskStatus.IN_PROGRESS,
        title: input.title.trim(),
        workspaceId: input.workspaceId,
      });
    }
    const task = this.getRequired(input.taskId);
    if (task.workspaceId !== input.workspaceId) {
      throw new BoardTaskServiceError(
        BoardTaskErrorCode.WORKSPACE_INVALID,
        "看板任务与会话不属于同一 Workspace",
      );
    }
    if (task.rootRunId !== null && task.rootRunId !== input.runId) {
      throw new BoardTaskServiceError(
        BoardTaskErrorCode.RUN_CONFLICT,
        "看板任务已经关联了其他 Run",
      );
    }
    const updated = this.tasks.update(task.id, {
      completedAt: null,
      rootRunId: input.runId,
      sessionId: input.sessionId,
      status: BoardTaskStatus.IN_PROGRESS,
      updatedAt: Date.now(),
    });
    if (!updated) throw new BoardTaskServiceError(BoardTaskErrorCode.NOT_FOUND, "看板任务不存在");
    return updated;
  }

  public async handleEvent(event: HarnessEvent): Promise<void> {
    if (!event.runId) return;
    const task = this.tasks.findByRunId(event.runId);
    if (!task) return;
    let status: BoardTaskStatusValue | null = null;
    if (
      event.type === HarnessEventType.RUN_STARTED ||
      event.type === HarnessEventType.RUN_RESUMED ||
      event.type === HarnessEventType.APPROVAL_RESOLVED ||
      event.type === HarnessEventType.INPUT_RESOLVED
    ) {
      status = BoardTaskStatus.IN_PROGRESS;
    } else if (
      event.type === HarnessEventType.RUN_AWAITING_INPUT ||
      event.type === HarnessEventType.APPROVAL_REQUESTED ||
      event.type === HarnessEventType.INPUT_REQUESTED ||
      event.type === HarnessEventType.INPUT_EXPIRED ||
      event.type === HarnessEventType.RUN_FAILED ||
      event.type === HarnessEventType.RUN_ABORTED
    ) {
      status = BoardTaskStatus.WAITING;
    } else if (event.type === HarnessEventType.RUN_COMPLETED) {
      status = BoardTaskStatus.CONFIRMATION;
    }
    if (status !== null && status !== task.status) {
      this.tasks.update(task.id, {
        completedAt: null,
        status,
        updatedAt: event.timestamp,
      });
    }
  }

  private assertWorkspace(workspaceId: string): void {
    const workspace = this.workspaces.find(workspaceId);
    if (!workspace || workspace.removedAt !== null) {
      throw new BoardTaskServiceError(BoardTaskErrorCode.WORKSPACE_INVALID, "Workspace 不存在");
    }
  }

  private getRequired(taskId: string): BoardTaskRecord {
    const task = this.tasks.find(taskId);
    if (!task || task.archivedAt !== null) {
      throw new BoardTaskServiceError(BoardTaskErrorCode.NOT_FOUND, "看板任务不存在");
    }
    return task;
  }

  private async toView(
    task: BoardTaskRecord,
    loadedEvents?: readonly HarnessEvent[],
  ): Promise<BoardTaskView> {
    const workspace = this.workspaces.find(task.workspaceId);
    const runEvents =
      loadedEvents ??
      (task.sessionId && task.rootRunId
        ? ((
            await this.eventStore.loadRunEvents(
              task.sessionId,
              new Set([task.rootRunId]),
              BOARD_TASK_EVENT_TYPES,
            )
          ).get(task.rootRunId) ?? [])
        : []);
    const { currentStep, progress } = task.rootRunId
      ? deriveProgress(runEvents, task.rootRunId)
      : { currentStep: null, progress: null };
    const fileChangeCount = new Set(
      runEvents.flatMap((event) =>
        event.type === HarnessEventType.FILE_CHANGED &&
        isPlainObject(event.data) &&
        typeof event.data.path === "string"
          ? [(event.data as FileChangedData).path]
          : [],
      ),
    ).size;
    return {
      ...task,
      attentionReason:
        task.rootRunId === null ? null : deriveAttentionReason(runEvents, task.rootRunId),
      currentStep,
      fileChangeCount,
      progress,
      workspaceName:
        workspace?.name?.trim() || (workspace ? basename(workspace.rootPath) : "未知项目"),
    };
  }
}
