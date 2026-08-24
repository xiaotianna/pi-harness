import { randomUUID } from "node:crypto";
import type { Agent, AgentEvent, AgentMessage, StreamFn } from "@earendil-works/pi-agent-core";
import { type Api, clampThinkingLevel, type Model } from "@earendil-works/pi-ai";
import { createAutoFollowUpHandler } from "./auto-follow-up.js";
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
  handleAutoFollowUp: ReturnType<typeof createAutoFollowUpHandler>;
  modelId: string;
  providerId: string;
  runId: RunId;
}

// 一个 Session 对应一个 RunCoordinator，它管理 run 的生命周期、事件转换与发布
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
    // 构造时会订阅 pi Agent 事件
    this.unsubscribe = agent.subscribe((event) => this.handleAgentEvent(event));
  }

  /**
   * 是 RunCoordinator 接收单个 Pi Agent 事件的统一入口，按顺序完成：
   *  1. 获取当前活动 run。
      2. 将 Pi 原始事件转换为 HarnessEvent。
      3. 补充 id、seq、sessionId、runId 等运行上下文。
      4. 通过 onEvent 发布事件。
      5. 交给当前 run 的自动续轮 handler 处理。
   */
  private async handleAgentEvent(event: AgentEvent): Promise<void> {
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
    activeRun.handleAutoFollowUp(event);
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
    // ponytail: 暂用模型支持的中档推理；开放用户配置时改由 run input 传入。
    this.agent.state.thinkingLevel = clampThinkingLevel(input.model, "medium");
    this.agent.state.systemPrompt = input.systemPrompt;
    this.agent.streamFunction = input.streamFn;
    this.activeRun = {
      handleAutoFollowUp: createAutoFollowUpHandler((message) => this.agent.followUp(message)),
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

  // 将当前活动 run 的消息追加到 Agent 的 follow-up 队列
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
