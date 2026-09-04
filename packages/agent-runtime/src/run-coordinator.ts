import { randomUUID } from "node:crypto";
import type {
  AfterToolCallContext,
  Agent,
  AgentEvent,
  AgentMessage,
  BeforeToolCallContext,
  BeforeToolCallResult,
  StreamFn,
} from "@earendil-works/pi-agent-core";
import {
  type Api,
  type AssistantMessage,
  clampThinkingLevel,
  createAssistantMessageEventStream,
  type Model,
} from "@earendil-works/pi-ai";
import { type ApprovalPolicyValue, evaluateToolCall, ToolPolicyDecision } from "@pi-harness/policy";
import {
  attachSuccessfulTodoEvidence,
  type PlanUpdatedData,
  readFileChangeDetails,
  type SessionHistorySearchResult,
  type TodoUpdatedData,
  type ToolRegistry,
} from "@pi-harness/tools";
import { createAutoFollowUpHandler } from "./auto-follow-up.js";
import { CONTEXT_WINDOW_EXCEEDED_ERROR_CODE, projectContext } from "./context/context-pipeline.js";
import { type AgentEventAdapterContext, adaptAgentEvent } from "./event-adapter.js";
import {
  ApprovalDecision,
  type ApprovalRequestedData,
  type ApprovalResolvedData,
  type ContextCheckpointRecord,
  type ContextCheckpointRestoredData,
  type ContextCompactedData,
  type ContextUsageSnapshotData,
  type ContextWorkingStateResetData,
  type FileChangedData,
  type HarnessEvent,
  type HarnessEventDraft,
  HarnessEventType,
  type RunContextData,
  type RunId,
  type RunInteractionData,
  type RunStartedData,
  type SessionId,
} from "./harness-event.js";
import {
  applyModelResponsePreferences,
  type OutputDetail,
  type ReasoningSummary,
} from "./model-response-preferences.js";
import { type ThinkingLevel, ThinkingLevel as ThinkingLevels } from "./thinking-level.js";
import type { ToolApprovalRequester } from "./tool-approval.js";
import {
  BusySubmitBehavior,
  type HarnessUserMessage,
  isHarnessUserMessage,
  type QueuedRunInput,
  type RunUserInput,
  UserInputContextError,
} from "./user-input.js";
import { estimateContextUsage } from "./utils/context-usage.js";
import {
  createHarnessUserMessage,
  createHarnessUserMessageRecord,
  limitUserInputContext,
} from "./utils/user-input.js";

export interface StartRunInput {
  approvalPolicy: ApprovalPolicyValue;
  contexts: readonly RunContextData[];
  model: Model<Api>;
  modelId: string;
  userInput: RunUserInput;
  providerId: string;
  outputDetail: OutputDetail;
  reasoningSummary: ReasoningSummary;
  runId: RunId;
  streamFn: StreamFn;
  systemPrompt: string;
  thinkingLevel: ThinkingLevel;
  userMessage?: HarnessUserMessage;
}

export interface RestoreRunHistoryInput {
  contextCheckpoint: ContextCompactedData | null;
  contextCheckpointEventSeq: number | null;
  contextCheckpointHistory: readonly ContextCheckpointRecord[];
  contextCheckpointTailStartMessageIndex: number | null;
  initialSeq: number;
  messages: readonly AgentMessage[];
  plan: PlanUpdatedData | null;
  todos: TodoUpdatedData | null;
}

export type HarnessEventListener = (event: HarnessEvent) => Promise<void> | void;

interface ActiveRun extends AgentEventAdapterContext {
  approvalPolicy: ApprovalPolicyValue;
  handleAutoFollowUp: ReturnType<typeof createAutoFollowUpHandler>;
  preparationAbortController: AbortController;
  runId: RunId;
  startMessageIndex: number;
  streamFn: StreamFn;
}

interface PendingFollowUp {
  input: RunUserInput;
  message: HarnessUserMessage;
  queued: QueuedRunInput;
}

export function shouldResetWorkingStateForNewRun(
  plan: PlanUpdatedData | null,
  todos: TodoUpdatedData | null,
): boolean {
  return plan !== null || todos !== null;
}

