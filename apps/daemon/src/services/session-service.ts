import { randomUUID } from "node:crypto";
import { chmod, mkdir, readFile, rename, rm, stat, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import {
  type AgentManager,
  type ApprovalResponseDecision,
  type FileChangedData,
  type HarnessEvent,
  HarnessEventType,
  RunFileChangeOperation,
  type RunId,
  type RunUserInput,
  type SessionId,
  UserInputContextError,
} from "@pi-harness/agent-runtime";
import {
  DEFAULT_THINKING_LEVEL,
  type ThinkingLevel,
} from "@pi-harness/agent-runtime/thinking-level";
import { resolveWorkspacePath } from "@pi-harness/policy";
import { isPlainObject } from "es-toolkit";
import type {
  AppSettingRepository,
  SessionRecord,
  SessionRepository,
  WorkspaceRepository,
} from "../storage/database.js";
import type { SessionEventSnapshot, SessionEventStore } from "../storage/session-event-store.js";
import type { HumanInteractionService, PendingToolApproval } from "./human-interaction-service.js";
import type { ProviderService } from "./provider-service.js";
import type { SessionEventService } from "./session-event-service.js";

const SessionErrorCode = {
  BUSY: "SESSION_BUSY",
  EMPTY_PROMPT: "EMPTY_RUN_PROMPT",
  EMPTY_TITLE: "EMPTY_SESSION_TITLE",
  NOT_FOUND: "SESSION_NOT_FOUND",
  RUN_CHANGES_CONFLICT: "RUN_CHANGES_CONFLICT",
  RUN_CHANGES_NOT_FOUND: "RUN_CHANGES_NOT_FOUND",
  RUN_NOT_FOUND: "RUN_NOT_FOUND",
  USER_CONTEXT_INVALID: "USER_CONTEXT_INVALID",
  WORKSPACE_INVALID: "WORKSPACE_INVALID",
} as const;

const DEFAULT_SESSION_TITLE = "New session";
const MAX_REVERT_FILE_BYTES = 1024 * 1024;

export type SessionErrorCode = (typeof SessionErrorCode)[keyof typeof SessionErrorCode];

export class SessionServiceError extends Error {
  public constructor(
    public readonly code: SessionErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "SessionServiceError";
  }
}

export interface CreateSessionInput {
  modelId: string;
  providerId: string;
  thinkingLevel?: ThinkingLevel;
  title?: string;
  workspaceId: string;
}

export interface RunAccepted {
  runId: RunId;
}

export interface UpdateSessionInput {
  archived?: boolean;
  title?: string;
}

export interface SessionSnapshot {
  events: readonly HarnessEvent[];
  session: SessionRecord;
}

export interface SessionBackgroundErrorContext {
  providerId: string;
  runId: RunId;
  sessionId: SessionId;
}

export type SessionBackgroundErrorHandler = (
  error: unknown,
  context: SessionBackgroundErrorContext,
) => void;

function normalizeTitle(value: string | undefined): string {
  const title = value?.trim();
  return title ? title : DEFAULT_SESSION_TITLE;
}

interface RunFileChange {
  after: string;
  before: string | null;
  path: string;
}

interface WorkspaceFileState {
  content: string | null;
  mode?: number;
}

function readRunFileChanges(events: readonly HarnessEvent[], runId: RunId): RunFileChange[] {
  const changesByPath = new Map<string, RunFileChange>();

  for (const event of events) {
    if (
      event.runId !== runId ||
      event.type !== HarnessEventType.FILE_CHANGED ||
      !isPlainObject(event.data)
    ) {
      continue;
    }
    const { after, before, path, toolName } = event.data;
    if (
      typeof after !== "string" ||
      (before !== null && typeof before !== "string") ||
      typeof path !== "string" ||
      path.length === 0
    ) {
      continue;
    }
    if (toolName === RunFileChangeOperation.REAPPLY || toolName === RunFileChangeOperation.REVERT) {
      continue;
    }
    const existing = changesByPath.get(path);
    changesByPath.set(path, { after, before: existing ? existing.before : before, path });
  }

  return [...changesByPath.values()].filter((change) => (change.before ?? "") !== change.after);
}

async function readWorkspaceFileState(path: string): Promise<WorkspaceFileState> {
  try {
    const metadata = await stat(path);
    if (!metadata.isFile() || metadata.size > MAX_REVERT_FILE_BYTES) {
      throw new SessionServiceError(
        SessionErrorCode.RUN_CHANGES_CONFLICT,
        "文件类型或大小已变化，无法安全处理本轮更改",
      );
    }
    const content = await readFile(path);
    if (content.includes(0)) {
      throw new SessionServiceError(
        SessionErrorCode.RUN_CHANGES_CONFLICT,
        "文件已变为二进制内容，无法安全处理本轮更改",
      );
    }
    try {
      return {
        content: new TextDecoder("utf-8", { fatal: true }).decode(content),
        mode: metadata.mode,
      };
    } catch {
      throw new SessionServiceError(
        SessionErrorCode.RUN_CHANGES_CONFLICT,
        "文件编码已变化，无法安全处理本轮更改",
      );
    }
  } catch (error: unknown) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") {
      return { content: null };
    }
    throw error;
  }
}

