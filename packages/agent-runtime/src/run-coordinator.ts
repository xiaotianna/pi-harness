import { randomUUID } from "node:crypto";
import type {
  Agent,
  AgentEvent,
  AgentMessage,
  AgentTool,
  StreamFn,
} from "@earendil-works/pi-agent-core";
import {
  type Api,
  type AssistantMessage,
  clampThinkingLevel,
  createAssistantMessageEventStream,
  type Model,
} from "@earendil-works/pi-ai";
import { ApprovalPolicy, type ApprovalPolicyValue } from "@pi-harness/policy";
import {
  type FileChangeDetails,
  type PlanUpdatedData,
  type RequestUserInputData,
  type SendAgentMessageInput,
  type SkillRegistry,
  type SpawnAgentInput,
  type StopAgentInput,
  type TodoUpdatedData,
  type ToolRegistry,
  UserInputRequestKind,
  UserInputResponseAction,
  type UserInputToolResult,
  type WaitAgentsInput,
} from "@pi-harness/tools";
import type { PreparedExternalTools, PrepareExternalTools } from "./agent-manager.js";
import { createAutoFollowUpHandler } from "./auto-follow-up.js";
import { CONTEXT_WINDOW_EXCEEDED_ERROR_CODE } from "./context/context-pipeline.js";
import { type AgentEventAdapterContext, adaptAgentEvent } from "./event-adapter.js";
import {
  type ContextCheckpointRecord,
  type ContextCompactedData,
  type ContextUsageSnapshotData,
  type HarnessEvent,
  type HarnessEventDraft,
  HarnessEventType,
  type InputExpiredData,
  type InputRequestedData,
  type InputResolvedData,
  type RunContextData,
  type RunId,
  type RunInteractionData,
  type RunStartedData,
  type SessionId,
  type ToolCompletedData,
  type ToolStartedData,
} from "./harness-event.js";
import type { HumanInputRequester } from "./human-input.js";
import {
  applyModelResponsePreferences,
  type OutputDetail,
  type ReasoningSummary,
} from "./model-response-preferences.js";
import {
  PLAN_MODE_EXECUTION_RETRY_PROMPT,
  PLAN_MODE_RETRY_PROMPT,
  PLAN_MODE_REVISION_RETRY_PROMPT,
} from "./prompts/plan-mode-prompt.js";
import { RunContextHooks } from "./run-context-hooks.js";
import { RunInputQueue } from "./run-input-queue.js";
import { RunToolHooks } from "./run-tool-hooks.js";
import { SubAgentTree } from "./sub-agent-tree.js";
import { type ThinkingLevel, ThinkingLevel as ThinkingLevels } from "./thinking-level.js";
import type { ToolApprovalRequester } from "./tool-approval.js";
import {
  type HarnessUserMessage,
  isHarnessUserMessage,
  type QueuedRunInput,
  RunMode,
  type RunUserInput,
  UserInputContextError,
} from "./user-input.js";
import { isPlanExecutionAcknowledgement } from "./utils/agent-message.js";
import { estimateContextUsage } from "./utils/context-usage.js";
import { createRunToolSnapshot } from "./utils/run-tool-snapshot.js";
import { expandExplicitSkills } from "./utils/skill-context.js";
import { createHarnessUserMessage, createHarnessUserMessageRecord } from "./utils/user-input.js";

export interface StartRunInput {
  approvalPolicy: ApprovalPolicyValue;
  contexts: readonly RunContextData[];
  isSubAgentEnabled: boolean;
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
  approvedPlanMarkdown: string | null;
  handleAutoFollowUp: ReturnType<typeof createAutoFollowUpHandler>;
  hasPresentedPlanReview: boolean;
  isPlanApproved: boolean;
  mode: RunMode;
  planRetryPrompt: string | null;
  preparationAbortController: AbortController;
  preparationFailures: PreparedExternalTools["failures"];
  runId: RunId;
  startMessageIndex: number;
  streamFn: StreamFn;
}

const MAX_PLAN_MODE_RETRY_COUNT = 8;

interface PlanModeRetryMessage {
  content: string;
  isInternal: true;
  role: "user";
  timestamp: number;
}

/** 把 Plan 模式的续轮提示包装成 Agent 可接收的内部用户消息。 */
function createPlanModeRetryMessage(content: string): PlanModeRetryMessage {
  return {
    content,
    isInternal: true,
    role: "user",
    timestamp: Date.now(),
  };
}

