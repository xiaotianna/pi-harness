import type { AgentMessage, StreamFn } from "@earendil-works/pi-agent-core";
import type { Api, Model } from "@earendil-works/pi-ai";
import {
  createWorkspaceToolRegistry,
  type PlanUpdatedData,
  type TodoUpdatedData,
} from "@pi-harness/tools";
import { loadWorkspaceAgentContext } from "./context/workspace-agent-context.js";
import { createAgent } from "./create-agent.js";
import type {
  ContextCheckpointRecord,
  ContextCompactedData,
  RunId,
  SessionId,
} from "./harness-event.js";
import { buildSystemPrompt } from "./prompts/system-prompt.js";
import {
  type HarnessEventListener,
  RunCoordinator,
  type StartRunInput,
} from "./run-coordinator.js";
import type { ToolApprovalRequester } from "./tool-approval.js";
import type { RunUserInput } from "./user-input.js";

export interface RestoreAgentInput {
  contextCheckpoint: ContextCompactedData | null;
  contextCheckpointEventSeq: number | null;
  contextCheckpointHistory: readonly ContextCheckpointRecord[];
  contextCheckpointTailStartMessageIndex: number | null;
  initialSeq: number;
  messages: readonly AgentMessage[];
  model: Model<Api>;
  plan: PlanUpdatedData | null;
  sessionId: SessionId;
  streamFn: StreamFn;
  todos: TodoUpdatedData | null;
  workspaceRoot: string;
}

export type StartSessionRunInput = RestoreAgentInput & Omit<StartRunInput, "systemPrompt">;

function createUserMessage(text: string): AgentMessage {
  return {
    content: [{ text, type: "text" }],
    role: "user",
    timestamp: Date.now(),
  };
}

// Session 注册表
// 核心：Map<SessionId, RunCoordinator>
export class AgentManager {
  private readonly runtimes = new Map<SessionId, RunCoordinator>();

  public constructor(
    private readonly onEvent: HarnessEventListener,
    private readonly requestToolApproval: ToolApprovalRequester,
    private readonly protectedPaths: readonly string[] = [],
    private readonly globalRoot: string,
    private readonly webSearchUrl: string,
    private readonly isSkillEnabled: (directory: string) => boolean = () => true,
  ) {}

  public isProviderActive(providerId: string): boolean {
    return [...this.runtimes.values()].some((runtime) => runtime.activeProviderId === providerId);
  }

  public isSessionActive(sessionId: SessionId): boolean {
    const runtime = this.runtimes.get(sessionId);
    return runtime !== undefined && runtime.activeRunId !== null;
  }

  public async startRun(input: StartSessionRunInput): Promise<void> {
    const workspaceContext = await loadWorkspaceAgentContext({
      globalRoot: this.globalRoot,
      isSkillEnabled: this.isSkillEnabled,
      workspaceRoot: input.workspaceRoot,
    });
    const preparedInput = {
      ...input,
      systemPrompt: buildSystemPrompt(workspaceContext),
    };
    const runtime = this.getOrCreate(preparedInput);
    await runtime.start(preparedInput);
  }

  public abort(sessionId: SessionId, runId: RunId): boolean {
    return this.runtimes.get(sessionId)?.abort(runId) ?? false;
  }

  public steer(sessionId: SessionId, runId: RunId, text: string): boolean {
    return this.runtimes.get(sessionId)?.steer(runId, createUserMessage(text)) ?? false;
  }

  public async followUp(sessionId: SessionId, runId: RunId, input: RunUserInput): Promise<boolean> {
    return (await this.runtimes.get(sessionId)?.followUp(runId, input)) ?? false;
  }

  public async close(): Promise<void> {
    const runtimes = [...this.runtimes.values()];
    await Promise.all(runtimes.map((runtime) => runtime.close()));
    this.runtimes.clear();
  }

  public applyContextCheckpointRestore(sessionId: SessionId, eventSeq: number): boolean {
    const runtime = this.runtimes.get(sessionId);
    return runtime === undefined || runtime.applyContextCheckpointRestore(eventSeq);
  }

  private getOrCreate(input: RestoreAgentInput & { systemPrompt: string }): RunCoordinator {
    const current = this.runtimes.get(input.sessionId);
    if (current !== undefined) return current;

    const toolCapabilities = {
      supportsImageInput: input.model.input.includes("image"),
    };
    let runtime: RunCoordinator | null = null;
    const toolRegistry = createWorkspaceToolRegistry({
      globalRoot: this.globalRoot,
      isSkillEnabled: this.isSkillEnabled,
      onPlanUpdated: (data) => {
        if (runtime === null) throw new Error("Session Runtime 尚未就绪");
        return runtime.updatePlan(data);
      },
      onContextCheckpointRestored: (steps) => {
        if (runtime === null) throw new Error("Session Runtime 尚未就绪");
        return runtime.restoreContextCheckpoint(steps);
      },
      onSessionHistorySearched: (searchInput) => {
        if (runtime === null) throw new Error("Session Runtime 尚未就绪");
        return runtime.searchSessionHistory(searchInput);
      },
      onTodosUpdated: (data) => {
        if (runtime === null) throw new Error("Session Runtime 尚未就绪");
        return runtime.updateTodos(data);
      },
      onWorkingStateReset: (reason) => {
        if (runtime === null) throw new Error("Session Runtime 尚未就绪");
        return runtime.resetWorkingState(reason);
      },
      protectedPaths: this.protectedPaths,
      webSearchUrl: this.webSearchUrl,
      supportsImageInput: () => toolCapabilities.supportsImageInput,
      workspaceRoot: input.workspaceRoot,
    });
    const agent = createAgent({ ...input, tools: toolRegistry.tools });
    runtime = new RunCoordinator(
      input.sessionId,
      agent,
      toolRegistry,
      input.initialSeq,
      this.onEvent,
      input.workspaceRoot,
      this.protectedPaths,
      this.requestToolApproval,
      (supportsImageInput) => {
        toolCapabilities.supportsImageInput = supportsImageInput;
      },
      input.contextCheckpoint,
      input.contextCheckpointEventSeq,
      input.contextCheckpointTailStartMessageIndex,
      [...input.contextCheckpointHistory],
      input.plan,
      input.todos,
    );
    this.runtimes.set(input.sessionId, runtime);
    return runtime;
  }
}