function createContextWindowErrorStream(model: Model<Api>, message: string) {
  const stream = createAssistantMessageEventStream();
  const error: AssistantMessage = {
    api: model.api,
    content: [],
    errorMessage: `${CONTEXT_WINDOW_EXCEEDED_ERROR_CODE}: ${message}`,
    model: model.id,
    provider: model.provider,
    role: "assistant",
    stopReason: "error",
    timestamp: Date.now(),
    usage: {
      cacheRead: 0,
      cacheWrite: 0,
      cost: { cacheRead: 0, cacheWrite: 0, input: 0, output: 0, total: 0 },
      input: 0,
      output: 0,
      totalTokens: 0,
    },
  };
  queueMicrotask(() => {
    stream.push({ error, reason: "error", type: "error" });
    stream.end(error);
  });
  return stream;
}

// 一个 Session 对应一个 RunCoordinator，它管理 run 的生命周期、事件转换与发布
export class RunCoordinator {
  private activeRun: ActiveRun | null = null;
  private readonly executionGuard: ToolRegistry["executionGuard"];
  private nextSeq: number;
  private pendingContextError: string | null = null;
  private readonly pendingFileChanges = new Map<string, readonly FileChangedData[]>();
  private readonly pendingFollowUps = new Map<string, PendingFollowUp>();
  private isContinuingSteer = false;
  private readonly pendingSteerInterrupts: HarnessUserMessage[] = [];
  private queueMutationTail: Promise<void> = Promise.resolve();
  private pendingWorkingStateReset = false;
  private readonly successfulToolCallIds = new Set<string>();
  private readonly unsubscribe: () => void;

  public constructor(
    private readonly sessionId: SessionId,
    private readonly agent: Agent,
    private readonly toolRegistry: ToolRegistry,
    initialSeq: number,
    private readonly onEvent: HarnessEventListener,
    private readonly workspaceRoot: string,
    private readonly protectedPaths: readonly string[],
    private readonly requestToolApproval: ToolApprovalRequester,
    private readonly setSupportsImageInput: (supportsImageInput: boolean) => void,
    private contextCheckpoint: ContextCompactedData | null,
    private contextCheckpointEventSeq: number | null,
    private contextCheckpointTailStartMessageIndex: number | null,
    private readonly contextCheckpointHistory: ContextCheckpointRecord[],
    private planState: PlanUpdatedData | null,
    private todoState: TodoUpdatedData | null,
  ) {
    this.executionGuard = toolRegistry.executionGuard;
    for (const message of agent.state.messages) {
      if (message.role === "toolResult" && !message.isError) {
        this.successfulToolCallIds.add(message.toolCallId);
      }
    }
    this.nextSeq = initialSeq + 1;
    this.agent.beforeToolCall = (context, signal) => this.handleBeforeToolCall(context, signal);
    this.agent.afterToolCall = (context) => this.handleAfterToolCall(context);
    this.agent.transformContext = (messages, signal) => this.transformContext(messages, signal);
    // 构造时会订阅 pi Agent 事件
    this.unsubscribe = agent.subscribe((event) => this.handleAgentEvent(event));
  }

  private async emit(draft: HarnessEventDraft, runId: RunId): Promise<HarnessEvent> {
    const event: HarnessEvent = {
      data: draft.data,
      id: randomUUID(),
      runId,
      seq: this.nextSeq,
      sessionId: this.sessionId,
      timestamp: Date.now(),
      type: draft.type,
    };
    this.nextSeq += 1;
    await this.onEvent(event);
    return event;
  }

