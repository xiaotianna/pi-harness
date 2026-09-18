import type { Agent, AgentMessage, StreamFn } from "@earendil-works/pi-agent-core";
import {
  attachSuccessfulTodoEvidence,
  type PlanUpdatedData,
  type SessionHistorySearchResult,
  type TodoUpdatedData,
} from "@pi-harness/tools";
import { projectContext } from "./context/context-pipeline.js";
import {
  type ContextCheckpointRecord,
  type ContextCheckpointRestoredData,
  type ContextCompactedData,
  type ContextWorkingStateResetData,
  type HarnessEvent,
  type HarnessEventDraft,
  HarnessEventType,
  type RunId,
  type SessionId,
} from "./harness-event.js";
import { limitUserInputContext } from "./utils/user-input.js";

/** 新任务开始前，只要上个任务留下 Plan 或 Todos，就需要清空工作状态。 */
export function shouldResetWorkingStateForNewRun(
  plan: PlanUpdatedData | null,
  todos: TodoUpdatedData | null,
): boolean {
  return plan !== null || todos !== null;
}

interface ContextRun {
  approvedPlanMarkdown: string | null;
  runId: RunId;
  startMessageIndex: number;
  streamFn: StreamFn;
}

interface RunContextHooksOptions {
  agent: Agent;
  emit(draft: HarnessEventDraft, runId: RunId): Promise<HarnessEvent>;
  getActiveRun(): ContextRun | null;
  sessionId: SessionId;
  successfulToolCallIds: ReadonlySet<string>;
}

interface InitialContextState {
  contextCheckpoint: ContextCompactedData | null;
  contextCheckpointEventSeq: number | null;
  contextCheckpointTailStartMessageIndex: number | null;
  contextCheckpointHistory: readonly ContextCheckpointRecord[];
  plan: PlanUpdatedData | null;
  todos: TodoUpdatedData | null;
}

export class RunContextHooks {
  private pendingContextError: string | null = null;
  private pendingWorkingStateReset = false;
  private contextCheckpoint: ContextCompactedData | null;
  private contextCheckpointEventSeq: number | null;
  private contextCheckpointTailStartMessageIndex: number | null;
  private readonly contextCheckpointHistory: ContextCheckpointRecord[];
  private planState: PlanUpdatedData | null;
  private todoState: TodoUpdatedData | null;

  /** 接收恢复出的 checkpoint、Plan 和 Todos，作为这个 Session 的初始上下文状态。 */
  public constructor(
    private readonly options: RunContextHooksOptions,
    initial: InitialContextState,
  ) {
    this.contextCheckpoint = initial.contextCheckpoint;
    this.contextCheckpointEventSeq = initial.contextCheckpointEventSeq;
    this.contextCheckpointTailStartMessageIndex = initial.contextCheckpointTailStartMessageIndex;
    this.contextCheckpointHistory = [...initial.contextCheckpointHistory];
    this.planState = initial.plan;
    this.todoState = initial.todos;
  }

  /** 标记是否要在本次模型请求前清理上一个 Run 的 Plan/Todos。 */
  public beginRun(): void {
    this.pendingWorkingStateReset = shouldResetWorkingStateForNewRun(
      this.planState,
      this.todoState,
    );
  }

  /** 取走最近一次上下文处理错误；取走后清空，避免下一次重复报告。 */
  public takeContextError(): string | null {
    const error = this.pendingContextError;
    this.pendingContextError = null;
    return error;
  }

  /** Run 结束后丢弃只属于本次运行的错误和待清理标记。 */
  public finishRun(): void {
    this.pendingContextError = null;
    this.pendingWorkingStateReset = false;
  }

  /** 用持久化历史重建上下文状态，例如 Session 恢复后重新装入 checkpoint 和任务状态。 */
  public restoreHistory(input: InitialContextState): void {
    this.contextCheckpoint = input.contextCheckpoint;
    this.contextCheckpointEventSeq = input.contextCheckpointEventSeq;
    this.contextCheckpointTailStartMessageIndex = input.contextCheckpointTailStartMessageIndex;
    this.contextCheckpointHistory.splice(
      0,
      this.contextCheckpointHistory.length,
      ...input.contextCheckpointHistory,
    );
    this.planState = input.plan;
    this.todoState = input.todos;
    this.pendingWorkingStateReset = false;
  }