async function restoreWorkspaceFile(path: string, state: WorkspaceFileState): Promise<void> {
  if (state.content === null) {
    await rm(path, { force: true });
    return;
  }

  await mkdir(dirname(path), { recursive: true });
  const temporaryPath = resolve(dirname(path), `.${randomUUID()}.tmp`);
  try {
    await writeFile(temporaryPath, state.content, "utf8");
    if (state.mode !== undefined) await chmod(temporaryPath, state.mode);
    await rename(temporaryPath, path);
  } finally {
    await rm(temporaryPath, { force: true });
  }
}

export class SessionService {
  private readonly activeSessionIds = new Set<SessionId>();
  private readonly activeProviderBySession = new Map<SessionId, string>();
  private readonly backgroundTasks = new Set<Promise<void>>();

  public constructor(
    private readonly sessions: SessionRepository,
    private readonly workspaces: WorkspaceRepository,
    private readonly settings: AppSettingRepository,
    private readonly eventStore: SessionEventStore,
    private readonly sessionEvents: SessionEventService,
    private readonly providers: ProviderService,
    private readonly agents: AgentManager,
    private readonly interactions: HumanInteractionService,
    private readonly onBackgroundError: SessionBackgroundErrorHandler,
    private readonly protectedPaths: readonly string[],
  ) {}

  public async create(input: CreateSessionInput): Promise<SessionRecord> {
    const workspace = this.workspaces.find(input.workspaceId);
    if (!workspace || workspace.removedAt !== null) {
      throw new SessionServiceError(SessionErrorCode.WORKSPACE_INVALID, "Workspace 不存在");
    }
    await this.providers.resolveRunModel(input.providerId, input.modelId);
    const createdAt = Date.now();
    return this.sessions.create({
      createdAt,
      id: randomUUID(),
      modelId: input.modelId,
      providerId: input.providerId,
      thinkingLevel: input.thinkingLevel ?? DEFAULT_THINKING_LEVEL,
      title: normalizeTitle(input.title),
      workspaceId: input.workspaceId,
    });
  }

  public list(archived = false): readonly SessionRecord[] {
    return this.sessions.list(archived);
  }

  public isProviderActive(providerId: string): boolean {
    return [...this.activeProviderBySession.values()].includes(providerId);
  }

  public async getSnapshot(sessionId: SessionId): Promise<SessionSnapshot> {
    const session = this.getRequiredSession(sessionId);
    const snapshot = await this.eventStore.load(sessionId);
    this.reconcileIndex(session, snapshot);
    return { events: snapshot.events, session: this.getRequiredSession(sessionId) };
  }

  public async updateModel(
    sessionId: SessionId,
    providerId: string,
    modelId: string,
    thinkingLevel?: ThinkingLevel,
  ): Promise<SessionRecord> {
    this.getRequiredSession(sessionId);
    await this.providers.resolveRunModel(providerId, modelId);
    if (!this.sessions.updateModel(sessionId, providerId, modelId, thinkingLevel, Date.now())) {
      throw new SessionServiceError(SessionErrorCode.NOT_FOUND, "Session 不存在");
    }
    return this.getRequiredSession(sessionId);
  }

  public update(sessionId: SessionId, input: UpdateSessionInput): SessionRecord {
    this.assertSessionIdle(sessionId);
    this.getRequiredSession(sessionId);
    const updatedAt = Date.now();

    if (input.title !== undefined) {
      const title = input.title.trim();
      if (!title) {
        throw new SessionServiceError(SessionErrorCode.EMPTY_TITLE, "Session 标题不能为空");
      }
      if (!this.sessions.updateTitle(sessionId, title, updatedAt)) {
        throw new SessionServiceError(SessionErrorCode.NOT_FOUND, "Session 不存在");
      }
    }

    if (
      input.archived !== undefined &&
      !this.sessions.setArchived(sessionId, input.archived ? updatedAt : null, updatedAt)
    ) {
      throw new SessionServiceError(SessionErrorCode.NOT_FOUND, "Session 不存在");
    }

    return this.getRequiredSession(sessionId);
  }

