import { randomUUID } from "node:crypto";
import { realpath, stat } from "node:fs/promises";
import {
  type AgentManager,
  buildSystemPrompt,
  type HarnessEvent,
  type RunId,
  type SessionId,
} from "@pi-harness/agent-runtime";
import type { SessionRecord, SessionRepository } from "../storage/database.js";
import type { SessionEventSnapshot, SessionEventStore } from "../storage/session-event-store.js";
import type { ProviderService } from "./provider-service.js";

const SessionErrorCode = {
  BUSY: "SESSION_BUSY",
  EMPTY_PROMPT: "EMPTY_RUN_PROMPT",
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
  workspaceRoot: string;
}

export interface RunAccepted {
  runId: RunId;
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

async function resolveWorkspaceRoot(input: string): Promise<string> {
  try {
    const root = await realpath(input);
    const metadata = await stat(root);
    if (!metadata.isDirectory()) throw new Error("Workspace is not a directory");
    return root;
  } catch {
    throw new SessionServiceError(
      SessionErrorCode.WORKSPACE_INVALID,
      "Workspace 不存在或不是可访问的目录",
    );
  }
}

export class SessionService {
  private readonly activeSessionIds = new Set<SessionId>();
  private readonly activeProviderBySession = new Map<SessionId, string>();
  private readonly backgroundTasks = new Set<Promise<void>>();

  public constructor(
    private readonly sessions: SessionRepository,
    private readonly eventStore: SessionEventStore,
    private readonly providers: ProviderService,
    private readonly agents: AgentManager,
    private readonly onBackgroundError: SessionBackgroundErrorHandler,
  ) {}

  public async create(input: CreateSessionInput): Promise<SessionRecord> {
    const workspaceRoot = await resolveWorkspaceRoot(input.workspaceRoot);
    await this.providers.resolveRunModel(input.providerId, input.modelId);
    const createdAt = Date.now();
    return this.sessions.create({
      createdAt,
      id: randomUUID(),
      modelId: input.modelId,
      providerId: input.providerId,
      title: normalizeTitle(input.title),
      workspaceRoot,
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
    this.assertSessionIdle(sessionId);
    this.getRequiredSession(sessionId);
    await this.providers.resolveRunModel(providerId, modelId);
    this.assertSessionIdle(sessionId);
    if (!this.sessions.updateModel(sessionId, providerId, modelId, Date.now())) {
      throw new SessionServiceError(SessionErrorCode.NOT_FOUND, "Session 不存在");
    }
    return this.getRequiredSession(sessionId);
  }

  public async startRun(sessionId: SessionId, promptInput: string): Promise<RunAccepted> {
    this.assertSessionIdle(sessionId);
    const prompt = promptInput.trim();
    if (!prompt) {
      throw new SessionServiceError(SessionErrorCode.EMPTY_PROMPT, "消息内容不能为空");
    }

    this.activeSessionIds.add(sessionId);
    try {
      const session = this.getRequiredSession(sessionId);
      this.activeProviderBySession.set(sessionId, session.providerId);
      const snapshot = await this.eventStore.load(sessionId);
      this.reconcileIndex(session, snapshot);
      const { model, streamFn } = await this.providers.resolveRunModel(
        session.providerId,
        session.modelId,
      );
      const runId = randomUUID();
      const task = this.agents.startRun({
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

  public async close(): Promise<void> {
    await this.agents.close();
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
