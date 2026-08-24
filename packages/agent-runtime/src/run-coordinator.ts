import { randomUUID } from "node:crypto";
import type { Agent, AgentMessage, StreamFn } from "@earendil-works/pi-agent-core";
import type { Api, Model } from "@earendil-works/pi-ai";
import { adaptAgentEvent } from "./event-adapter.js";
import type { HarnessEvent, RunId, SessionId } from "./harness-event.js";

export interface StartRunInput {
  model: Model<Api>;
  modelId: string;
  prompt: string;
  providerId: string;
  runId: RunId;
  streamFn: StreamFn;
  systemPrompt: string;
}

export type HarnessEventListener = (event: HarnessEvent) => Promise<void> | void;

interface ActiveRun {
  modelId: string;
  providerId: string;
  runId: RunId;
}

export class RunCoordinator {
  private activeRun: ActiveRun | null = null;
  private nextSeq: number;
  private readonly unsubscribe: () => void;

  public constructor(
    private readonly sessionId: SessionId,
    private readonly agent: Agent,
    initialSeq: number,
    private readonly onEvent: HarnessEventListener,
  ) {
    this.nextSeq = initialSeq + 1;
    this.unsubscribe = agent.subscribe(async (event) => {
      const activeRun = this.activeRun;
      if (activeRun === null) return;
      const draft = adaptAgentEvent(event, activeRun);
      if (draft === null) return;

      const harnessEvent: HarnessEvent = {
        data: draft.data,
        id: randomUUID(),
        runId: activeRun.runId,
        seq: this.nextSeq,
        sessionId: this.sessionId,
        timestamp: Date.now(),
        type: draft.type,
      };
      this.nextSeq += 1;
      await this.onEvent(harnessEvent);
    });
  }

  public get activeProviderId(): string | null {
    return this.activeRun?.providerId ?? null;
  }

  public get activeRunId(): RunId | null {
    return this.activeRun?.runId ?? null;
  }

  public async start(input: StartRunInput): Promise<void> {
    if (this.activeRun !== null || this.agent.state.isStreaming) {
      throw new Error(`Session ${this.sessionId} already has an active run`);
    }

    this.agent.state.model = input.model;
    this.agent.state.systemPrompt = input.systemPrompt;
    this.agent.streamFunction = input.streamFn;
    this.activeRun = {
      modelId: input.modelId,
      providerId: input.providerId,
      runId: input.runId,
    };

    try {
      await this.agent.prompt(input.prompt);
    } finally {
      this.activeRun = null;
    }
  }

  public abort(runId: RunId): boolean {
    if (this.activeRun?.runId !== runId) return false;
    this.agent.abort();
    return true;
  }

  public steer(runId: RunId, message: AgentMessage): boolean {
    if (this.activeRun?.runId !== runId) return false;
    this.agent.steer(message);
    return true;
  }

  public followUp(runId: RunId, message: AgentMessage): boolean {
    if (this.activeRun?.runId !== runId) return false;
    this.agent.followUp(message);
    return true;
  }

  public async close(): Promise<void> {
    this.agent.abort();
    await this.agent.waitForIdle();
    this.unsubscribe();
  }
}
