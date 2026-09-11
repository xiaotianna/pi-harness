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
import {
  ApprovalPolicy,
  type ApprovalPolicyValue,
  evaluateToolCall,
  ToolPermission,
  ToolPolicyDecision,
} from "@pi-harness/policy";
import {
  attachSuccessfulTodoEvidence,
  type FileChangeDetails,
  type PlanUpdatedData,
  type RequestUserInputData,
  readFileChangeDetails,
  type SessionHistorySearchResult,
  type SkillRegistry,
  type TodoUpdatedData,
  type ToolRegistry,
  UserInputRequestKind,
  UserInputResponseAction,
  type UserInputToolResult,
} from "@pi-harness/tools";
import type { PreparedExternalTools, PrepareExternalTools } from "./agent-manager.js";
import { createAutoFollowUpHandler } from "./auto-follow-up.js";
import { CONTEXT_WINDOW_EXCEEDED_ERROR_CODE, projectContext } from "./context/context-pipeline.js";
import { type AgentEventAdapterContext, adaptAgentEvent } from "./event-adapter.js";
import {
  ApprovalDecision,
  type ApprovalRequestedData,
  ApprovalRequestKind,
  type ApprovalRequestKind as ApprovalRequestKindValue,
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
  type InputExpiredData,
  type InputRequestedData,
  type InputResolvedData,
  isApprovalGranted,
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
import {
  buildToolApprovalPrompt,
  parseToolApprovalResponse,
  TOOL_APPROVAL_SYSTEM_PROMPT,
} from "./prompts/tool-approval-prompt.js";
import { type ThinkingLevel, ThinkingLevel as ThinkingLevels } from "./thinking-level.js";
import type { ToolApprovalRequester } from "./tool-approval.js";
import {
  BusySubmitBehavior,
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

interface PendingFollowUp {
  input: RunUserInput;
  message: HarnessUserMessage;
  queued: QueuedRunInput;
}

const MAX_PLAN_MODE_RETRY_COUNT = 8;
const TOOL_APPROVAL_MAX_TOKENS = 64;
const TOOL_APPROVAL_TIMEOUT_MS = 20_000;

interface PlanModeRetryMessage {
  content: string;
  isInternal: true;
  role: "user";
  timestamp: number;
}

function createPlanModeRetryMessage(content: string): PlanModeRetryMessage {
  return {
    content,
    isInternal: true,
    role: "user",
    timestamp: Date.now(),
  };
}

function canRetryPlanMode(event: Extract<AgentEvent, { type: "agent_end" }>): boolean {
  const lastMessage = event.messages.at(-1);
  return !(
    lastMessage?.role === "assistant" &&
    (lastMessage.stopReason === "aborted" || lastMessage.stopReason === "error")
  );
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
  private readonly sessionApprovedFingerprints = new Set<string>();
  private readonly sessionApprovedNetworkTargets = new Set<string>();
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
    private readonly requestHumanInput: HumanInputRequester,
    private readonly setSupportsImageInput: (supportsImageInput: boolean) => void,
    private contextCheckpoint: ContextCompactedData | null,
    private contextCheckpointEventSeq: number | null,
    private contextCheckpointTailStartMessageIndex: number | null,
    private readonly contextCheckpointHistory: ContextCheckpointRecord[],
    private planState: PlanUpdatedData | null,
    private todoState: TodoUpdatedData | null,
    private readonly getAllowedCommandPrefixes: () => readonly (readonly string[])[] = () => [],
    private readonly skillRegistry?: SkillRegistry,
    private readonly prepareExternalTools?: PrepareExternalTools,
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
        planContract: activeRun.approvedPlanMarkdown,
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

  public async requestUserInput(
    data: RequestUserInputData,
    signal?: AbortSignal,
  ): Promise<UserInputToolResult> {
    const activeRun = this.activeRun;
    if (activeRun === null) throw new Error("当前没有活动 Run");
    const kind = data.kind ?? UserInputRequestKind.QUESTION;
    const planMarkdown = data.planMarkdown?.trim();
    if (activeRun.mode === RunMode.PLAN && activeRun.isPlanApproved) {
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
            data: { inputId } satisfies InputExpiredData,
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

  private async requestAiToolApproval(
    input: { risk: string; summary: string; target: string; toolName: string },
    signal?: AbortSignal,
  ): Promise<{ commandPrefix: readonly string[] | null; isAllowed: boolean }> {
    const activeRun = this.activeRun;
    if (activeRun === null) return { commandPrefix: null, isAllowed: false };
    const timeoutSignal = AbortSignal.timeout(TOOL_APPROVAL_TIMEOUT_MS);
    const requestSignal = signal ? AbortSignal.any([signal, timeoutSignal]) : timeoutSignal;
    try {
      const stream = await activeRun.streamFn(
        this.agent.state.model,
        {
          messages: [
            {
              content: buildToolApprovalPrompt(input),
              role: "user",
              timestamp: Date.now(),
            },
          ],
          systemPrompt: TOOL_APPROVAL_SYSTEM_PROMPT,
        },
        {
          maxRetries: 0,
          maxTokens: TOOL_APPROVAL_MAX_TOKENS,
          signal: requestSignal,
          timeoutMs: TOOL_APPROVAL_TIMEOUT_MS,
        },
      );
      const response = await stream.result();
      if (response.stopReason === "aborted" || response.stopReason === "error") {
        return { commandPrefix: null, isAllowed: false };
      }
      return parseToolApprovalResponse(
        response.content.flatMap((part) => (part.type === "text" ? [part.text] : [])).join(""),
        input.summary,
      );
    } catch {
      signal?.throwIfAborted();
      return { commandPrefix: null, isAllowed: false };
    }
  }

  // 工具调用前
  private async handleBeforeToolCall(
    context: BeforeToolCallContext,
    signal?: AbortSignal,
  ): Promise<BeforeToolCallResult | undefined> {
    const activeRun = this.activeRun;
    if (activeRun === null) return { block: true, reason: "当前没有活动 Run" };

    const registration = this.toolRegistry.get(context.toolCall.name);
    if (
      activeRun.mode === RunMode.PLAN &&
      !activeRun.isPlanApproved &&
      registration?.policy.permission !== ToolPermission.READ_ONLY &&
      !(
        registration?.policy.permission === ToolPermission.SKILL_ACTIVATION &&
        typeof context.args === "object" &&
        context.args !== null &&
        (!("approveTools" in context.args) || context.args.approveTools !== true)
      )
    ) {
      return { block: true, reason: "Plan 尚未由用户确认，当前只允许读取和规划" };
    }

    // 在工具真正执行前，根据工具权限和参数，决定“直接允许、直接拒绝，还是请求用户审批”
    const policy = await evaluateToolCall({
      approvalPolicy: activeRun.approvalPolicy,
      allowedCommandPrefixes: this.getAllowedCommandPrefixes(),
      isSkillToolPreapproved:
        (await this.skillRegistry?.isToolPreapproved(
          context.toolCall.name,
          context.args,
          signal,
        )) ?? false,
      ...(signal ? { signal } : {}),
      arguments: context.args, // 模型传给工具的参数
      policy: registration?.policy, // 工具权限
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
    if (this.sessionApprovedFingerprints.has(toolCallFingerprint)) {
      this.executionGuard.recordApproved(context.toolCall.id, toolCallFingerprint);
      return undefined;
    }

    const aiApproval =
      activeRun.approvalPolicy === ApprovalPolicy.AUTO_APPROVE &&
      registration?.policy.permission === ToolPermission.SHELL &&
      policy.allowAiApproval !== false
        ? await this.requestAiToolApproval(
            {
              risk: policy.risk,
              summary: policy.summary,
              target: policy.target,
              toolName: context.toolCall.name,
            },
            signal,
          )
        : null;
    if (aiApproval?.isAllowed === true) {
      const currentPolicy = await evaluateToolCall({
        approvalPolicy: activeRun.approvalPolicy,
        allowedCommandPrefixes: this.getAllowedCommandPrefixes(),
        isSkillToolPreapproved:
          (await this.skillRegistry?.isToolPreapproved(
            context.toolCall.name,
            context.args,
            signal,
          )) ?? false,
        ...(signal ? { signal } : {}),
        arguments: context.args,
        policy: registration?.policy,
        protectedPaths: this.protectedPaths,
        workspaceRoot: this.workspaceRoot,
      });
      if (
        currentPolicy.decision !== ToolPolicyDecision.ASK ||
        currentPolicy.allowAiApproval === false ||
        currentPolicy.fingerprint !== policy.fingerprint ||
        currentPolicy.summary !== policy.summary ||
        currentPolicy.target !== policy.target
      ) {
        return { block: true, reason: "AI 审批期间工具目标已变化，请重新读取后再执行" };
      }
      const currentBlockReason = this.executionGuard.getBlockReason(
        context.toolCall.id,
        toolCallFingerprint,
      );
      if (currentBlockReason !== null) return { block: true, reason: currentBlockReason };
      this.executionGuard.recordApproved(context.toolCall.id, toolCallFingerprint);
      return undefined;
    }

    const approvalId = randomUUID();
    const commandPrefix = aiApproval === null ? policy.commandPrefix : aiApproval.commandPrefix;
    const request = {
      approvalId,
      ...(policy.allowSimilar === undefined ? {} : { allowSimilar: policy.allowSimilar }),
      ...(policy.allowSession === undefined ? {} : { allowSession: policy.allowSession }),
      ...(commandPrefix === undefined || commandPrefix === null ? {} : { commandPrefix }),
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
            ...(request.allowSimilar === undefined ? {} : { allowSimilar: request.allowSimilar }),
            ...(request.allowSession === undefined ? {} : { allowSession: request.allowSession }),
            ...(request.commandPrefix === undefined
              ? {}
              : { commandPrefix: request.commandPrefix }),
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
            ...(decision === ApprovalDecision.APPROVED_SIMILAR &&
            request.commandPrefix !== undefined
              ? { commandPrefix: request.commandPrefix }
              : {}),
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
      if (isApprovalGranted(decision)) {
        if (
          decision === ApprovalDecision.APPROVED_SIMILAR &&
          registration?.policy.permission === ToolPermission.USER_APPROVAL &&
          registration.policy.storeGrant !== undefined
        ) {
          await registration.policy.storeGrant(context.args, signal);
        }
        const currentPolicy = await evaluateToolCall({
          approvalPolicy: activeRun.approvalPolicy,
          allowedCommandPrefixes: this.getAllowedCommandPrefixes(),
          isSkillToolPreapproved:
            (await this.skillRegistry?.isToolPreapproved(
              context.toolCall.name,
              context.args,
              signal,
            )) ?? false,
          ...(signal ? { signal } : {}),
          arguments: context.args,
          policy: this.toolRegistry.get(context.toolCall.name)?.policy,
          protectedPaths: this.protectedPaths,
          workspaceRoot: this.workspaceRoot,
        });
        const isUnchangedOneTimeApproval =
          (decision === ApprovalDecision.APPROVED ||
            decision === ApprovalDecision.APPROVED_SESSION) &&
          currentPolicy.decision === ToolPolicyDecision.ASK &&
          currentPolicy.fingerprint === policy.fingerprint &&
          currentPolicy.summary === policy.summary &&
          currentPolicy.target === policy.target;
        const isValidSessionApproval =
          decision !== ApprovalDecision.APPROVED_SESSION ||
          (policy.allowSession !== false &&
            currentPolicy.decision === ToolPolicyDecision.ASK &&
            currentPolicy.allowSession !== false);
        const isStoredSimilarApproval =
          decision === ApprovalDecision.APPROVED_SIMILAR &&
          currentPolicy.decision === ToolPolicyDecision.ALLOW &&
          currentPolicy.fingerprint === policy.fingerprint;
        if ((!isUnchangedOneTimeApproval && !isStoredSimilarApproval) || !isValidSessionApproval) {
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
        if (decision === ApprovalDecision.APPROVED_SESSION) {
          this.sessionApprovedFingerprints.add(toolCallFingerprint);
        }
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

  public async requestNetworkAccess(
    input: { host: string; port?: number; toolCallId: string },
    signal?: AbortSignal,
  ): Promise<boolean> {
    const target = `${input.host}:${input.port ?? "*"}`;
    if (this.sessionApprovedNetworkTargets.has(target)) return true;
    const decision = await this.requestToolExecutionApproval(
      {
        allowSession: true,
        risk: "这是该域名或 IP 的首次访问；允许后，本次命令可向该目标发送工作区数据。",
        summary: `访问 ${target}`,
        target,
        toolCallId: input.toolCallId,
      },
      signal,
    );
    if (decision === ApprovalDecision.APPROVED_SESSION) {
      this.sessionApprovedNetworkTargets.add(target);
    }
    return isApprovalGranted(decision);
  }

  public async requestHostExecution(
    input: {
      command: string;
      changedFileCount: number;
      reason: string;
      toolCallId: string;
    },
    signal?: AbortSignal,
  ): Promise<boolean> {
    const changedFilesRisk =
      input.changedFileCount === 0
        ? ""
        : ` 沙箱内的首次执行已修改 ${input.changedFileCount} 个可追踪文件，重跑可能重复产生副作用。`;
    const decision = await this.requestToolExecutionApproval(
      {
        allowSession: false,
        kind: ApprovalRequestKind.HOST_EXECUTION,
        preview: input.reason,
        risk: `提升后，原命令将不受文件系统和网络沙箱限制，并以 daemon 当前用户权限在宿主机执行。${changedFilesRisk}`,
        summary: input.command,
        target: "宿主机（当前用户权限）",
        toolCallId: input.toolCallId,
      },
      signal,
    );
    if (decision === ApprovalDecision.EXPIRED) {
      throw new Error("HOST_EXECUTION_APPROVAL_EXPIRED: 宿主机执行审批已超时");
    }
    return isApprovalGranted(decision);
  }

  public recordCommandFileChanges(input: {
    changes: readonly FileChangeDetails[];
    toolCallId: string;
  }): void {
    if (input.changes.length === 0) return;
    this.pendingFileChanges.set(
      input.toolCallId,
      input.changes.map((fileChange) => ({
        ...fileChange,
        toolCallId: input.toolCallId,
        toolName: "run_command",
      })),
    );
  }

  private async requestToolExecutionApproval(
    input: {
      allowSession: boolean;
      kind?: ApprovalRequestKindValue;
      preview?: string;
      risk: string;
      summary: string;
      target: string;
      toolCallId: string;
    },
    signal?: AbortSignal,
  ): Promise<ApprovalDecision> {
    const activeRun = this.activeRun;
    if (activeRun === null) return ApprovalDecision.REJECTED;
    const approvalId = randomUUID();
    const request = {
      approvalId,
      allowSession: input.allowSession,
      ...(input.kind === undefined ? {} : { kind: input.kind }),
      ...(input.preview === undefined ? {} : { preview: input.preview }),
      risk: input.risk,
      runId: activeRun.runId,
      sessionId: this.sessionId,
      summary: input.summary,
      target: input.target,
      toolCallId: input.toolCallId,
      toolName: "run_command",
    };
    const approval = this.requestToolApproval(request, signal);
    try {
      await this.emit(
        {
          data: {
            approvalId,
            allowSession: input.allowSession,
            expiresAt: approval.expiresAt,
            ...(input.kind === undefined ? {} : { kind: input.kind }),
            ...(input.preview === undefined ? {} : { preview: input.preview }),
            risk: input.risk,
            summary: input.summary,
            target: input.target,
            toolCallId: input.toolCallId,
            toolName: "run_command",
          } satisfies ApprovalRequestedData,
          type: HarnessEventType.APPROVAL_REQUESTED,
        },
        activeRun.runId,
      );
      await this.emit(
        {
          data: { interactionId: approvalId, kind: "tool_approval" } satisfies RunInteractionData,
          type: HarnessEventType.RUN_AWAITING_INPUT,
        },
        activeRun.runId,
      );
      const decision = await approval.result;
      await this.emit(
        {
          data: {
            approvalId,
            decision,
            toolCallId: input.toolCallId,
            toolName: "run_command",
          } satisfies ApprovalResolvedData,
          type: HarnessEventType.APPROVAL_RESOLVED,
        },
        activeRun.runId,
      );
      await this.emit(
        {
          data: { interactionId: approvalId, kind: "tool_approval" } satisfies RunInteractionData,
          type: HarnessEventType.RUN_RESUMED,
        },
        activeRun.runId,
      );
      return decision;
    } finally {
      approval.cancel();
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
      this.pendingFollowUps.delete(event.message.queuedInputId);
    }
    const draft = adaptAgentEvent(event, activeRun);
    if (draft === null) return;

    await this.emit(draft, activeRun.runId);
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

    this.skillRegistry?.clearGrants();
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
      mode: input.userInput.mode ?? RunMode.DEFAULT,
      providerId: input.providerId,
      systemPrompt: input.systemPrompt,
      thinkingLevel,
      tools: createRunToolSnapshot(this.toolRegistry),
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
    this.pendingWorkingStateReset = shouldResetWorkingStateForNewRun(
      this.planState,
      this.todoState,
    );

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
        this.toolRegistry.replaceExternal(externalTools?.registrations ?? []);
        this.agent.state.tools = this.toolRegistry.tools;
        runStartedData.tools = createRunToolSnapshot(this.toolRegistry);
        activeRun.tools = runStartedData.tools;
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
      if (this.pendingSteerInterrupts.length > 0) this.agent.abort();
      await initialPrompt;
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
      externalTools?.release();
      this.toolRegistry.replaceExternal([]);
      this.agent.state.tools = this.toolRegistry.tools;
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
        skillRegistry: this.skillRegistry,
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
        skillRegistry: this.skillRegistry,
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
        skillRegistry: this.skillRegistry,
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