  public async startRun(sessionId: SessionId, input: RunUserInput): Promise<RunAccepted> {
    // 1. Session 是否空闲
    this.assertSessionIdle(sessionId);
    const prompt = input.prompt.trim();
    const userInput = {
      attachments: input.attachments ?? [],
      prompt,
      references: input.references ?? [],
    } satisfies RunUserInput;
    if (!prompt && userInput.attachments.length === 0 && userInput.references.length === 0) {
      throw new SessionServiceError(SessionErrorCode.EMPTY_PROMPT, "消息内容不能为空");
    }

    this.activeSessionIds.add(sessionId);
    try {
      const session = this.getRequiredSession(sessionId);
      this.activeProviderBySession.set(sessionId, session.providerId);
      // 2. 从 JSONL 恢复事件和完整消息
      const snapshot = await this.eventStore.load(sessionId);
      this.reconcileIndex(session, snapshot);
      // 3. 获取模型和流函数
      const { model, streamFn } = await this.providers.resolveRunModel(
        session.providerId,
        session.modelId,
      );
      const runId = randomUUID();
      // 4. 生成 runId 并启动
      const task = this.agents.startRun({
        approvalPolicy: this.settings.getApprovalPolicy(),
        initialSeq: Math.max(session.lastSeq, snapshot.lastPersistedSeq),
        messages: snapshot.messages,
        model,
        modelId: session.modelId,
        userInput,
        providerId: session.providerId,
        runId,
        sessionId,
        streamFn,
        thinkingLevel: session.thinkingLevel,
        workspaceRoot: session.workspaceRoot,
      });
      this.trackBackgroundTask(task, { providerId: session.providerId, runId, sessionId });
      return { runId };
    } catch (error: unknown) {
      this.activeSessionIds.delete(sessionId);
      this.activeProviderBySession.delete(sessionId);
      throw error;
    }
  }

  public abortRun(sessionId: SessionId, runId: RunId): void {
    this.getRequiredSession(sessionId);
    if (!this.agents.abort(sessionId, runId)) {
      throw new SessionServiceError(SessionErrorCode.RUN_NOT_FOUND, "活动 Run 不存在");
    }
  }

  public async followUpRun(sessionId: SessionId, runId: RunId, input: RunUserInput): Promise<void> {
    this.getRequiredSession(sessionId);
    const userInput = {
      attachments: input.attachments ?? [],
      prompt: input.prompt.trim(),
      references: input.references ?? [],
    } satisfies RunUserInput;
    if (
      !userInput.prompt &&
      userInput.attachments.length === 0 &&
      userInput.references.length === 0
    ) {
      throw new SessionServiceError(SessionErrorCode.EMPTY_PROMPT, "消息内容不能为空");
    }
    let wasQueued: boolean;
    try {
      wasQueued = await this.agents.followUp(sessionId, runId, userInput);
    } catch (error: unknown) {
      throw new SessionServiceError(
        SessionErrorCode.USER_CONTEXT_INVALID,
        error instanceof UserInputContextError
          ? error.message
          : "无法读取附件或引用上下文，请确认文件仍然存在且可访问",
      );
    }
    if (!wasQueued) {
      throw new SessionServiceError(SessionErrorCode.RUN_NOT_FOUND, "活动 Run 不存在");
    }
  }

  public async revertRunChanges(sessionId: SessionId, runId: RunId): Promise<void> {
    await this.applyRunChanges(sessionId, runId, false);
  }

  public async reapplyRunChanges(sessionId: SessionId, runId: RunId): Promise<void> {
    await this.applyRunChanges(sessionId, runId, true);
  }