  /**
   * 每次模型请求前构造当前可用上下文：先处理跨 Run 状态，再裁剪或压缩消息。
   * 例如完整历史有 100 条，模型窗口只够装 20 条时，checkpoint 就像一张旧消息的摘要卡；
   * Agent 保存的 100 条原始消息仍在。压缩失败时记录错误，并退回基础附件/引用裁剪。
   */
  // 每次模型请求前，根据当前 Session 状态生成“这一次真正发送给模型的消息数组”
  // 返回的新消息数组：仅用于当前模型请求，不会直接删除 agent.state.messages 中的完整历史。
  public async transformContext(
    messages: AgentMessage[],
    signal?: AbortSignal,
  ): Promise<AgentMessage[]> {
    /**
     *  有 activeRun：当前正在执行任务，可以做完整上下文压缩、生成 checkpoint，并将事件关联到当前 runId。
        没有 activeRun：Session 空闲，没有可关联的任务，只做基础附件/引用裁剪，不执行压缩和 checkpoint 持久化。
     */
    const activeRun = this.options.getActiveRun();
    if (activeRun === null) {
      return limitUserInputContext(messages, this.options.agent.state.model.contextWindow);
    }

    try {
      /**
       * 清理上一任务的plan/todos
       * 表示新的run已经开始，但 Session 里还保留着上一个 Run 的 Plan 或 Todos。
       * 如果不清理，可能后续的任务会错误的继承到之前的plan/todos
       */
      if (this.pendingWorkingStateReset) {
        await this.clearWorkingState(
          "新的顶层 Run 是任务边界，Runtime 自动清理上一 Run 的 Plan/Todos",
          activeRun.runId,
        );
        this.pendingWorkingStateReset = false;
      }
      // 调用真正的 Context Pipeline（真正的 Token 计算、裁剪和压缩都在这里）
      const projected = await projectContext({
        /**
         * 当前 Run 开始时，Agent 已有消息的长度
         * 假设：
         *  0..99：之前 Session 的消息
            100：当前 Run 的用户请求
            101：Assistant
            102：Tool Result
           如果activeRun.startMessageIndex==100，那么压缩旧消息时，即使消息 100 落入被压缩区域，也会重新把它注入模型：
            [当前 Run 的原始任务契约]
            用户最初的请求
           目的是为了防止长任务压缩几轮后，模型忘记用户最初要求做什么
         */
        activeRunStartMessageIndex: activeRun.startMessageIndex,
        // 当前的checkpoint
        checkpoint: this.contextCheckpoint,
        /**
         * 这里的判断是因为checkpoint是可以回退的
         * 如果用户恢复到旧 checkpoint，就不能继续自动携带恢复前的后续分支。
         * 例如：
         *  checkpoint A
            → 消息 50
            → checkpoint B
            → 消息 80
            → 用户恢复 checkpoint A
            → 新消息 100
           恢复后主模型应该看到：
            checkpoint A
            + 新消息 100 之后的内容
           不应该自动看到被放弃的 50..99 分支。
         */
        ...(this.contextCheckpointTailStartMessageIndex === null
          ? {}
          : {
              checkpointTailStartMessageIndex: this.contextCheckpointTailStartMessageIndex,
            }),
        // 完整消息，Context Pipeline 根据 contextWindow 和 maxTokens 算出真正的输入预算
        messages,
        model: this.options.agent.state.model,
        // 压缩开始事件，projectContext() 只有确认确实需要压缩后，才调用它
        // 主要用于展示压缩状态的（web ui）
        onCompactionStarted: async () => {
          await this.options.emit(
            { data: null, type: HarnessEventType.CONTEXT_COMPACTION_STARTED },
            activeRun.runId,
          );
        },
        // Plan/Todos 作为摘要输入；普通请求继续从原有 Tool Result 读取其最新状态。
        // 这样 checkpoint 前缀在两次压缩之间保持稳定，不因更新时间变化而破坏缓存。
        plan: this.planState,
        planContract: activeRun.approvedPlanMarkdown,
        todos: this.todoState,
        sessionId: this.options.sessionId,
        // 取消信号，当用户中止 Run 时，不需要继续等待最长 120 秒的 checkpoint 生成请求。
        ...(signal === undefined ? {} : { signal }),
        streamFn: activeRun.streamFn,
        /**
         * systemPrompt和tools用于 Token 预算计算，如果只计算 messages，工具很多时会严重低估上下文占用。
         */
        systemPrompt: this.options.agent.state.systemPrompt,
        tools: this.options.agent.state.tools,
      });
      if (projected.compacted !== undefined) {
        const event = await this.options.emit(
          {
            data: projected.compacted,
            type: HarnessEventType.CONTEXT_COMPACTED,
          },
          activeRun.runId,
        );
        this.contextCheckpoint = projected.compacted;
        this.contextCheckpointEventSeq = event.seq;
        this.contextCheckpointTailStartMessageIndex = null;
        this.contextCheckpointHistory.push({
          data: projected.compacted,
          eventSeq: event.seq,
        });
      }
      this.pendingContextError = projected.error ?? null;
      return projected.messages;
    } catch {
      this.pendingContextError = "上下文 checkpoint 无法安全生成或持久化";
      return limitUserInputContext(messages, this.options.agent.state.model.contextWindow);
    }
  }

  /** 先记录 Plan 更新事件，再更新内存状态，让后续模型请求读到相同的 Plan。 */
  public async updatePlan(data: PlanUpdatedData): Promise<void> {
    const activeRun = this.options.getActiveRun();
    if (activeRun === null) throw new Error("当前没有活动 Run");
    await this.options.emit({ data, type: HarnessEventType.PLAN_UPDATED }, activeRun.runId);
    this.planState = data;
  }

