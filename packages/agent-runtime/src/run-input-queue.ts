import { randomUUID } from "node:crypto";
import type { Agent } from "@earendil-works/pi-agent-core";
import type { SkillRegistry } from "@pi-harness/tools";
import type { RunId } from "./harness-event.js";
import {
  BusySubmitBehavior,
  type HarnessUserMessage,
  type QueuedRunInput,
  type RunUserInput,
} from "./user-input.js";
import { createHarnessUserMessage } from "./utils/user-input.js";

interface ActiveQueueRun {
  preparationAbortController: AbortController;
  runId: RunId;
}

interface RunInputQueueOptions {
  abortJoin(): void;
  agent: Agent;
  getActiveRun(): ActiveQueueRun | null;
  protectedPaths: readonly string[];
  skillRegistry?: SkillRegistry;
  workspaceRoot: string;
}

interface PendingFollowUp {
  input: RunUserInput;
  message: HarnessUserMessage;
  queued: QueuedRunInput;
}

export class RunInputQueue {
  private readonly pendingFollowUps = new Map<string, PendingFollowUp>();
  private isContinuingSteer = false;
  private readonly pendingSteerInterrupts: HarnessUserMessage[] = [];
  private queueMutationTail: Promise<void> = Promise.resolve();

  /** 保存 Agent 和工作区配置，供后续消息入队及中断使用。 */
  public constructor(private readonly options: RunInputQueueOptions) {}

  /** Agent 是否正在接着处理一次转向消息。 */
  public get isContinuing(): boolean {
    return this.isContinuingSteer;
  }

  /** 是否还有等待交给 Agent 的转向消息。 */
  public get hasPendingSteers(): boolean {
    return this.pendingSteerInterrupts.length > 0;
  }

  /** 队列消息一旦开始执行，就从“尚可编辑的后续消息”中移除。 */
  public onMessageStarted(queuedInputId: string): void {
    this.pendingFollowUps.delete(queuedInputId);
  }

  /** 中止当前 Run 时清掉转向消息，避免中止后又被继续执行。 */
  public abort(): void {
    this.pendingSteerInterrupts.length = 0;
    this.options.agent.clearSteeringQueue();
  }

  /** Run 收尾时清空所有队列和本次转向标记，不让消息流入下一个 Run。 */
  public finishRun(): void {
    this.pendingFollowUps.clear();
    this.options.agent.clearAllQueues();
    this.isContinuingSteer = false;
    this.pendingSteerInterrupts.length = 0;
  }

  /**
   * 把中断当前回答的转向消息交给 Agent，再让它继续运行。
   * 如果继续期间又收到转向消息，就在下一轮处理，直到待处理列表为空。
   */
  public async continuePendingSteers(): Promise<void> {
    while (this.pendingSteerInterrupts.length > 0) {
      for (const steerMessage of this.pendingSteerInterrupts.splice(0)) {
        this.options.agent.steer(steerMessage);
      }
      this.isContinuingSteer = true;
      try {
        await this.options.agent.continue();
      } finally {
        this.isContinuingSteer = false;
      }
    }
  }

  /**
   * 转向当前 Run：先准备用户消息，再中断 Agent，随后由 continuePendingSteers 接力。
   * 例如 Agent 正在写方案时用户说“先别写，改查日志”，新指令要尽快接管当前回答。
   * 消息准备可能较慢，因此入队前再次确认 runId，避免旧 Run 的指令落入新 Run。
   */
  public async steer(runId: RunId, input: RunUserInput): Promise<boolean> {
    return this.runQueueMutation(async () => {
      const activeRun = this.options.getActiveRun();
      if (activeRun?.runId !== runId) return false;
      const message = await createHarnessUserMessage({
        input,
        skillRegistry: this.options.skillRegistry,
        model: this.options.agent.state.model,
        protectedPaths: this.options.protectedPaths,
        signal: activeRun.preparationAbortController.signal,
        workspaceRoot: this.options.workspaceRoot,
      });
      if (this.options.getActiveRun()?.runId !== runId) return false;
      this.pendingSteerInterrupts.push({
        ...message,
        busySubmitBehavior: BusySubmitBehavior.STEER,
      });
      this.options.agent.abort();
      this.options.abortJoin();
      return true;
    });
  }

  /** 只向当前 Run 展示仍在等待执行、因此还能编辑或删除的后续消息。 */
  public listQueuedFollowUps(runId: RunId): readonly QueuedRunInput[] {
    return this.options.getActiveRun()?.runId === runId
      ? [...this.pendingFollowUps.values()].map((item) => item.queued)
      : [];
  }