/** 模型正常停下时才尝试续轮；中止或出错时不能继续追问它。 */
function canRetryPlanMode(event: Extract<AgentEvent, { type: "agent_end" }>): boolean {
  const lastMessage = event.messages.at(-1);
  return !(
    lastMessage?.role === "assistant" &&
    (lastMessage.stopReason === "aborted" || lastMessage.stopReason === "error")
  );
}

/** 上下文准备失败时返回一个标准模型错误流，让 Agent 按原有错误路径收尾。 */
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
  private readonly toolHooks: RunToolHooks;
  private readonly contextHooks: RunContextHooks;
  private readonly inputQueue: RunInputQueue;
  private nextSeq: number;
  private readonly unsubscribe: () => void;
  private eventTail: Promise<void> = Promise.resolve();
  private pendingRunOutcome: HarnessEventDraft | null = null;
  private hasEmittedRunStart = false;
  private subAgents: SubAgentTree | null = null;
  private rootJoinAbortController: AbortController | null = null;

  /**
   * 为一个 Session 接好三类协作者：上下文、工具安全检查和用户消息队列。
   * 最后订阅 Agent 事件；之后 Agent 的消息、工具和模型请求都会回到这里进入统一 Run 流程。
   */
  public constructor(
    private readonly sessionId: SessionId,
    private readonly agent: Agent,
    private readonly toolRegistry: ToolRegistry,
    initialSeq: number,
    private readonly onEvent: HarnessEventListener,
    private readonly workspaceRoot: string,
    private readonly protectedPaths: readonly string[],
    requestToolApproval: ToolApprovalRequester,
    private readonly requestHumanInput: HumanInputRequester,
    private readonly setSupportsImageInput: (supportsImageInput: boolean) => void,
    contextCheckpoint: ContextCompactedData | null,
    contextCheckpointEventSeq: number | null,
    contextCheckpointTailStartMessageIndex: number | null,
    contextCheckpointHistory: ContextCheckpointRecord[],
    planState: PlanUpdatedData | null,
    todoState: TodoUpdatedData | null,
    getAllowedCommandPrefixes: () => readonly (readonly string[])[] = () => [],
    private readonly skillRegistry?: SkillRegistry,
    private readonly prepareExternalTools?: PrepareExternalTools,
    private readonly acquireSubAgentSlot: () => (() => void) | null = () => null,
    private readonly resolveSubAgentModel: (
      providerId: string,
      modelId: string,
    ) => Promise<Model<Api>> = async () => {
      throw new Error("SUBAGENT_MODEL_FAILED: 模型覆盖不可用");
    },
    private readonly subAgentToolNames: readonly string[] = [],
  ) {
    this.toolHooks = new RunToolHooks({
      agent,
      emit: (draft, runId) => this.emit(draft, runId),
      getActiveRun: () => this.activeRun,
      getAllowedCommandPrefixes,
      protectedPaths,
      requestToolApproval,
      sessionId,
      ...(skillRegistry === undefined ? {} : { skillRegistry }),
      toolRegistry,
      workspaceRoot,
    });
    this.toolHooks.restoreSuccessfulCalls(agent.state.messages);
    this.contextHooks = new RunContextHooks(
      {
        agent,
        emit: (draft, runId) => this.emit(draft, runId),
        getActiveRun: () => this.activeRun,
        sessionId,
        successfulToolCallIds: this.toolHooks.successfulToolCallIds,
      },
      {
        contextCheckpoint,
        contextCheckpointEventSeq,
        contextCheckpointHistory,
        contextCheckpointTailStartMessageIndex,
        plan: planState,
        todos: todoState,
      },
    );
    this.inputQueue = new RunInputQueue({
      abortJoin: () => this.rootJoinAbortController?.abort(),
      agent,
      getActiveRun: () => this.activeRun,
      protectedPaths,
      ...(skillRegistry === undefined ? {} : { skillRegistry }),
      workspaceRoot,
    });
    this.nextSeq = initialSeq + 1;
    this.agent.beforeToolCall = (context, signal) =>
      this.toolHooks.handleBeforeToolCall(context, signal);
    this.agent.afterToolCall = (context) => this.toolHooks.handleAfterToolCall(context);
    this.agent.transformContext = (messages, signal) =>
      this.contextHooks.transformContext(messages, signal);
    // 构造时会订阅 pi Agent 事件
    this.unsubscribe = agent.subscribe((event) => this.handleAgentEvent(event));
  }

  /**
   * 把草稿补成带 Session、Run 和递增序号的事件，再按顺序交给持久化/广播方。
   * 像给每封信盖流水号：上一封提交成功后才轮到下一封，避免同一 Session 的事件乱序。
   */
  private async emit(draft: HarnessEventDraft, runId: RunId): Promise<HarnessEvent> {
    const commit = async (): Promise<HarnessEvent> => {
      const event: HarnessEvent = {
        data: draft.data,
        id: randomUUID(),
        runId,
        seq: this.nextSeq,
        sessionId: this.sessionId,
        timestamp: Date.now(),
        type: draft.type,
      };
      await this.onEvent(event);
      this.nextSeq += 1;
      return event;
    };
    const result = this.eventTail.then(commit);
    this.eventTail = result.then(() => undefined);
    return result;
  }

  /** 让受监管后台任务复用 Session 的单调事件序号与持久化链路。 */
  public emitExternal(draft: HarnessEventDraft, runId: RunId): Promise<HarnessEvent> {
    return this.emit(draft, runId);
  }

  /** 后台命令退出后直接发布最终文件变化，不依赖已经结束的工具调用钩子。 */
  public async emitCommandFileChanges(
    runId: RunId,
    toolCallId: string,
    changes: readonly FileChangeDetails[],
  ): Promise<void> {
    for (const change of changes) {
      await this.emit(
        {
          data: { ...change, toolCallId, toolName: "run_command" },
          type: HarnessEventType.FILE_CHANGED,
        },
        runId,
      );
    }
  }

  /** 在当前 Run 的子任务树中创建子 Agent；没有活动子任务树时拒绝。 */
  public spawnSubAgent(toolCallId: string, input: SpawnAgentInput, signal?: AbortSignal) {
    if (this.subAgents === null) throw new Error("SUBAGENT_NOT_ACTIVE: 当前没有活动 Run");
    return this.subAgents.spawn(null, toolCallId, input, signal);
  }

  /** 等待当前 Run 中指定的子 Agent 完成，等待过程可取消。 */
  public waitSubAgents(input: WaitAgentsInput, signal?: AbortSignal) {
    if (this.subAgents === null) throw new Error("SUBAGENT_NOT_ACTIVE: 当前没有活动 Run");
    return this.subAgents.wait(null, input, signal);
  }

  /** 把消息送到当前 Run 的子 Agent；没有活动子任务树时拒绝。 */
  public sendSubAgentMessage(input: SendAgentMessageInput, signal?: AbortSignal) {
    if (this.subAgents === null) throw new Error("SUBAGENT_NOT_ACTIVE: 当前没有活动 Run");
    return this.subAgents.send(null, input, signal);
  }

  /** 按执行 ID 停止当前 Run 中的一个子 Agent。 */
  public stopSubAgent(input: StopAgentInput, signal?: AbortSignal) {
    if (this.subAgents === null) throw new Error("SUBAGENT_NOT_ACTIVE: 当前没有活动 Run");
    return this.subAgents.stop(null, input.executionId, signal);
  }

  /** 供外部中止子 Agent；当前没有子任务树时返回 false。 */
  public abortSubAgent(executionId: string): Promise<boolean> {
    return this.subAgents?.stopById(executionId) ?? Promise.resolve(false);
  }

  /** Shell 运行时需要访问新网络目标时，交由工具钩子执行独立审批。 */
  public requestNetworkAccess(
    input: { host: string; port?: number; toolCallId: string },
    signal?: AbortSignal,
  ): Promise<boolean> {
    return this.toolHooks.requestNetworkAccess(input, signal);
  }

  /** Shell 请求脱离沙箱执行时，交由工具钩子展示风险并等待审批。 */
  public requestHostExecution(
    input: { command: string; changedFileCount: number; reason: string; toolCallId: string },
    signal?: AbortSignal,
  ): Promise<boolean> {
    return this.toolHooks.requestHostExecution(input, signal);
  }

  /** 暂存命令造成的文件变化，等工具结束事件后再按顺序发布。 */
  public recordCommandFileChanges(input: {
    changes: readonly FileChangeDetails[];
    toolCallId: string;
  }): void {
    this.toolHooks.recordCommandFileChanges(input);
  }

  /** 记录当前 Plan，供后续上下文投影和历史恢复使用。 */
  public updatePlan(data: PlanUpdatedData): Promise<void> {
    return this.contextHooks.updatePlan(data);
  }

  /** 更新 Todos，并由上下文钩子附上已成功工具调用的证据。 */
  public updateTodos(data: TodoUpdatedData): Promise<TodoUpdatedData> {
    return this.contextHooks.updateTodos(data);
  }

  /** 请求回退若干个上下文 checkpoint，返回目标事件序号。 */
  public restoreContextCheckpoint(steps: number): Promise<number> {
    return this.contextHooks.restoreContextCheckpoint(steps);
  }

  /** 清空当前 Plan/Todos，同时留下带原因的状态重置事件。 */
  public resetWorkingState(reason: string): Promise<void> {
    return this.contextHooks.resetWorkingState(reason);
  }

  /** Session 空闲时应用一条已记录的 checkpoint 恢复事件。 */
  public applyContextCheckpointRestore(eventSeq: number): boolean {
    return this.contextHooks.applyContextCheckpointRestore(eventSeq);
  }

  /** 在完整会话消息中检索旧内容，即使旧内容已从模型热上下文压缩掉也能找到。 */
  public searchSessionHistory(input: { maxResults?: number; query: string }) {
    return this.contextHooks.searchSessionHistory(input);
  }

  /**
   * 让 Agent 暂停等待用户回答，并把请求、回答或超时依次记录为事件。
   * 例如 Plan 模式提交计划书后，用户确认才解锁执行；若用户提出修改，回答会进入 Agent 下一轮。
   * 子 Agent 只能问普通问题，且它的等待状态由外层管理，不重复发送根 Run 的等待/恢复事件。
   */
  public async requestUserInput(
    data: RequestUserInputData,
    signal?: AbortSignal,
    executionId?: string,
  ): Promise<UserInputToolResult> {
    const activeRun = this.activeRun;
    if (activeRun === null) throw new Error("当前没有活动 Run");
    const kind = data.kind ?? UserInputRequestKind.QUESTION;
    if (executionId !== undefined && kind !== UserInputRequestKind.QUESTION) {
      throw new Error("SUBAGENT_INPUT_DENIED: 子 Agent 只能请求普通用户输入");
    }
    const planMarkdown = data.planMarkdown?.trim();
    if (executionId === undefined && activeRun.mode === RunMode.PLAN && activeRun.isPlanApproved) {
      throw new Error("计划书已确认，请直接执行，不要再次请求用户输入");
    }
    if (kind === UserInputRequestKind.PLAN_REVIEW) {
      if (activeRun.mode !== RunMode.PLAN) throw new Error("只有计划模式可以提交计划书");
      if (!planMarkdown) throw new Error("计划确认必须携带完整 Markdown 计划书");
    }

    const inputId = randomUUID();
    const interaction = this.requestHumanInput(
      {
        inputId,
        ...(executionId === undefined ? {} : { executionId }),
        kind,
        ...(planMarkdown === undefined ? {} : { planMarkdown }),
        questions: data.questions,
        runId: activeRun.runId,
        sessionId: this.sessionId,
      },
      signal,
    );
    if (kind === UserInputRequestKind.PLAN_REVIEW) activeRun.hasPresentedPlanReview = true;

    try {
      await this.emit(
        {
          data: interaction.request satisfies InputRequestedData,
          type: HarnessEventType.INPUT_REQUESTED,
        },
        activeRun.runId,
      );
      if (executionId === undefined)
        await this.emit(
          {
            data: { interactionId: inputId, kind } satisfies RunInteractionData,
            type: HarnessEventType.RUN_AWAITING_INPUT,
          },
          activeRun.runId,
        );

      const result = await interaction.result;
      if (result.status === "expired") {
        await this.emit(
          {
            data: {
              inputId,
              ...(executionId === undefined ? {} : { executionId }),
            } satisfies InputExpiredData,
            type: HarnessEventType.INPUT_EXPIRED,
          },
          activeRun.runId,
        );
      } else {
        const resolvedPlanMarkdown = planMarkdown;
        if (
          kind === UserInputRequestKind.PLAN_REVIEW &&
          result.action === UserInputResponseAction.CONFIRM_PLAN
        ) {
          if (!resolvedPlanMarkdown) throw new Error("确认执行前缺少 Markdown 计划书");
          activeRun.isPlanApproved = true;
          activeRun.approvedPlanMarkdown = resolvedPlanMarkdown;
        }
        await this.emit(
          {
            data: {
              action: result.action,
              answers: result.answers,
              inputId,
              ...(executionId === undefined ? {} : { executionId }),
              ...(resolvedPlanMarkdown === undefined ? {} : { planMarkdown: resolvedPlanMarkdown }),
            } satisfies InputResolvedData,
            type: HarnessEventType.INPUT_RESOLVED,
          },
          activeRun.runId,
        );
        if (kind === UserInputRequestKind.PLAN_REVIEW) {
          const response = result.answers[0]?.value.trim();
          if (response) {
            // 计划确认与修改都是用户输入；排入当前 Agent Loop 的下一轮，不中止正在恢复的工具调用。
            this.agent.steer(
              createHarnessUserMessageRecord({
                attachments: [],
                prompt: response,
                references: [],
              }),
            );
          }
        }
      }
      if (executionId === undefined)
        await this.emit(
          {
            data: { interactionId: inputId, kind } satisfies RunInteractionData,
            type: HarnessEventType.RUN_RESUMED,
          },
          activeRun.runId,
        );
      return result;
    } catch (error: unknown) {
      interaction.cancel();
      throw error;
    }
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
    if (event.type === "agent_start" && (this.inputQueue.isContinuing || this.hasEmittedRunStart))
      return;
    if (event.type === "agent_end" && this.inputQueue.hasPendingSteers) return;
    if (event.type === "agent_end" && activeRun.mode === RunMode.PLAN && canRetryPlanMode(event)) {
      if (!activeRun.isPlanApproved) {
        activeRun.planRetryPrompt = activeRun.hasPresentedPlanReview
          ? PLAN_MODE_REVISION_RETRY_PROMPT
          : PLAN_MODE_RETRY_PROMPT;
        return;
      }
      if (isPlanExecutionAcknowledgement(event.messages.at(-1))) {
        activeRun.planRetryPrompt = PLAN_MODE_EXECUTION_RETRY_PROMPT;
        return;
      }
    }
    if (
      event.type === "message_start" &&
      isHarnessUserMessage(event.message) &&
      event.message.queuedInputId !== undefined
    ) {
      this.inputQueue.onMessageStarted(event.message.queuedInputId);
    }
    const draft = adaptAgentEvent(event, activeRun);
    if (draft === null) return;
    if (event.type === "agent_end") {
      this.pendingRunOutcome = draft;
      return;
    }

    await this.emit(draft, activeRun.runId);
    if (event.type === "agent_start") this.hasEmittedRunStart = true;
    if (
      event.type === "message_end" &&
      event.message.role === "user" &&
      activeRun.preparationFailures.length > 0
    ) {
      const failures = activeRun.preparationFailures;
      activeRun.preparationFailures = [];
      for (const failure of failures) {
        const toolCallId = randomUUID();
        await this.emit(
          {
            data: {
              arguments: {},
              displayName: failure.displayName,
              source: failure.source,
              toolCallId,
              toolName: "mcp_connect",
            } satisfies ToolStartedData,
            type: HarnessEventType.TOOL_STARTED,
          },
          activeRun.runId,
        );
        await this.emit(
          {
            data: {
              isError: true,
              result: {
                content: [{ text: failure.message, type: "text" }],
                details: { source: failure.source },
              },
              toolCallId,
              toolName: "mcp_connect",
            } satisfies ToolCompletedData,
            type: HarnessEventType.TOOL_FAILED,
          },
          activeRun.runId,
        );
      }
    }
    if (event.type === "tool_execution_end") {
      await this.toolHooks.flushFileChanges(event.toolCallId, activeRun.runId);
    }
    activeRun.handleAutoFollowUp(event);
  }

  /** 返回当前 Run 的 Provider ID；空闲时返回 null。 */
  public get activeProviderId(): string | null {
    return this.activeRun?.providerId ?? null;
  }

  /** 返回当前 Run ID；Session 没有运行任务时返回 null。 */
  public get activeRunId(): RunId | null {
    return this.activeRun?.runId ?? null;
  }

  /** 当前 Run 是否选择 full_access 审批策略；空闲时视为否。 */
  public get isFullAccess(): boolean {
    return this.activeRun?.approvalPolicy === ApprovalPolicy.FULL_ACCESS;
  }

  /**
   * 根 Agent 停下后，先处理 Plan 模式必须完成的有界续轮，再接住用户转向和子 Agent 结果。
   * 例如模型只说“计划已确认，稍后执行”，这里会催它在同一个 Run 中继续，而不是误报完成。
   * 所有需要继续的工作结束后，才发布最终的完成、失败或中止事件。
   */
  private async settleRun(activeRun: ActiveRun): Promise<void> {
    const preparationAbortController = activeRun.preparationAbortController;
    let planRetryCount = 0;
    while (
      this.activeRun === activeRun &&
      activeRun.planRetryPrompt !== null &&
      planRetryCount < MAX_PLAN_MODE_RETRY_COUNT
    ) {
      const retryPrompt = activeRun.planRetryPrompt;
      activeRun.planRetryPrompt = null;
      planRetryCount += 1;
      await this.agent.prompt(createPlanModeRetryMessage(retryPrompt));
    }
    if (this.activeRun === activeRun && activeRun.planRetryPrompt !== null) {
      activeRun.planRetryPrompt = null;
      const isExecutionStalled = activeRun.isPlanApproved;
      this.subAgents?.abortAll();
      await this.subAgents?.waitForAll();
      await this.emit(
        {
          data: {
            code: isExecutionStalled ? "PLAN_EXECUTION_STALLED" : "PLAN_REVIEW_REQUIRED",
            message: isExecutionStalled
              ? "模型确认计划后仍未开始执行，请重试本次 Plan 请求"
              : "模型未能生成可确认的 Markdown 计划书，请重试本次 Plan 请求",
          },
          type: HarnessEventType.RUN_FAILED,
        },
        activeRun.runId,
      );
      return;
    }
    await this.inputQueue.continuePendingSteers();
    if (preparationAbortController.signal.aborted) {
      await this.subAgents?.waitForAll();
      this.pendingRunOutcome = {
        data: { code: "RUN_ABORTED", message: "运行已停止" },
        type: HarnessEventType.RUN_ABORTED,
      };
    } else {
      while (this.subAgents !== null) {
        const joinAbortController = new AbortController();
        this.rootJoinAbortController = joinAbortController;
        if (this.inputQueue.hasPendingSteers) joinAbortController.abort();
        try {
          await this.subAgents.join(null, this.agent, joinAbortController.signal);
        } catch (error: unknown) {
          if (
            !joinAbortController.signal.aborted ||
            (!preparationAbortController.signal.aborted && !this.inputQueue.hasPendingSteers)
          )
            throw error;
        } finally {
          this.rootJoinAbortController = null;
        }
        if (preparationAbortController.signal.aborted) break;
        if (!this.inputQueue.hasPendingSteers) break;
        await this.inputQueue.continuePendingSteers();
      }
      if (preparationAbortController.signal.aborted) {
        await this.subAgents?.waitForAll();
        this.pendingRunOutcome = {
          data: { code: "RUN_ABORTED", message: "运行已停止" },
          type: HarnessEventType.RUN_ABORTED,
        };
      }
    }
    if (this.activeRun === activeRun && this.pendingRunOutcome !== null) {
      await this.emit(this.pendingRunOutcome, activeRun.runId);
    }
  }

  /**
   * 开始一个 Run：检查 Session 是否空闲，设置模型和工具，准备外部工具及用户消息，
   * 再让 Agent 执行并由 settleRun 等待所有续轮与子任务收尾。
   * 准备阶段失败也会留下开始、用户消息和失败事件；退出时进入工具释放与本次 Run 状态清理。
   */
  public async start(input: StartRunInput): Promise<void> {
    if (this.activeRun !== null || this.agent.state.isStreaming) {
      throw new Error(`Session ${this.sessionId} already has an active run`);
    }

    this.skillRegistry?.clearGrants();
    this.agent.state.model = input.model;
    this.setSupportsImageInput(input.model.input.includes("image"));
    const thinkingLevel = clampThinkingLevel(input.model, input.thinkingLevel);
    this.agent.state.thinkingLevel = thinkingLevel;
    const runContexts = [...input.contexts];
    this.agent.state.systemPrompt = [
      input.systemPrompt,
      ...runContexts.map(({ content }) => content),
    ]
      .filter(Boolean)
      .join("\n");
    const runTools = (): AgentTool[] =>
      input.isSubAgentEnabled
        ? this.toolRegistry.tools
        : this.toolRegistry.tools.filter((tool) => !this.subAgentToolNames.includes(tool.name));
    const runStartedData = {
      contexts: runContexts,
      maxTokens: input.model.maxTokens,
      modelId: input.modelId,
      mode: input.userInput.mode ?? RunMode.DEFAULT,
      providerId: input.providerId,
      systemPrompt: input.systemPrompt,
      thinkingLevel,
      tools: createRunToolSnapshot(this.toolRegistry, runTools()),
    } satisfies RunStartedData;
    let requestIndex = 0;
    this.agent.streamFunction = async (model, context, options) => {
      requestIndex += 1;
      await this.emit(
        {
          data: {
            ...estimateContextUsage(context, runContexts),
            // ponytail: 完整快照会放大会话 JSONL；体积成为问题时再改为增量快照。
            messages: structuredClone(context.messages),
            requestIndex,
          } satisfies ContextUsageSnapshotData,
          type: HarnessEventType.CONTEXT_USAGE_SNAPSHOT,
        },
        input.runId,
      );
      const contextError = this.contextHooks.takeContextError();
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
    this.toolHooks.resetForRun();
    const preparationAbortController = new AbortController();
    const activeRun: ActiveRun = {
      approvalPolicy: input.approvalPolicy,
      approvedPlanMarkdown: null,
      handleAutoFollowUp: createAutoFollowUpHandler((message) => this.agent.followUp(message)),
      hasPresentedPlanReview: false,
      isPlanApproved: false,
      planRetryPrompt: null,
      preparationAbortController,
      preparationFailures: [],
      ...runStartedData,
      runId: input.runId,
      startMessageIndex: this.agent.state.messages.length,
      streamFn: input.streamFn,
    };
    this.activeRun = activeRun;
    this.pendingRunOutcome = null;
    this.hasEmittedRunStart = false;
    this.contextHooks.beginRun();

    let externalTools: PreparedExternalTools | undefined;
    let hasPreparedTools = false;
    try {
      let message: AgentMessage;
      try {
        externalTools = await this.prepareExternalTools?.(
          this.sessionId,
          this.workspaceRoot,
          preparationAbortController.signal,
        );
        activeRun.preparationFailures = externalTools?.failures ?? [];
        preparationAbortController.signal.throwIfAborted();
        runContexts.push(...(externalTools?.contexts ?? []));
        this.agent.state.systemPrompt = [
          input.systemPrompt,
          ...runContexts.map(({ content }) => content),
        ]
          .filter(Boolean)
          .join("\n");
        this.toolRegistry.replaceExternal(externalTools?.registrations ?? []);
        this.agent.state.tools = runTools();
        runStartedData.tools = createRunToolSnapshot(this.toolRegistry, this.agent.state.tools);
        activeRun.tools = runStartedData.tools;
        this.subAgents = input.isSubAgentEnabled
          ? new SubAgentTree({
              rootAgent: this.agent,
              rootRegistry: this.toolRegistry,
              ...(this.skillRegistry === undefined ? {} : { skillRegistry: this.skillRegistry }),
              runId: input.runId,
              model: input.model,
              modelId: input.modelId,
              outputDetail: input.outputDetail,
              reasoningSummary: input.reasoningSummary,
              thinkingLevel: input.thinkingLevel,
              streamFn: input.streamFn,
              systemPrompt: [
                input.systemPrompt,
                ...runContexts
                  .filter((context) => context.type !== "memory")
                  .map((context) => context.content),
              ].join("\n"),
              workspaceRoot: this.workspaceRoot,
              mode: activeRun.mode,
              isPlanApproved: () => activeRun.isPlanApproved,
              emit: async (draft) => {
                await this.emit(draft, input.runId);
              },
              beforeToolCall: (context, registry, executionId, signal, skillRegistry) =>
                this.toolHooks.handleBeforeToolCall(
                  context,
                  signal,
                  registry,
                  executionId,
                  skillRegistry,
                ),
              setExecutionHooks: (registry, executionId, skillRegistry) =>
                this.toolHooks.setToolExecutionHooks(registry, executionId, skillRegistry),
              afterToolCall: (context, executionId) =>
                this.toolHooks.handleAfterToolCall(context, executionId),
              flushToolChanges: (toolCallId, executionId) =>
                this.toolHooks.flushFileChanges(toolCallId, input.runId, executionId),
              requestUserInput: (executionId, data, signal) =>
                this.requestUserInput(data, signal, executionId),
              acquireSlot: this.acquireSubAgentSlot,
              resolveModel: (modelId) => this.resolveSubAgentModel(input.providerId, modelId),
            })
          : null;
        hasPreparedTools = true;
        message = input.userMessage
          ? await expandExplicitSkills(
              input.userMessage,
              this.skillRegistry,
              preparationAbortController.signal,
            )
          : await createHarnessUserMessage({
              input: input.userInput,
              skillRegistry: this.skillRegistry,
              model: input.model,
              protectedPaths: this.protectedPaths,
              signal: preparationAbortController.signal,
              workspaceRoot: this.workspaceRoot,
            });
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
                  code: hasPreparedTools ? "USER_CONTEXT_INVALID" : "MCP_PREPARATION_FAILED",
                  message:
                    error instanceof UserInputContextError
                      ? error.message
                      : hasPreparedTools
                        ? "无法读取附件或引用上下文，请确认文件仍然存在且可访问"
                        : "无法准备 MCP 工具，请检查设置中的服务器连接、工具 schema 和数量限制",
                },
            type: isAborted ? HarnessEventType.RUN_ABORTED : HarnessEventType.RUN_FAILED,
          },
          input.runId,
        );
        return;
      }
      const initialPrompt = this.agent.prompt(message);
      if (this.inputQueue.hasPendingSteers) this.agent.abort();
      await initialPrompt;
      await this.settleRun(activeRun);
    } catch {
      this.subAgents?.abortAll();
      await this.subAgents?.waitForAll();
      await this.emit(
        {
          data: {
            code: "RUN_FAILED",
            message: "子任务或事件提交失败，请检查 daemon 日志",
          },
          type: HarnessEventType.RUN_FAILED,
        },
        activeRun.runId,
      );
    } finally {
      this.subAgents?.abortAll();
      await externalTools?.release();
      this.toolRegistry.replaceExternal([]);
      this.agent.state.tools = this.toolRegistry.tools;
      this.toolHooks.finishRun();
      this.inputQueue.finishRun();
      this.contextHooks.finishRun();
      this.activeRun = null;
      this.subAgents = null;
      this.rootJoinAbortController = null;
      this.pendingRunOutcome = null;
    }
  }

  /** 只中止匹配的活动 Run，同时取消准备、根 Agent、排队转向和子 Agent。 */
  public abort(runId: RunId): boolean {
    if (this.activeRun?.runId !== runId) return false;
    this.activeRun.preparationAbortController.abort();
    this.inputQueue.abort();
    this.agent.abort();
    this.rootJoinAbortController?.abort();
    this.subAgents?.abortAll();
    return true;
  }

  /** Session 空闲时装回消息、checkpoint、事件序号和成功工具记录；运行中拒绝恢复。 */
  public restoreHistory(input: RestoreRunHistoryInput): boolean {
    if (this.activeRun !== null || this.agent.state.isStreaming) return false;
    this.agent.state.messages = [...input.messages];
    this.contextHooks.restoreHistory(input);
    this.nextSeq = input.initialSeq + 1;
    this.toolHooks.restoreSuccessfulCalls(input.messages);
    return true;
  }

  /** 把新指令转向当前 Run，尽快中断眼前回答并继续处理它。 */
  public steer(runId: RunId, input: RunUserInput): Promise<boolean> {
    return this.inputQueue.steer(runId, input);
  }

  /** 列出当前 Run 中尚未开始、仍可编辑的后续消息。 */
  public listQueuedFollowUps(runId: RunId): readonly QueuedRunInput[] {
    return this.inputQueue.listQueuedFollowUps(runId);
  }

  /** 把新消息排到当前 Run 后面，不打断正在生成的回答。 */
  public followUp(runId: RunId, input: RunUserInput): Promise<QueuedRunInput | null> {
    return this.inputQueue.followUp(runId, input);
  }

  /** 按队列 ID 修改尚未开始的后续消息，并同步 Agent 队列。 */
  public updateFollowUp(
    runId: RunId,
    queuedInputId: string,
    prompt: string,
  ): Promise<QueuedRunInput | null> {
    return this.inputQueue.updateFollowUp(runId, queuedInputId, prompt);
  }

  /** 从当前 Run 删除尚未开始的后续消息。 */
  public removeFollowUp(runId: RunId, queuedInputId: string): Promise<boolean> {
    return this.inputQueue.removeFollowUp(runId, queuedInputId);
  }

  /** 把已排队的后续消息改为立即转向当前回答。 */
  public steerFollowUp(runId: RunId, queuedInputId: string): Promise<boolean> {
    return this.inputQueue.steerFollowUp(runId, queuedInputId);
  }

  /** 关闭协调器：中止 Agent 与子任务，等待退出后取消事件订阅。 */
  public async close(): Promise<void> {
    this.agent.abort();
    this.subAgents?.abortAll();
    await this.agent.waitForIdle();
    await this.subAgents?.waitForAll();
    this.unsubscribe();
  }
}
