import type { AgentMessage, StreamFn } from "@earendil-works/pi-agent-core";
import type { Api, Model } from "@earendil-works/pi-ai";
import { createAgent } from "./create-agent.js";
import type { RunId, SessionId } from "./harness-event.js";
import {
  type HarnessEventListener,
  RunCoordinator,
  type StartRunInput,
} from "./run-coordinator.js";

export interface RestoreAgentInput {
  initialSeq: number;
  messages: readonly AgentMessage[];
  model: Model<Api>;
  sessionId: SessionId;
  streamFn: StreamFn;
  systemPrompt: string;
}

export interface StartSessionRunInput extends RestoreAgentInput, StartRunInput {}

function createUserMessage(text: string): AgentMessage {
  return {
    content: [{ text, type: "text" }],
    role: "user",
    timestamp: Date.now(),
  };
}

export class AgentManager {
  private readonly runtimes = new Map<SessionId, RunCoordinator>();

  public constructor(private readonly onEvent: HarnessEventListener) {}

  public isProviderActive(providerId: string): boolean {
    return [...this.runtimes.values()].some((runtime) => runtime.activeProviderId === providerId);
  }

  public isSessionActive(sessionId: SessionId): boolean {
    const runtime = this.runtimes.get(sessionId);
    return runtime !== undefined && runtime.activeRunId !== null;
  }

  public async startRun(input: StartSessionRunInput): Promise<void> {
    const runtime = this.getOrCreate(input);
    await runtime.start(input);
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

  private getOrCreate(input: RestoreAgentInput): RunCoordinator {
    const current = this.runtimes.get(input.sessionId);
    if (current !== undefined) return current;

    const agent = createAgent(input);
    const runtime = new RunCoordinator(input.sessionId, agent, input.initialSeq, this.onEvent);
    this.runtimes.set(input.sessionId, runtime);
    return runtime;
  }
}
