import { randomUUID } from "node:crypto";
import { chmod, mkdir, readFile, rename, rm, stat, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import {
  type AgentManager,
  type ApprovalResponseDecision,
  type ContextCheckpointRestoredData,
  type FileChangedData,
  type HarnessEvent,
  HarnessEventType,
  type HarnessUserMessage,
  isHarnessUserMessage,
  type MessageBranchStartedData,
  type QueuedRunInput,
  RunFileChangeOperation,
  type RunId,
  type RunUserInput,
  rewriteHarnessUserMessage,
  type SessionId,
  type StreamFn,
  selectActiveSessionEvents,
  UserInputContextError,
} from "@pi-harness/agent-runtime";
import {
  DEFAULT_THINKING_LEVEL,
  type ThinkingLevel,
  ThinkingLevel as ThinkingLevels,
} from "@pi-harness/agent-runtime/thinking-level";
import { resolveWorkspacePath } from "@pi-harness/policy";
import { type Api, getSupportedThinkingLevels, type Model } from "@pi-harness/providers";
import { isPlainObject } from "es-toolkit";
import {
  buildSessionTitlePrompt,
  SESSION_TITLE_SYSTEM_PROMPT,
} from "../prompts/session-title-prompt.js";
import type {
  AppSettingRepository,
  SessionRecord,
  SessionRepository,
  WorkspaceRepository,
} from "../storage/database.js";
import type { SessionEventSnapshot, SessionEventStore } from "../storage/session-event-store.js";
import { normalizeSessionSearchQuery, readSessionSearchContent } from "../utils/session-search.js";
import {
  buildSessionTitleSource,
  createFallbackSessionTitle,
  normalizeGeneratedSessionTitle,
} from "../utils/session-title.js";
import type { HumanInteractionService, PendingToolApproval } from "./human-interaction-service.js";
import type { ProviderService } from "./provider-service.js";
import type { SessionEventService } from "./session-event-service.js";

const SessionErrorCode = {
  BUSY: "SESSION_BUSY",
  CHECKPOINT_NOT_FOUND: "CONTEXT_CHECKPOINT_NOT_FOUND",
  EMPTY_PROMPT: "EMPTY_RUN_PROMPT",
  EMPTY_TITLE: "EMPTY_SESSION_TITLE",
  NOT_FOUND: "SESSION_NOT_FOUND",
  RUN_CHANGES_CONFLICT: "RUN_CHANGES_CONFLICT",
  RUN_CHANGES_NOT_FOUND: "RUN_CHANGES_NOT_FOUND",
  RUN_NOT_FOUND: "RUN_NOT_FOUND",
  QUEUED_INPUT_NOT_FOUND: "QUEUED_INPUT_NOT_FOUND",
  MESSAGE_NOT_FOUND: "MESSAGE_NOT_FOUND",
  USER_CONTEXT_INVALID: "USER_CONTEXT_INVALID",
  WORKSPACE_INVALID: "WORKSPACE_INVALID",
} as const;

const DEFAULT_SESSION_TITLE = "New session";
const MAX_REVERT_FILE_BYTES = 1024 * 1024;
const SESSION_TITLE_MAX_TOKENS = 64;
const SESSION_TITLE_TIMEOUT_MS = 10_000;

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
  title: string;
}

export interface UpdateSessionInput {
  archived?: boolean;
  title?: string;
}

export interface SessionSnapshot {
  events: readonly HarnessEvent[];
  session: SessionRecord;
}

export interface SessionSearchResult {
  description: string;
  excerpt: string;
  messageEventId: string | null;
  session: SessionRecord;
}

export interface SessionBackgroundErrorContext {
  providerId: string;
  runId: RunId;
  sessionId: SessionId;
}