  private async applyRunChanges(
    sessionId: SessionId,
    runId: RunId,
    shouldReapply: boolean,
  ): Promise<void> {
    this.assertSessionIdle(sessionId);
    this.activeSessionIds.add(sessionId);
    try {
      const action = shouldReapply ? "重新应用" : "撤销";
      const operation = shouldReapply
        ? RunFileChangeOperation.REAPPLY
        : RunFileChangeOperation.REVERT;
      const session = this.getRequiredSession(sessionId);
      const snapshot = await this.eventStore.load(sessionId);
      this.reconcileIndex(session, snapshot);
      if (!snapshot.events.some((event) => event.runId === runId)) {
        throw new SessionServiceError(SessionErrorCode.RUN_NOT_FOUND, "Run 不存在");
      }

      const changes = readRunFileChanges(snapshot.events, runId);
      if (changes.length === 0) {
        throw new SessionServiceError(
          SessionErrorCode.RUN_CHANGES_NOT_FOUND,
          `本轮没有可${action}的文件更改`,
        );
      }

      const currentStates = new Map<string, WorkspaceFileState>();
      const resolvedPaths = new Map<string, string>();
      for (const change of changes) {
        const path = await resolveWorkspacePath({
          allowMissing: true,
          path: change.path,
          protectedPaths: this.protectedPaths,
          workspaceRoot: session.workspaceRoot,
        });
        const current = await readWorkspaceFileState(path);
        const matchesExpectedState = shouldReapply
          ? current.content === change.before
          : current.content === change.after || (current.content === null && change.after === "");
        if (!matchesExpectedState) {
          throw new SessionServiceError(
            SessionErrorCode.RUN_CHANGES_CONFLICT,
            `${change.path} 当前内容已变化，无法安全${action}`,
          );
        }
        currentStates.set(change.path, current);
        resolvedPaths.set(change.path, path);
      }

      const restoredPaths: string[] = [];
      try {
        for (const change of changes) {
          const path = resolvedPaths.get(change.path);
          if (!path) throw new Error("Resolved workspace path is missing");
          const current = currentStates.get(change.path);
          const targetContent = shouldReapply
            ? change.after === ""
              ? null
              : change.after
            : change.before;
          await restoreWorkspaceFile(path, {
            content: targetContent,
            ...(current?.mode === undefined ? {} : { mode: current.mode }),
          });
          restoredPaths.push(change.path);
        }
      } catch (error: unknown) {
        const rollbackErrors: unknown[] = [];
        for (const workspacePath of restoredPaths.reverse()) {
          const path = resolvedPaths.get(workspacePath);
          const current = currentStates.get(workspacePath);
          if (!path || !current) continue;
          try {
            await restoreWorkspaceFile(path, current);
          } catch (rollbackError: unknown) {
            rollbackErrors.push(rollbackError);
          }
        }
        if (rollbackErrors.length > 0) {
          throw new AggregateError(
            [error, ...rollbackErrors],
            `${action}失败，且无法完整恢复文件状态`,
          );
        }
        throw error;
      }

      let nextSeq = Math.max(session.lastSeq, snapshot.lastPersistedSeq) + 1;
      const toolCallId = randomUUID();
      for (const change of changes) {
        const current = currentStates.get(change.path);
        const targetContent = shouldReapply
          ? change.after === ""
            ? null
            : change.after
          : change.before;
        await this.sessionEvents.handle({
          data: {
            after: targetContent ?? "",
            before: current?.content ?? null,
            diff: "",
            path: change.path,
            toolCallId,
            toolName: operation,
          } satisfies FileChangedData,
          id: randomUUID(),
          runId,
          seq: nextSeq,
          sessionId,
          timestamp: Date.now(),
          type: HarnessEventType.FILE_CHANGED,
        });
        nextSeq += 1;
      }
    } finally {
      this.activeSessionIds.delete(sessionId);
    }
  }

  public getPendingApproval(sessionId: SessionId, runId: RunId): PendingToolApproval | null {
    this.getRequiredSession(sessionId);
    return this.interactions.getCurrent(sessionId, runId);
  }

  public resolveApproval(
    sessionId: SessionId,
    runId: RunId,
    approvalId: string,
    decision: ApprovalResponseDecision,
  ): void {
    this.getRequiredSession(sessionId);
    this.interactions.resolve(sessionId, runId, approvalId, decision);
  }

  public async close(): Promise<void> {
    await this.agents.close();
    this.interactions.close();
    await Promise.all([...this.backgroundTasks]);
    this.activeSessionIds.clear();
    this.activeProviderBySession.clear();
  }

  private assertSessionIdle(sessionId: SessionId): void {
    if (this.activeSessionIds.has(sessionId) || this.agents.isSessionActive(sessionId)) {
      throw new SessionServiceError(SessionErrorCode.BUSY, "Session 已有活动 Run");
    }
  }

  private getRequiredSession(sessionId: SessionId): SessionRecord {
    const session = this.sessions.find(sessionId);
    if (!session) throw new SessionServiceError(SessionErrorCode.NOT_FOUND, "Session 不存在");
    return session;
  }

  private reconcileIndex(session: SessionRecord, snapshot: SessionEventSnapshot): void {
    if (snapshot.lastPersistedSeq > session.lastSeq) {
      this.sessions.updateIndex(session.id, snapshot.lastPersistedSeq, Date.now());
    }
  }

  private trackBackgroundTask(task: Promise<void>, context: SessionBackgroundErrorContext): void {
    let observedTask: Promise<void>;
    observedTask = task
      .catch((error: unknown) => this.onBackgroundError(error, context))
      .finally(() => {
        this.backgroundTasks.delete(observedTask);
        this.activeSessionIds.delete(context.sessionId);
        this.activeProviderBySession.delete(context.sessionId);
      });
    this.backgroundTasks.add(observedTask);
  }
}