  /**
   * 为当前 Run 准备带附件的消息，分配稳定 ID，并交给 Agent 稍后处理。
   * 例如当前问题还在回答时再发一个问题，它会排队而不是打断眼前这次回答；
   * 稳定 ID 让前端在执行前仍能修改或删除这条消息。
   */
  // 将当前活动 run 的消息追加到 Agent 的 follow-up 队列。
  public async followUp(runId: RunId, input: RunUserInput): Promise<QueuedRunInput | null> {
    return this.runQueueMutation(async () => {
      const activeRun = this.options.getActiveRun();
      if (activeRun?.runId !== runId) return null;
      const message = await createHarnessUserMessage({
        input,
        skillRegistry: this.options.skillRegistry,
        model: this.options.agent.state.model,
        protectedPaths: this.options.protectedPaths,
        signal: activeRun.preparationAbortController.signal,
        workspaceRoot: this.options.workspaceRoot,
      });
      if (this.options.getActiveRun()?.runId !== runId) return null;
      const id = randomUUID();
      const queued = {
        attachments: message.attachments ?? [],
        createdAt: message.timestamp,
        id,
        prompt: input.prompt,
        references: input.references,
      } satisfies QueuedRunInput;
      const queuedMessage = {
        ...message,
        busySubmitBehavior: BusySubmitBehavior.QUEUE,
        queuedInputId: id,
      };
      this.pendingFollowUps.set(id, { input, message: queuedMessage, queued });
      this.options.agent.followUp(queuedMessage);
      return queued;
    });
  }

  /**
   * 重新准备一条排队消息，并用原 ID 替换 Agent 队列中的版本。
   * 准备期间消息可能已开始执行或 Run 已结束，所以提交前要再确认它仍在队列里。
   */
  public async updateFollowUp(
    runId: RunId,
    queuedInputId: string,
    prompt: string,
  ): Promise<QueuedRunInput | null> {
    return this.runQueueMutation(async () => {
      const activeRun = this.options.getActiveRun();
      const current = this.pendingFollowUps.get(queuedInputId);
      if (activeRun?.runId !== runId || current === undefined) return null;
      const input = { ...current.input, prompt };
      const message = await createHarnessUserMessage({
        input,
        skillRegistry: this.options.skillRegistry,
        model: this.options.agent.state.model,
        protectedPaths: this.options.protectedPaths,
        signal: activeRun.preparationAbortController.signal,
        workspaceRoot: this.options.workspaceRoot,
      });
      if (
        this.options.getActiveRun()?.runId !== runId ||
        !this.pendingFollowUps.has(queuedInputId)
      ) {
        return null;
      }
      const queued = {
        ...current.queued,
        prompt,
      } satisfies QueuedRunInput;
      this.pendingFollowUps.set(queuedInputId, {
        input,
        message: {
          ...message,
          busySubmitBehavior: BusySubmitBehavior.QUEUE,
          queuedInputId,
        },
        queued,
      });
      this.syncFollowUpQueue();
      return queued;
    });
  }

  /** 删除尚未开始的后续消息，并同步 Agent 内部队列；已开始的消息不能再撤回。 */
  public async removeFollowUp(runId: RunId, queuedInputId: string): Promise<boolean> {
    return this.runQueueMutation(async () => {
      if (
        this.options.getActiveRun()?.runId !== runId ||
        !this.pendingFollowUps.delete(queuedInputId)
      ) {
        return false;
      }
      this.syncFollowUpQueue();
      return true;
    });
  }

  /** 将排队消息改为立即转向：先从 follow-up 队列移走，再中断当前回答。 */
  public async steerFollowUp(runId: RunId, queuedInputId: string): Promise<boolean> {
    const current = this.pendingFollowUps.get(queuedInputId);
    if (this.options.getActiveRun()?.runId !== runId || current === undefined) return false;
    this.pendingFollowUps.delete(queuedInputId);
    this.syncFollowUpQueue();
    this.pendingSteerInterrupts.push({
      ...current.message,
      busySubmitBehavior: BusySubmitBehavior.STEER,
    });
    this.options.agent.abort();
    return true;
  }

  /** 按本地 Map 的顺序重建 Agent 队列，让编辑、删除后的内容与展示一致。 */
  private syncFollowUpQueue(): void {
    this.options.agent.clearFollowUpQueue();
    for (const item of this.pendingFollowUps.values()) this.options.agent.followUp(item.message);
  }

  /**
   * 串行执行入队、编辑和删除，避免两个异步操作互相覆盖队列。
   * 前一个操作即使失败，也会把队列尾恢复为可继续等待的 Promise，不堵住后续操作。
   */
  private runQueueMutation<T>(mutation: () => Promise<T>): Promise<T> {
    const result = this.queueMutationTail.then(mutation, mutation);
    this.queueMutationTail = result.then(
      () => undefined,
      () => undefined,
    );
    return result;
  }
}