  // 每次模型请求前，根据当前 Session 状态生成“这一次真正发送给模型的消息数组”
  // 返回的新消息数组：仅用于当前模型请求，不会直接删除 agent.state.messages 中的完整历史。
  private async transformContext(
    messages: AgentMessage[],
    signal?: AbortSignal,
  ): Promise<AgentMessage[]> {
    /**
     *  有 activeRun：当前正在执行任务，可以做完整上下文压缩、生成 checkpoint，并将事件关联到当前 runId。
        没有 activeRun：Session 空闲，没有可关联的任务，只做基础附件/引用裁剪，不执行压缩和 checkpoint 持久化。
     */
    const activeRun = this.activeRun;
    if (activeRun === null) {
      return limitUserInputContext(messages, this.agent.state.model.contextWindow);
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
        model: this.agent.state.model,
        // 压缩开始事件，projectContext() 只有确认确实需要压缩后，才调用它
        // 主要用于展示压缩状态的（web ui）
        onCompactionStarted: async () => {
          await this.emit(
            { data: null, type: HarnessEventType.CONTEXT_COMPACTION_STARTED },
            activeRun.runId,
          );
        },
        // Plan/Todos 作为摘要输入；普通请求继续从原有 Tool Result 读取其最新状态。
        // 这样 checkpoint 前缀在两次压缩之间保持稳定，不因更新时间变化而破坏缓存。
        plan: this.planState,
        todos: this.todoState,
        sessionId: this.sessionId,
        // 取消信号，当用户中止 Run 时，不需要继续等待最长 120 秒的 checkpoint 生成请求。
        ...(signal === undefined ? {} : { signal }),
        streamFn: activeRun.streamFn,
        /**
         * systemPrompt和tools用于 Token 预算计算，如果只计算 messages，工具很多时会严重低估上下文占用。
         */
        systemPrompt: this.agent.state.systemPrompt,
        tools: this.agent.state.tools,
      });
      if (projected.compacted !== undefined) {
        const event = await this.emit(
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
      return limitUserInputContext(messages, this.agent.state.model.contextWindow);
    }
  }

  public async updatePlan(data: PlanUpdatedData): Promise<void> {
    const activeRun = this.activeRun;
    if (activeRun === null) throw new Error("当前没有活动 Run");
    await this.emit({ data, type: HarnessEventType.PLAN_UPDATED }, activeRun.runId);
    this.planState = data;
  }

  public async updateTodos(data: TodoUpdatedData): Promise<TodoUpdatedData> {
    const activeRun = this.activeRun;
    if (activeRun === null) throw new Error("当前没有活动 Run");
    const updated = attachSuccessfulTodoEvidence(data, [...this.successfulToolCallIds]);
    await this.emit({ data: updated, type: HarnessEventType.TODO_UPDATED }, activeRun.runId);
    this.todoState = updated;
    return updated;
  }

