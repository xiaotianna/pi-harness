import type { AgentMessage, StreamFn } from "@earendil-works/pi-agent-core";
import type { Api, Model } from "@earendil-works/pi-ai";
import { createWorkspaceToolRegistry } from "@pi-harness/tools";
import { loadWorkspaceAgentContext } from "./context/workspace-agent-context.js";
import { createAgent } from "./create-agent.js";
import type { RunId, SessionId } from "./harness-event.js";
import { buildSystemPrompt } from "./prompts/system-prompt.js";
import {
  type HarnessEventListener,
  RunCoordinator,
  type StartRunInput,
} from "./run-coordinator.js";
import type { ToolApprovalRequester } from "./tool-approval.js";

export interface RestoreAgentInput {
  initialSeq: number;
  messages: readonly AgentMessage[];
  model: Model<Api>;
  sessionId: SessionId;
  streamFn: StreamFn;
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

  public followUp(sessionId: SessionId, runId: RunId, text: string): boolean {
    return this.runtimes.get(sessionId)?.followUp(runId, createUserMessage(text)) ?? false;
  }

  public async close(): Promise<void> {
    const runtimes = [...this.runtimes.values()];
    await Promise.all(runtimes.map((runtime) => runtime.close()));
    this.runtimes.clear();
  }

  private getOrCreate(input: RestoreAgentInput & { systemPrompt: string }): RunCoordinator {
    const current = this.runtimes.get(input.sessionId);
    if (current !== undefined) return current;

    const toolRegistry = createWorkspaceToolRegistry({
      globalRoot: this.globalRoot,
      protectedPaths: this.protectedPaths,
      workspaceRoot: input.workspaceRoot,
    });
    const agent = createAgent({ ...input, tools: toolRegistry.tools });
    const runtime = new RunCoordinator(
      input.sessionId,
      agent,
      toolRegistry,
      input.initialSeq,
      this.onEvent,
      input.workspaceRoot,
      this.protectedPaths,
      this.requestToolApproval,
    );
    this.runtimes.set(input.sessionId, runtime);
    return runtime;
  }
}