  /** 给 Todos 附上已成功工具调用的证据，记录事件后再保存为当前状态。 */
  public async updateTodos(data: TodoUpdatedData): Promise<TodoUpdatedData> {
    const activeRun = this.options.getActiveRun();
    if (activeRun === null) throw new Error("当前没有活动 Run");
    const updated = attachSuccessfulTodoEvidence(data, [...this.options.successfulToolCallIds]);
    await this.options.emit(
      { data: updated, type: HarnessEventType.TODO_UPDATED },
      activeRun.runId,
    );
    this.todoState = updated;
    return updated;
  }

  /**
   * 沿 checkpoint 的父链向前回退指定步数，并记录一次恢复事件。
   * 例如 A → B → C，从 C 回退 2 步会选中 A；之后的模型上下文从 A 加上恢复后的新消息继续，
   * 不再自动带入 B、C 分支上的旧消息。返回目标 checkpoint 的事件序号。
   */
  public async restoreContextCheckpoint(steps: number): Promise<number> {
    const activeRun = this.options.getActiveRun();
    if (activeRun === null) throw new Error("当前没有活动 Run");
    let target =
      this.contextCheckpointHistory.find(
        (record) => record.eventSeq === this.contextCheckpointEventSeq,
      ) ?? null;
    for (let remaining = steps; remaining > 0; remaining -= 1) {
      const parentId = target?.data.previousCompactionId;
      const parent =
        parentId === undefined
          ? this.contextCheckpointHistory
              .filter((record) => record.eventSeq < (target?.eventSeq ?? Number.POSITIVE_INFINITY))
              .at(-1)
          : this.contextCheckpointHistory.find((record) => record.data.compactionId === parentId);
      target = parent ?? null;
      if (target === null) break;
    }
    if (target === null) throw new Error("没有可恢复的更早 checkpoint");
    await this.options.emit(
      {
        data: {
          sourceEventSeq: target.eventSeq,
        } satisfies ContextCheckpointRestoredData,
        type: HarnessEventType.CONTEXT_CHECKPOINT_RESTORED,
      },
      activeRun.runId,
    );
    this.contextCheckpoint = target.data;
    this.contextCheckpointEventSeq = target.eventSeq;
    this.contextCheckpointTailStartMessageIndex = this.options.agent.state.messages.length;
    return target.eventSeq;
  }

  /** 在活动 Run 中按给定原因清空 Plan/Todos，并让这次清理留下事件记录。 */
  public async resetWorkingState(reason: string): Promise<void> {
    const activeRun = this.options.getActiveRun();
    if (activeRun === null) throw new Error("当前没有活动 Run");
    await this.clearWorkingState(reason, activeRun.runId);
  }

  /** 先写清理事件，再清空内存中的 Plan/Todos，保证恢复历史时能重放同一状态。 */
  private async clearWorkingState(reason: string, runId: RunId): Promise<void> {
    await this.options.emit(
      {
        data: { reason } satisfies ContextWorkingStateResetData,
        type: HarnessEventType.CONTEXT_WORKING_STATE_RESET,
      },
      runId,
    );
    this.planState = null;
    this.todoState = null;
    this.pendingWorkingStateReset = false;
  }

  /** Session 空闲时应用已记录的恢复事件；找不到目标或 Run 正在进行就返回 false。 */
  public applyContextCheckpointRestore(eventSeq: number): boolean {
    if (this.options.getActiveRun() !== null) return false;
    const target = this.contextCheckpointHistory.find((record) => record.eventSeq === eventSeq);
    if (target === undefined) return false;
    this.contextCheckpoint = target.data;
    this.contextCheckpointEventSeq = target.eventSeq;
    this.contextCheckpointTailStartMessageIndex = this.options.agent.state.messages.length;
    return true;
  }

  /** 从最新消息往前搜索完整 Session 历史，返回有限数量的命中片段供模型定位旧内容。 */
  public searchSessionHistory(input: {
    maxResults?: number;
    query: string;
  }): SessionHistorySearchResult {
    const query = input.query.trim().toLocaleLowerCase();
    if (!query) throw new Error("历史检索关键词不能为空");
    const matches: SessionHistorySearchResult["matches"] = [];
    const messages = this.options.agent.state.messages;
    // ponytail: 先线性扫描完整 Session；历史达到万级消息并出现延迟后再加可重建索引。
    for (let messageIndex = messages.length - 1; messageIndex >= 0; messageIndex -= 1) {
      const message = messages[messageIndex];
      if (
        message === undefined ||
        (message.role !== "user" && message.role !== "assistant" && message.role !== "toolResult")
      ) {
        continue;
      }
      const text = JSON.stringify(message.content);
      const matchIndex = text.toLocaleLowerCase().indexOf(query);
      if (matchIndex < 0) continue;
      const excerptStart = Math.max(0, matchIndex - 240);
      matches.push({
        excerpt: text.slice(excerptStart, excerptStart + 800),
        messageIndex,
        role: message.role,
      });
      if (matches.length >= (input.maxResults ?? 8)) break;
    }
    return { matches, query: input.query.trim() };
  }
}