function normalizeRunUserInput(input: RunUserInput): RunUserInput {
  const normalized = {
    attachments: input.attachments ?? [],
    prompt: input.prompt.trim(),
    references: input.references ?? [],
  } satisfies RunUserInput;
  if (
    !normalized.prompt &&
    normalized.attachments.length === 0 &&
    normalized.references.length === 0
  ) {
    throw new SessionServiceError(SessionErrorCode.EMPTY_PROMPT, "消息内容不能为空");
  }
  return normalized;
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

  public list(archived = false): readonly (SessionRecord & { isRunning: boolean })[] {
    return this.sessions.list(archived).map((session) => ({
      ...session,
      isRunning: this.activeSessionIds.has(session.id) || this.agents.isSessionActive(session.id),
    }));
  }

  public async search(query: string): Promise<readonly SessionSearchResult[]> {
    const normalizedQuery = normalizeSessionSearchQuery(query);
    const sessions = this.sessions.list(false);

    // ponytail: 先按 SQLite Session 索引线性读取 JSONL；会话量导致可测延迟后再加可重建 FTS 索引。
    const results = await Promise.all(
      sessions.map(async (session): Promise<SessionSearchResult | null> => {
        const snapshot = await this.eventStore.load(session.id);
        const content = readSessionSearchContent(snapshot.messages, normalizedQuery);
        const hasTitleMatch = session.title.toLocaleLowerCase().includes(normalizedQuery);
        if (normalizedQuery && !hasTitleMatch && !content.hasMessageMatch) return null;
        const messageEventIds = selectActiveSessionEvents(snapshot.events).flatMap((event) =>
          event.type === HarnessEventType.MESSAGE_COMPLETED ? [event.id] : [],
        );
        return {
          description: content.description,
          excerpt: content.excerpt,
          messageEventId:
            content.matchingMessageIndex === null
              ? null
              : (messageEventIds[content.matchingMessageIndex] ?? null),
          session,
        };
      }),
    );

    return results.flatMap((result) => (result === null ? [] : [result]));
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

  public async restoreContextCheckpoint(sessionId: SessionId, eventSeq: number): Promise<void> {
    this.assertSessionIdle(sessionId);
    const session = this.getRequiredSession(sessionId);
    this.activeSessionIds.add(sessionId);
    try {
      const snapshot = await this.eventStore.load(sessionId);
      if (!snapshot.contextCheckpointHistory.some((record) => record.eventSeq === eventSeq)) {
        throw new SessionServiceError(
          SessionErrorCode.CHECKPOINT_NOT_FOUND,
          "Context checkpoint 不存在",
        );
      }
      await this.sessionEvents.handle({
        data: { sourceEventSeq: eventSeq } satisfies ContextCheckpointRestoredData,
        id: randomUUID(),
        seq: Math.max(session.lastSeq, snapshot.lastPersistedSeq) + 1,
        sessionId,
        timestamp: Date.now(),
        type: HarnessEventType.CONTEXT_CHECKPOINT_RESTORED,
      });
      if (!this.agents.applyContextCheckpointRestore(sessionId, eventSeq)) {
        throw new Error("Runtime context checkpoint restoration failed");
      }
    } finally {
      this.activeSessionIds.delete(sessionId);
    }
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
    const userInput = normalizeRunUserInput(input);

    this.activeSessionIds.add(sessionId);
    try {
      const session = this.getRequiredSession(sessionId);
      const snapshot = await this.eventStore.load(sessionId);
      this.reconcileIndex(session, snapshot);
      const resolvedModel = await this.providers.resolveRunModel(
        session.providerId,
        session.modelId,
      );
      return this.launchRun(session, snapshot, resolvedModel, userInput);
    } catch (error: unknown) {
      this.activeSessionIds.delete(sessionId);
      this.activeProviderBySession.delete(sessionId);
      throw error;
    }
  }

  public async retryUserMessage(
    sessionId: SessionId,
    sourceEventId: string,
    prompt: string,
  ): Promise<RunAccepted> {
    this.assertSessionIdle(sessionId);
    const normalizedPrompt = prompt.trim();
    if (!normalizedPrompt) {
      throw new SessionServiceError(SessionErrorCode.EMPTY_PROMPT, "消息内容不能为空");
    }

    this.activeSessionIds.add(sessionId);
    try {
      const session = this.getRequiredSession(sessionId);
      const snapshot = await this.eventStore.load(sessionId);
      this.reconcileIndex(session, snapshot);
      const source = selectActiveSessionEvents(snapshot.events).findLast(
        (event) =>
          event.type === HarnessEventType.MESSAGE_COMPLETED && isHarnessUserMessage(event.data),
      );
      if (source?.id !== sourceEventId || !isHarnessUserMessage(source.data)) {
        throw new SessionServiceError(
          SessionErrorCode.MESSAGE_NOT_FOUND,
          "只能编辑当前分支的最后一条用户消息",
        );
      }
      const resolvedModel = await this.providers.resolveRunModel(
        session.providerId,
        session.modelId,
      );
      await this.sessionEvents.handle({
        data: { sourceEventId } satisfies MessageBranchStartedData,
        id: randomUUID(),
        seq: Math.max(session.lastSeq, snapshot.lastPersistedSeq) + 1,
        sessionId,
        timestamp: Date.now(),
        type: HarnessEventType.MESSAGE_BRANCH_STARTED,
      });
      const branchedSnapshot = await this.eventStore.load(sessionId);
      if (
        !this.agents.restoreHistory(sessionId, {
          contextCheckpoint: branchedSnapshot.contextCheckpoint,
          contextCheckpointEventSeq: branchedSnapshot.contextCheckpointEventSeq,
          contextCheckpointHistory: branchedSnapshot.contextCheckpointHistory,
          contextCheckpointTailStartMessageIndex:
            branchedSnapshot.contextCheckpointTailStartMessageIndex,
          initialSeq: branchedSnapshot.lastPersistedSeq,
          messages: branchedSnapshot.messages,
          plan: branchedSnapshot.plan,
          todos: branchedSnapshot.todos,
        })
      ) {
        throw new SessionServiceError(SessionErrorCode.BUSY, "Session 正在运行");
      }
      const userInput = {
        attachments: [],
        prompt: normalizedPrompt,
        references: source.data.contextReferences ?? [],
      } satisfies RunUserInput;
      return this.launchRun(
        session,
        branchedSnapshot,
        resolvedModel,
        userInput,
        rewriteHarnessUserMessage(source.data, normalizedPrompt),
      );
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

  public async followUpRun(
    sessionId: SessionId,
    runId: RunId,
    input: RunUserInput,
  ): Promise<QueuedRunInput> {
    this.getRequiredSession(sessionId);
    const userInput = normalizeRunUserInput(input);
    let queued: QueuedRunInput | null;
    try {
      queued = await this.agents.followUp(sessionId, runId, userInput);
    } catch (error: unknown) {
      throw new SessionServiceError(
        SessionErrorCode.USER_CONTEXT_INVALID,
        error instanceof UserInputContextError
          ? error.message
          : "无法读取附件或引用上下文，请确认文件仍然存在且可访问",
      );
    }
    if (queued === null) {
      throw new SessionServiceError(SessionErrorCode.RUN_NOT_FOUND, "活动 Run 不存在");
    }
    return queued;
  }

  public async steerRun(sessionId: SessionId, runId: RunId, input: RunUserInput): Promise<void> {
    this.getRequiredSession(sessionId);
    const userInput = normalizeRunUserInput(input);
    let wasQueued: boolean;
    try {
      wasQueued = await this.agents.steer(sessionId, runId, userInput);
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

  public listQueuedFollowUps(sessionId: SessionId, runId: RunId): readonly QueuedRunInput[] {
    this.getRequiredSession(sessionId);
    return this.agents.listQueuedFollowUps(sessionId, runId);
  }

  public async updateQueuedFollowUp(
    sessionId: SessionId,
    runId: RunId,
    queuedInputId: string,
    prompt: string,
  ): Promise<QueuedRunInput> {
    this.getRequiredSession(sessionId);
    const normalizedPrompt = prompt.trim();
    if (!normalizedPrompt) {
      throw new SessionServiceError(SessionErrorCode.EMPTY_PROMPT, "消息内容不能为空");
    }
    let queued: QueuedRunInput | null;
    try {
      queued = await this.agents.updateFollowUp(sessionId, runId, queuedInputId, normalizedPrompt);
    } catch (error: unknown) {
      throw new SessionServiceError(
        SessionErrorCode.USER_CONTEXT_INVALID,
        error instanceof UserInputContextError
          ? error.message
          : "无法读取附件或引用上下文，请确认文件仍然存在且可访问",
      );
    }
    if (queued === null) {
      throw new SessionServiceError(
        SessionErrorCode.QUEUED_INPUT_NOT_FOUND,
        "排队消息不存在或已经开始处理",
      );
    }
    return queued;
  }

  public async removeQueuedFollowUp(
    sessionId: SessionId,
    runId: RunId,
    queuedInputId: string,
  ): Promise<void> {
    this.getRequiredSession(sessionId);
    if (!(await this.agents.removeFollowUp(sessionId, runId, queuedInputId))) {
      throw new SessionServiceError(
        SessionErrorCode.QUEUED_INPUT_NOT_FOUND,
        "排队消息不存在或已经开始处理",
      );
    }
  }

  public async steerQueuedFollowUp(
    sessionId: SessionId,
    runId: RunId,
    queuedInputId: string,
  ): Promise<void> {
    this.getRequiredSession(sessionId);
    if (!(await this.agents.steerFollowUp(sessionId, runId, queuedInputId))) {
      throw new SessionServiceError(
        SessionErrorCode.QUEUED_INPUT_NOT_FOUND,
        "排队消息不存在或已经开始处理",
      );
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

  private async generateSessionTitle(
    model: Model<Api>,
    streamFn: StreamFn,
    source: string,
  ): Promise<string> {
    const fallback = createFallbackSessionTitle(source);
    const supportsLowReasoning = getSupportedThinkingLevels(model).includes(ThinkingLevels.LOW);
    try {
      const stream = await streamFn(
        model,
        {
          messages: [
            {
              content: buildSessionTitlePrompt(source),
              role: "user",
              timestamp: Date.now(),
            },
          ],
          systemPrompt: SESSION_TITLE_SYSTEM_PROMPT,
        },
        {
          maxRetries: 0,
          maxTokens: SESSION_TITLE_MAX_TOKENS,
          ...(supportsLowReasoning ? { reasoning: ThinkingLevels.LOW } : {}),
          signal: AbortSignal.timeout(SESSION_TITLE_TIMEOUT_MS),
          timeoutMs: SESSION_TITLE_TIMEOUT_MS,
        },
      );
      const response = await stream.result();
      if (response.stopReason === "aborted" || response.stopReason === "error") return fallback;
      const text = response.content
        .flatMap((part) => (part.type === "text" ? [part.text] : []))
        .join(" ");
      return normalizeGeneratedSessionTitle(text, fallback);
    } catch {
      return fallback;
    }
  }

  private async launchRun(
    session: SessionRecord,
    snapshot: SessionEventSnapshot,
    resolvedModel: { model: Model<Api>; streamFn: StreamFn },
    userInput: RunUserInput,
    userMessage?: HarnessUserMessage,
  ): Promise<RunAccepted> {
    const { model, streamFn } = resolvedModel;
    const runId = randomUUID();
    this.activeProviderBySession.set(session.id, session.providerId);
    const task = this.agents.startRun({
      approvalPolicy: this.settings.getApprovalPolicy(),
      initialSeq: Math.max(session.lastSeq, snapshot.lastPersistedSeq),
      contextCheckpoint: snapshot.contextCheckpoint,
      contextCheckpointEventSeq: snapshot.contextCheckpointEventSeq,
      contextCheckpointHistory: snapshot.contextCheckpointHistory,
      contextCheckpointTailStartMessageIndex: snapshot.contextCheckpointTailStartMessageIndex,
      messages: snapshot.messages,
      model,
      modelId: session.modelId,
      plan: snapshot.plan,
      userInput,
      ...(userMessage === undefined ? {} : { userMessage }),
      providerId: session.providerId,
      runId,
      sessionId: session.id,
      streamFn,
      thinkingLevel: session.thinkingLevel,
      todos: snapshot.todos,
      workspaceRoot: session.workspaceRoot,
    });
    this.trackBackgroundTask(task, {
      providerId: session.providerId,
      runId,
      sessionId: session.id,
    });
    let title = session.title;
    if (snapshot.messages.length === 0 && title === DEFAULT_SESSION_TITLE) {
      const source = buildSessionTitleSource(
        userInput.prompt,
        userInput.attachments.map((attachment) => attachment.name),
        userInput.references.map((reference) => reference.path),
      );
      const generatedTitle = await this.generateSessionTitle(model, streamFn, source);
      if (this.sessions.updateTitle(session.id, generatedTitle, Date.now())) title = generatedTitle;
    }
    return { runId, title };
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
