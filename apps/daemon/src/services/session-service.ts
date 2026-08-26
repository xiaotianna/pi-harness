import { randomUUID } from "node:crypto";
import {
  type AgentManager,
  type ApprovalResponseDecision,
  buildSystemPrompt,
  type HarnessEvent,
  type RunId,
  type SessionId,
} from "@pi-harness/agent-runtime";
import type {
  AppSettingRepository,
  SessionRecord,
  SessionRepository,
  WorkspaceRepository,
} from "../storage/database.js";
import type { SessionEventSnapshot, SessionEventStore } from "../storage/session-event-store.js";
import type { HumanInteractionService, PendingToolApproval } from "./human-interaction-service.js";
import type { ProviderService } from "./provider-service.js";

const SessionErrorCode = {
  BUSY: "SESSION_BUSY",
  EMPTY_PROMPT: "EMPTY_RUN_PROMPT",
  EMPTY_TITLE: "EMPTY_SESSION_TITLE",
  NOT_FOUND: "SESSION_NOT_FOUND",
  RUN_NOT_FOUND: "RUN_NOT_FOUND",
  WORKSPACE_INVALID: "WORKSPACE_INVALID",
} as const;

const DEFAULT_SESSION_TITLE = "New session";

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

export class SessionService {
  private readonly activeSessionIds = new Set<SessionId>();
  private readonly activeProviderBySession = new Map<SessionId, string>();
  private readonly backgroundTasks = new Set<Promise<void>>();

  public constructor(
    private readonly sessions: SessionRepository,
    private readonly workspaces: WorkspaceRepository,
    private readonly settings: AppSettingRepository,
    private readonly eventStore: SessionEventStore,
    private readonly providers: ProviderService,
    private readonly agents: AgentManager,
    private readonly interactions: HumanInteractionService,
    private readonly onBackgroundError: SessionBackgroundErrorHandler,
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
      title: normalizeTitle(input.title),
      workspaceId: input.workspaceId,
    });
  }

  public list(): readonly SessionRecord[] {
    return this.sessions.list();
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
  ): Promise<SessionRecord> {
    this.getRequiredSession(sessionId);
    await this.providers.resolveRunModel(providerId, modelId);
    if (!this.sessions.updateModel(sessionId, providerId, modelId, Date.now())) {
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

  public async startRun(sessionId: SessionId, promptInput: string): Promise<RunAccepted> {
    // 1. Session 是否空闲
    this.assertSessionIdle(sessionId);
    const prompt = promptInput.trim();
    if (!prompt) {
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
        prompt,
        providerId: session.providerId,
        runId,
        sessionId,
        streamFn,
        systemPrompt: buildSystemPrompt(),
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

  public followUpRun(sessionId: SessionId, runId: RunId, promptInput: string): void {
    this.getRequiredSession(sessionId);
    const prompt = promptInput.trim();
    if (!prompt) {
      throw new SessionServiceError(SessionErrorCode.EMPTY_PROMPT, "消息内容不能为空");
    }
    if (!this.agents.followUp(sessionId, runId, prompt)) {
      throw new SessionServiceError(SessionErrorCode.RUN_NOT_FOUND, "活动 Run 不存在");
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