  public async restoreContextCheckpoint(steps: number): Promise<number> {
    const activeRun = this.activeRun;
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
    await this.emit(
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
    this.contextCheckpointTailStartMessageIndex = this.agent.state.messages.length;
    return target.eventSeq;
  }

  public async resetWorkingState(reason: string): Promise<void> {
    const activeRun = this.activeRun;
    if (activeRun === null) throw new Error("当前没有活动 Run");
    await this.clearWorkingState(reason, activeRun.runId);
  }

  private async clearWorkingState(reason: string, runId: RunId): Promise<void> {
    await this.emit(
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

  public applyContextCheckpointRestore(eventSeq: number): boolean {
    if (this.activeRun !== null) return false;
    const target = this.contextCheckpointHistory.find((record) => record.eventSeq === eventSeq);
    if (target === undefined) return false;
    this.contextCheckpoint = target.data;
    this.contextCheckpointEventSeq = target.eventSeq;
    this.contextCheckpointTailStartMessageIndex = this.agent.state.messages.length;
    return true;
  }

  public searchSessionHistory(input: {
    maxResults?: number;
    query: string;
  }): SessionHistorySearchResult {
    const query = input.query.trim().toLocaleLowerCase();
    if (!query) throw new Error("历史检索关键词不能为空");
    const matches: SessionHistorySearchResult["matches"] = [];
    const messages = this.agent.state.messages;
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

  // 工具调用前
  private async handleBeforeToolCall(
    context: BeforeToolCallContext,
    signal?: AbortSignal,
  ): Promise<BeforeToolCallResult | undefined> {
    const activeRun = this.activeRun;
    if (activeRun === null) return { block: true, reason: "当前没有活动 Run" };

    // 在工具真正执行前，根据工具权限和参数，决定“直接允许、直接拒绝，还是请求用户审批”
    const policy = await evaluateToolCall({
      approvalPolicy: activeRun.approvalPolicy,
      arguments: context.args, // 模型传给工具的参数
      policy: this.toolRegistry.get(context.toolCall.name)?.policy, // 工具权限
      protectedPaths: this.protectedPaths,
      workspaceRoot: this.workspaceRoot,
    });
    // 阻止工具
    if (policy.decision === ToolPolicyDecision.DENY) {
      return { block: true, reason: policy.reason };
    }
    // 自动允许副作用时仍执行重复调用保护；只读工具不需要指纹。
    if (policy.decision === ToolPolicyDecision.ALLOW) {
      if (policy.fingerprint === undefined) return undefined;
      const toolCallFingerprint = this.executionGuard.createFingerprint(
        context.toolCall.name,
        context.args,
        policy.fingerprint,
      );
      const blockReason = this.executionGuard.getBlockReason(
        context.toolCall.id,
        toolCallFingerprint,
      );
      if (blockReason !== null) return { block: true, reason: blockReason };
      this.executionGuard.recordApproved(context.toolCall.id, toolCallFingerprint);
      return undefined;
    }

    const toolCallFingerprint = this.executionGuard.createFingerprint(
      context.toolCall.name,
      context.args,
      policy.fingerprint,
    );
    const blockReason = this.executionGuard.getBlockReason(
      context.toolCall.id,
      toolCallFingerprint,
    );
    if (blockReason !== null) return { block: true, reason: blockReason };

    const approvalId = randomUUID();
    const request = {
      approvalId,
      risk: policy.risk,
      runId: activeRun.runId,
      sessionId: this.sessionId,
      summary: policy.summary,
      target: policy.target,
      toolCallId: context.toolCall.id,
      toolName: context.toolCall.name,
    };
    const approval = this.requestToolApproval(request, signal);

    try {
      /**
       * 这些emit的作用：记录并通知“Run 正在等待审批，以及审批已经结束”，根据emit的type参数来区分
       * 执行时间线：
       *  发送 approval.requested
          发送 run.awaiting_input
          等待 approval.result
          发送 approval.resolved
          发送 run.resumed
          继续或阻止工具
       */
      // 表示产生了一项待处理审批，数据用于 Web 展示审批卡片
      await this.emit(
        {
          data: {
            approvalId,
            expiresAt: approval.expiresAt,
            risk: request.risk,
            summary: request.summary,
            target: request.target,
            toolCallId: request.toolCallId,
            toolName: request.toolName,
          } satisfies ApprovalRequestedData,
          type: HarnessEventType.APPROVAL_REQUESTED,
        },
        activeRun.runId,
      );
      // 表示当前 Run 进入“等待用户输入”状态
      await this.emit(
        {
          data: {
            interactionId: approvalId,
            kind: "tool_approval",
          } satisfies RunInteractionData,
          type: HarnessEventType.RUN_AWAITING_INPUT,
        },
        activeRun.runId,
      );

      /**
       * 核心：真正让工具调用暂停的是这句，而不是 emit()
       * 原理：后端通过创建一个未完成的Promise（apps/daemon/src/services/human-interaction-service.ts）
       *  const result = new Promise<ApprovalDecisionValue>((resolve, reject) => {
            resolveResult = resolve;
            rejectResult = reject;
          });
       *  当前runtime的状态不变，只有当后端的Proimise结束后，改变的状态传入到runtime中才能继续执行
       */
      const decision = await approval.result;
      // 记录审批最终结果
      await this.emit(
        {
          data: {
            approvalId,
            decision,
            toolCallId: context.toolCall.id,
            toolName: context.toolCall.name,
          } satisfies ApprovalResolvedData,
          type: HarnessEventType.APPROVAL_RESOLVED,
        },
        activeRun.runId,
      );
      // 表示 Run 已经离开等待状态
      await this.emit(
        {
          data: {
            interactionId: approvalId,
            kind: "tool_approval",
          } satisfies RunInteractionData,
          type: HarnessEventType.RUN_RESUMED,
        },
        activeRun.runId,
      );

      // 决定是否执行工具，返回 undefined，表示不阻止工具，继续执行。
      if (decision === ApprovalDecision.APPROVED) {
        const currentPolicy = await evaluateToolCall({
          approvalPolicy: activeRun.approvalPolicy,
          arguments: context.args,
          policy: this.toolRegistry.get(context.toolCall.name)?.policy,
          protectedPaths: this.protectedPaths,
          workspaceRoot: this.workspaceRoot,
        });
        if (
          currentPolicy.decision !== ToolPolicyDecision.ASK ||
          currentPolicy.fingerprint !== policy.fingerprint ||
          currentPolicy.summary !== policy.summary ||
          currentPolicy.target !== policy.target
        ) {
          return {
            block: true,
            reason: "审批期间工具目标已变化，请重新读取后再修改",
          };
        }
        const currentBlockReason = this.executionGuard.getBlockReason(
          context.toolCall.id,
          toolCallFingerprint,
        );
        if (currentBlockReason !== null) {
          return { block: true, reason: currentBlockReason };
        }
        this.executionGuard.recordApproved(context.toolCall.id, toolCallFingerprint);
        return undefined;
      }
      return {
        block: true,
        reason: decision === ApprovalDecision.EXPIRED ? "工具审批已超时" : "用户拒绝了工具审批",
      };
    } catch (error: unknown) {
      approval.cancel();
      throw error;
    }
  }

  // 工具执行成功后捕获其一项或多项文件变更，等待对应 tool_execution_end 后顺序发出。
  private async handleAfterToolCall(context: AfterToolCallContext): Promise<undefined> {
    if (context.isError) return undefined;
    this.successfulToolCallIds.add(context.toolCall.id);
    const fileChanges = readFileChangeDetails(context.result.details);
    if (fileChanges.length === 0) return undefined;
    this.pendingFileChanges.set(
      context.toolCall.id,
      fileChanges.map((fileChange) => ({
        ...fileChange,
        toolCallId: context.toolCall.id,
        toolName: context.toolCall.name,
      })),
    );
    return undefined;
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
    if (event.type === "agent_start" && this.isContinuingSteer) return;
    if (event.type === "agent_end" && this.pendingSteerInterrupts.length > 0) return;
    if (
      event.type === "message_start" &&
      isHarnessUserMessage(event.message) &&
      event.message.queuedInputId !== undefined
    ) {
      this.pendingFollowUps.delete(event.message.queuedInputId);
    }
    const draft = adaptAgentEvent(event, activeRun);
    if (draft === null) return;

    await this.emit(draft, activeRun.runId);
    if (event.type === "tool_execution_end") {
      const fileChanges = this.pendingFileChanges.get(event.toolCallId);
      if (fileChanges !== undefined) {
        this.pendingFileChanges.delete(event.toolCallId);
        for (const fileChange of fileChanges) {
          await this.emit(
            { data: fileChange, type: HarnessEventType.FILE_CHANGED },
            activeRun.runId,
          );
        }
      }
    }
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
    this.setSupportsImageInput(input.model.input.includes("image"));
    const thinkingLevel = clampThinkingLevel(input.model, input.thinkingLevel);
    this.agent.state.thinkingLevel = thinkingLevel;
    this.agent.state.systemPrompt = [
      input.systemPrompt,
      ...input.contexts.map(({ content }) => content),
    ]
      .filter(Boolean)
      .join("\n");
    const runStartedData = {
      contexts: [...input.contexts],
      maxTokens: input.model.maxTokens,
      modelId: input.modelId,
      providerId: input.providerId,
      systemPrompt: input.systemPrompt,
      thinkingLevel,
      tools: this.agent.state.tools.map(({ description, name, parameters }) => ({
        description,
        name,
        parameters,
      })),
    } satisfies RunStartedData;
    let requestIndex = 0;
    this.agent.streamFunction = async (model, context, options) => {
      requestIndex += 1;
      await this.emit(
        {
          data: {
            ...estimateContextUsage(context, input.contexts),
            requestIndex,
          } satisfies ContextUsageSnapshotData,
          type: HarnessEventType.CONTEXT_USAGE_SNAPSHOT,
        },
        input.runId,
      );
      const contextError = this.pendingContextError;
      this.pendingContextError = null;
      if (contextError !== null) return createContextWindowErrorStream(model, contextError);
      return input.streamFn(model, context, {
        ...options,
        cacheRetention: "long",
        onPayload: async (payload, payloadModel) => {
          const transformedPayload = (await options?.onPayload?.(payload, payloadModel)) ?? payload;
          return applyModelResponsePreferences(
            transformedPayload,
            payloadModel,
            input.outputDetail,
            input.reasoningSummary,
            thinkingLevel !== ThinkingLevels.OFF,
          );
        },
        sessionId: this.sessionId,
      });
    };
    this.executionGuard.reset();
    const preparationAbortController = new AbortController();
    this.activeRun = {
      approvalPolicy: input.approvalPolicy,
      handleAutoFollowUp: createAutoFollowUpHandler((message) => this.agent.followUp(message)),
      preparationAbortController,
      ...runStartedData,
      runId: input.runId,
      startMessageIndex: this.agent.state.messages.length,
      streamFn: input.streamFn,
    };
    this.pendingWorkingStateReset = shouldResetWorkingStateForNewRun(
      this.planState,
      this.todoState,
    );

    try {
      let message: AgentMessage;
      try {
        message =
          input.userMessage ??
          (await createHarnessUserMessage({
            input: input.userInput,
            model: input.model,
            protectedPaths: this.protectedPaths,
            signal: preparationAbortController.signal,
            workspaceRoot: this.workspaceRoot,
          }));
      } catch (error: unknown) {
        await this.emit(
          {
            data: runStartedData,
            type: HarnessEventType.RUN_STARTED,
          },
          input.runId,
        );
        const userMessage = createHarnessUserMessageRecord(input.userInput);
        await this.emit(
          {
            data: userMessage,
            type: HarnessEventType.MESSAGE_COMPLETED,
          },
          input.runId,
        );
        this.agent.state.messages = [...this.agent.state.messages, userMessage];
        const isAborted = preparationAbortController.signal.aborted;
        await this.emit(
          {
            data: isAborted
              ? { code: "RUN_ABORTED", message: "运行已停止" }
              : {
                  code: "USER_CONTEXT_INVALID",
                  message:
                    error instanceof UserInputContextError
                      ? error.message
                      : "无法读取附件或引用上下文，请确认文件仍然存在且可访问",
                },
            type: isAborted ? HarnessEventType.RUN_ABORTED : HarnessEventType.RUN_FAILED,
          },
          input.runId,
        );
        return;
      }
      const initialPrompt = this.agent.prompt(message);
      if (this.pendingSteerInterrupts.length > 0) this.agent.abort();
      await initialPrompt;
      while (this.pendingSteerInterrupts.length > 0) {
        for (const steerMessage of this.pendingSteerInterrupts.splice(0)) {
          this.agent.steer(steerMessage);
        }
        this.isContinuingSteer = true;
        try {
          await this.agent.continue();
        } finally {
          this.isContinuingSteer = false;
        }
      }
    } finally {
      this.executionGuard.reset();
      this.pendingFileChanges.clear();
      this.pendingFollowUps.clear();
      this.agent.clearAllQueues();
      this.pendingContextError = null;
      this.isContinuingSteer = false;
      this.pendingSteerInterrupts.length = 0;
      this.pendingWorkingStateReset = false;
      this.activeRun = null;
    }
  }

  public abort(runId: RunId): boolean {
    if (this.activeRun?.runId !== runId) return false;
    this.activeRun.preparationAbortController.abort();
    this.pendingSteerInterrupts.length = 0;
    this.agent.clearSteeringQueue();
    this.agent.abort();
    return true;
  }

  public restoreHistory(input: RestoreRunHistoryInput): boolean {
    if (this.activeRun !== null || this.agent.state.isStreaming) return false;
    this.agent.state.messages = [...input.messages];
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
    this.nextSeq = input.initialSeq + 1;
    this.pendingWorkingStateReset = false;
    this.successfulToolCallIds.clear();
    for (const message of input.messages) {
      if (message.role === "toolResult" && !message.isError) {
        this.successfulToolCallIds.add(message.toolCallId);
      }
    }
    return true;
  }

  public async steer(runId: RunId, input: RunUserInput): Promise<boolean> {
    return this.runQueueMutation(async () => {
      const activeRun = this.activeRun;
      if (activeRun?.runId !== runId) return false;
      const message = await createHarnessUserMessage({
        input,
        model: this.agent.state.model,
        protectedPaths: this.protectedPaths,
        signal: activeRun.preparationAbortController.signal,
        workspaceRoot: this.workspaceRoot,
      });
      if (this.activeRun?.runId !== runId) return false;
      this.pendingSteerInterrupts.push({
        ...message,
        busySubmitBehavior: BusySubmitBehavior.STEER,
      });
      this.agent.abort();
      return true;
    });
  }

  public listQueuedFollowUps(runId: RunId): readonly QueuedRunInput[] {
    return this.activeRun?.runId === runId
      ? [...this.pendingFollowUps.values()].map((item) => item.queued)
      : [];
  }

  // 将当前活动 run 的消息追加到 Agent 的 follow-up 队列。
  public async followUp(runId: RunId, input: RunUserInput): Promise<QueuedRunInput | null> {
    return this.runQueueMutation(async () => {
      const activeRun = this.activeRun;
      if (activeRun?.runId !== runId) return null;
      const message = await createHarnessUserMessage({
        input,
        model: this.agent.state.model,
        protectedPaths: this.protectedPaths,
        signal: activeRun.preparationAbortController.signal,
        workspaceRoot: this.workspaceRoot,
      });
      if (this.activeRun?.runId !== runId) return null;
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
      this.agent.followUp(queuedMessage);
      return queued;
    });
  }

  public async updateFollowUp(
    runId: RunId,
    queuedInputId: string,
    prompt: string,
  ): Promise<QueuedRunInput | null> {
    return this.runQueueMutation(async () => {
      const activeRun = this.activeRun;
      const current = this.pendingFollowUps.get(queuedInputId);
      if (activeRun?.runId !== runId || current === undefined) return null;
      const input = { ...current.input, prompt };
      const message = await createHarnessUserMessage({
        input,
        model: this.agent.state.model,
        protectedPaths: this.protectedPaths,
        signal: activeRun.preparationAbortController.signal,
        workspaceRoot: this.workspaceRoot,
      });
      if (this.activeRun?.runId !== runId || !this.pendingFollowUps.has(queuedInputId)) {
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

  public async removeFollowUp(runId: RunId, queuedInputId: string): Promise<boolean> {
    return this.runQueueMutation(async () => {
      if (this.activeRun?.runId !== runId || !this.pendingFollowUps.delete(queuedInputId)) {
        return false;
      }
      this.syncFollowUpQueue();
      return true;
    });
  }

  public async steerFollowUp(runId: RunId, queuedInputId: string): Promise<boolean> {
    const current = this.pendingFollowUps.get(queuedInputId);
    if (this.activeRun?.runId !== runId || current === undefined) return false;
    this.pendingFollowUps.delete(queuedInputId);
    this.syncFollowUpQueue();
    this.pendingSteerInterrupts.push({
      ...current.message,
      busySubmitBehavior: BusySubmitBehavior.STEER,
    });
    this.agent.abort();
    return true;
  }

  private syncFollowUpQueue(): void {
    this.agent.clearFollowUpQueue();
    for (const item of this.pendingFollowUps.values()) this.agent.followUp(item.message);
  }

  private runQueueMutation<T>(mutation: () => Promise<T>): Promise<T> {
    const result = this.queueMutationTail.then(mutation, mutation);
    this.queueMutationTail = result.then(
      () => undefined,
      () => undefined,
    );
    return result;
  }

  public async close(): Promise<void> {
    this.agent.abort();
    await this.agent.waitForIdle();
    this.unsubscribe();
  }
}
