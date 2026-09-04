import type { AgentMessage } from "@earendil-works/pi-agent-core";
import type { ModelThinkingLevel, Usage } from "@earendil-works/pi-ai";
import { isPlainObject } from "es-toolkit";

export type SessionId = string;
export type RunId = string;

// 工具审批结果
export const ApprovalDecision = {
  APPROVED: "approved", // 用户批准
  REJECTED: "rejected", // 用户拒绝
  EXPIRED: "expired", // 审批超时
} as const;

export type ApprovalDecision = (typeof ApprovalDecision)[keyof typeof ApprovalDecision];
// 审批最终返回的只有批准和拒绝
export type ApprovalResponseDecision =
  | typeof ApprovalDecision.APPROVED
  | typeof ApprovalDecision.REJECTED;

export const RunFileChangeOperation = {
  REAPPLY: "reapply_run_changes",
  REVERT: "undo_run_changes",
} as const;

export type RunFileChangeOperation =
  (typeof RunFileChangeOperation)[keyof typeof RunFileChangeOperation];

/**
 * HarnessEventType 是 pi harness（当前项目）对外公开的事件名称
 * 它描述一个 Session 中发生了什么，daemon 会据此持久化或通过 SSE 通知
 */
export const HarnessEventType = {
  /**
   * run生命周期相关
   */
  // run已正式开始，包含使用的 providerId 和 modelId
  RUN_STARTED: "run.started",
  // run正常完成，没有发生错误
  RUN_COMPLETED: "run.completed",
  // run因模型调用、事件处理等错误而失败
  RUN_FAILED: "run.failed",
  // run被用户主动停止或系统取消
  RUN_ABORTED: "run.aborted",
  // run暂停执行，正在等待用户回答问题
  RUN_AWAITING_INPUT: "run.awaiting_input",
  // 用户提供输入后，暂停的 run 恢复执行
  RUN_RESUMED: "run.resumed",
  /**
   * message消息事件
   */
  // 一条消息开始产生
  MESSAGE_STARTED: "message.started",
  // 消息的增量片段，例如新生成的一小段文字。
  // 该类型进一步区分：TEXT(普通回答文字)、THINKING(模型思考内容)、TOOL_CALL（流式生成的工具调用参数）
  MESSAGE_DELTA: "message.delta",
  // 消息生成结束，携带完整 AgentMessage
  MESSAGE_COMPLETED: "message.completed",
  // 用户改写历史消息后，从该消息开始创建新的当前分支
  MESSAGE_BRANCH_STARTED: "message.branch_started",
  /**
   * tool工具事件
   */
  // Agent 开始执行工具
  TOOL_STARTED: "tool.started",
  // 工具执行过程中的增量进度或部分结果
  TOOL_UPDATED: "tool.updated",
  // 工具执行成功并返回最终结果
  TOOL_COMPLETED: "tool.completed",
  // 工具执行结束，但结果是错误
  TOOL_FAILED: "tool.failed",
  // 工具调用被跳过，没有实际执行
  TOOL_SKIPPED: "tool.skipped",
  /**
   * Approval 审批事件
   */
  // 工具执行前请求用户批准
  APPROVAL_REQUESTED: "approval.requested",
  // 用户已经批准或拒绝审批
  APPROVAL_RESOLVED: "approval.resolved",
  /**
   * Input人工输入事件
   * 和 Approval 的区别：
   *  - approval：问“是否允许执行这个操作？”
      - input：问“这个任务需要你补充什么信息？”
   */
  // Agent 提出问题，等待用户回答
  INPUT_REQUESTED: "input.requested",
  // 用户已经提交回答
  INPUT_RESOLVED: "input.resolved",
  // 等待超时，这次输入请求失效
  INPUT_EXPIRED: "input.expired",
  /**
   * File文件变化事件
   */
  // 工具成功修改、创建或删除了文件
  FILE_CHANGED: "file.changed",
  /**
   * Plan计划事件
   */
  // Agent 的执行计划发生变化
  PLAN_UPDATED: "plan.updated",
  /**
   * Todo 任务项事件
   * 和 Plan 的区别：
   *  - plan：规划执行阶段
   *  - todo：具体可跟踪任务
   */
  // 某个具体 Todo 被新增或更新
  TODO_UPDATED: "todo.updated",
  /**
   * Context 上下文事件
   */
  // 每次模型请求发送前的上下文用量快照，只保存分类 Token 估算值
  CONTEXT_USAGE_SNAPSHOT: "context.usage_snapshot",
  // Runtime 开始自动压缩历史上下文
  CONTEXT_COMPACTION_STARTED: "context.compaction_started",
  // 为避免超过模型上下文窗口，历史上下文被裁剪或摘要压缩
  CONTEXT_COMPACTED: "context.compacted",
  // 当前工作 checkpoint 回退到历史版本；原始消息不变
  CONTEXT_CHECKPOINT_RESTORED: "context.checkpoint_restored",
  // 新任务替换旧任务时清空 Plan/Todos；Session 历史和 checkpoint 不变
  CONTEXT_WORKING_STATE_RESET: "context.working_state_reset",
} as const;

export type HarnessEventType = (typeof HarnessEventType)[keyof typeof HarnessEventType];

// 消息的增量chunk片段类型
export const MessageDeltaKind = {
  // 文字类型
  TEXT: "text",
  // 思考类型
  THINKING: "thinking",
  // 工具调用类型
  TOOL_CALL: "tool_call",
} as const;

export type MessageDeltaKind = (typeof MessageDeltaKind)[keyof typeof MessageDeltaKind];

/**
 * 事件核心：HarnessEvent 和 HarnessEventDraft
 * 执行过程：
 * Pi 原始事件
    → event-adapter 翻译业务含义（Pi 的 message_update → PI Harness 的 message.delta）
    → HarnessEventDraft
    → RunCoordinator 添加运行上下文
    → HarnessEvent
    → daemon 持久化并通过 SSE 发送
 */

export interface HarnessEventDraft<TData = unknown> {
  // pi harness 事件类型
  type: HarnessEventType;
  // 事件具体的内容·
  data: TData;
}

// 在 Draft 外面增加了一层完整的事件，确保runtime和deamon/web的一致结构
export interface HarnessEvent<TData = unknown> {
  type: HarnessEventType;
  data: TData;
  // 一条事件本身的唯一标识，标识的是“事件”，不是 Session 或 Run
  // 主要用于：sse的id字段、客户端重连时通过 Last-Event-ID 告诉 daemon 最后收到哪条事件
  id: string;
  // 会话id
  // 用于：找到对应的 <sessionId>.jsonl，一个session可以包含多个run
  sessionId: SessionId;
  // 说明事件属于 Session 中的哪一次运行，可选，例如：模型改变、标题改变等不属于某个run
  runId?: RunId;
  // 表示该事件在当前 Session 中的顺序号
  // 主要解决：sse到达顺序或重复问题（重复就忽略）、断线重连（从指定位置恢复）
  seq: number;
  // 事件发生时间（log记录、判断审批或输入是否超时）
  timestamp: number;
}

/**
 * 下面的都是data字段的类型，提供 HarnessEvent<TData> 的TData
 */
// 对应 run.started 事件
export interface RunToolDefinition {
  description: string;
  name: string;
  parameters: unknown;
}

export interface RunContextData {
  content: string;
  label: string;
  type: string;
}

export interface RunContextUsageData extends Omit<RunContextData, "content"> {
  tokens: number;
}

export interface RunStartedData {
  // 首次记录全部 Context；后续仅包含按 type 新增或变化的条目。
  contexts?: RunContextData[];
  maxTokens: number;
  modelId: string;
  providerId: string;
  // 与 contexts 同时出现；空数组表示本次只有新增或更新，没有移除。
  removedContextTypes?: string[];
  // System Prompt 与 Tools 作为同一快照，仅在首次记录或任一内容变化时同时出现。
  systemPrompt?: string;
  thinkingLevel: ModelThinkingLevel;
  tools?: RunToolDefinition[];
}

// context.usage_snapshot：一次模型请求前的完整 Session Context 用量，不是单轮消息用量
export interface ContextUsageSnapshotData {
  conversationTokens: number;
  contexts: RunContextUsageData[];
  estimatedTotalTokens: number;
  requestIndex: number;
  systemPromptTokens: number;
  toolTokens: number;
}

// 上下文压缩后的结构化数据
export interface ContextCheckpoint {
  blockers: string[]; // 当前阻止任务继续的具体问题。没有阻塞时就是空数组。
  completed: string[]; // 已经实际完成的事项。不能记录尚未验证的计划。
  constraints: string[]; // 后续工作必须持续遵守的限制
  decisions: string[]; // 已经确定的技术选择，避免压缩后重复讨论或改回旧方案。
  nextAction: string; // 恢复工作后应该立即执行的下一步，只保留一个最明确的动作。
  objective: string; // 当前任务最终要完成什么
  pending: string[]; // 还需要完成的事项，但不一定立即执行。
}

// 触发这次上下文压缩的原因
export const ContextCompactionReason = {
  MILESTONE: "milestone", // 普通压缩（80%）
  THRESHOLD: "threshold", // 里程碑压缩（60%）
} as const;

export type ContextCompactionReason =
  (typeof ContextCompactionReason)[keyof typeof ContextCompactionReason];

// checkpoint 生成方式
export const ContextCompactionStrategy = {
  FALLBACK: "fallback", // AI 调用失败、超时、中止，或者返回内容格式不正确，改用本地代码生成保底 checkpoint
  MODEL: "model", // 成功调用 AI，并且返回内容能解析成合法的 ContextCheckpoint
} as const;

export type ContextCompactionStrategy =
  (typeof ContextCompactionStrategy)[keyof typeof ContextCompactionStrategy];

// context.compacted：随 Session 持久化的工作状态 checkpoint，不替代原始消息
// 一次上下文压缩产生的完整记录
export interface ContextCompactedData {
  afterTokens: number; // 使用 checkpoint 替换旧历史后，预计发送给主模型的 Token 数
  beforeTokens: number; // 压缩前预计发送给主模型的上下文 Token 数，包含 System Prompt、Tools 和消息
  checkpoint: ContextCheckpoint; // 本次压缩得到的结构化工作记忆
  compactionId?: string;
  compactionReason?: ContextCompactionReason; // 触发压缩的原因
  compactionStrategy?: ContextCompactionStrategy; // checkpoint生成方式
  compactedMessageCount: number; // 本次被压缩的原始消息数量
  compactionUsage?: Usage; // 生成 checkpoint 的独立 AI 请求所消耗的 Token 和费用
  coveredMessageRange?: { end: number; start: number }; // 本次压缩覆盖的原始消息下标范围
  previousCompactionId?: string; // 上一个 checkpoint 的 ID，用于建立版本链和回退
  sourceMessageCount: number; // 生成该 checkpoint 时，已经处理到的原始消息边界
}

export interface ContextCheckpointRecord {
  data: ContextCompactedData;
  eventSeq: number;
}

export interface ContextCheckpointRestoredData {
  sourceEventSeq: number;
}

export interface ContextWorkingStateResetData {
  reason: string;
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function isUsage(value: unknown): value is Usage {
  if (!isPlainObject(value) || !isPlainObject(value.cost)) return false;
  const fields = [
    value.input,
    value.output,
    value.cacheRead,
    value.cacheWrite,
    value.totalTokens,
    value.cost.input,
    value.cost.output,
    value.cost.cacheRead,
    value.cost.cacheWrite,
    value.cost.total,
  ];
  return (
    fields.every((field) => typeof field === "number" && Number.isFinite(field) && field >= 0) &&
    (value.reasoning === undefined ||
      (typeof value.reasoning === "number" && Number.isFinite(value.reasoning)))
  );
}

function isCoveredMessageRange(
  value: unknown,
  sourceMessageCount: number,
  compactedMessageCount: number,
): boolean {
  return (
    isPlainObject(value) &&
    Number.isInteger(value.start) &&
    Number.isInteger(value.end) &&
    value.start >= 0 &&
    value.end > value.start &&
    value.end === sourceMessageCount &&
    value.end - value.start === compactedMessageCount
  );
}

export function isContextCompactedData(value: unknown): value is ContextCompactedData {
  if (!isPlainObject(value) || !isPlainObject(value.checkpoint)) return false;
  const checkpoint = value.checkpoint;
  return (
    Number.isInteger(value.afterTokens) &&
    Number.isInteger(value.beforeTokens) &&
    Number.isInteger(value.compactedMessageCount) &&
    Number.isInteger(value.sourceMessageCount) &&
    value.afterTokens >= 0 &&
    value.beforeTokens >= 0 &&
    value.compactedMessageCount > 0 &&
    value.sourceMessageCount > 0 &&
    typeof checkpoint.objective === "string" &&
    typeof checkpoint.nextAction === "string" &&
    isStringArray(checkpoint.constraints) &&
    isStringArray(checkpoint.decisions) &&
    isStringArray(checkpoint.completed) &&
    isStringArray(checkpoint.pending) &&
    isStringArray(checkpoint.blockers) &&
    (value.compactionId === undefined || typeof value.compactionId === "string") &&
    (value.previousCompactionId === undefined || typeof value.previousCompactionId === "string") &&
    (value.compactionReason === undefined ||
      Object.values(ContextCompactionReason).includes(
        value.compactionReason as ContextCompactionReason,
      )) &&
    (value.compactionStrategy === undefined ||
      Object.values(ContextCompactionStrategy).includes(
        value.compactionStrategy as ContextCompactionStrategy,
      )) &&
    (value.coveredMessageRange === undefined ||
      isCoveredMessageRange(
        value.coveredMessageRange,
        value.sourceMessageCount,
        value.compactedMessageCount,
      )) &&
    (value.compactionUsage === undefined || isUsage(value.compactionUsage))
  );
}

export function isContextCheckpointRestoredData(
  value: unknown,
): value is ContextCheckpointRestoredData {
  return isPlainObject(value) && Number.isInteger(value.sourceEventSeq) && value.sourceEventSeq > 0;
}

export function isContextWorkingStateResetData(
  value: unknown,
): value is ContextWorkingStateResetData {
  return (
    isPlainObject(value) &&
    typeof value.reason === "string" &&
    value.reason.length > 0 &&
    value.reason.length <= 1_000
  );
}

// run.failed / run.aborted
export interface RunFailureData {
  code: string;
  message: string;
}

// 一次run因交互而暂停或恢复时，携带的数据
export interface RunInteractionData {
  // 用于关联“等待审批”和“审批完成“事件
  interactionId: string;
  // 交互类型，表示是工具审批
  kind: "tool_approval";
}

// message.delta
export interface MessageDeltaData {
  contentIndex: number;
  delta: string;
  kind: MessageDeltaKind;
}

export interface MessageBranchStartedData {
  sourceEventId: string;
}

export function isMessageBranchStartedData(value: unknown): value is MessageBranchStartedData {
  return (
    isPlainObject(value) &&
    typeof value.sourceEventId === "string" &&
    value.sourceEventId.length > 0
  );
}

/** 按 branch 事件折叠为当前有效事件流；JSONL 原始事实保持不变。 */
export function selectActiveSessionEvents(events: readonly HarnessEvent[]): HarnessEvent[] {
  const active: HarnessEvent[] = [];
  for (const event of events) {
    if (event.type === HarnessEventType.MESSAGE_BRANCH_STARTED) {
      if (!isMessageBranchStartedData(event.data))
        throw new Error("Session message branch is invalid");
      const { sourceEventId } = event.data;
      const sourceIndex = active.findIndex((item) => item.id === sourceEventId);
      const source = active[sourceIndex];
      if (
        sourceIndex < 0 ||
        source?.type !== HarnessEventType.MESSAGE_COMPLETED ||
        !isPlainObject(source.data) ||
        source.data.role !== "user"
      ) {
        throw new Error("Session message branch target is invalid");
      }
      active.splice(sourceIndex);
    }
    active.push(event);
  }
  return active;
}

// message.started / message.completed -> AgentMessage

// tool.started
export interface ToolStartedData {
  arguments: unknown;
  toolCallId: string;
  toolName: string;
}

// tool.updated
export interface ToolUpdatedData extends ToolStartedData {
  partialResult: unknown;
}

// tool.completed / tool.failed
export interface ToolCompletedData {
  isError: boolean;
  result: unknown;
  toolCallId: string;
  toolName: string;
}

/**
 * 审批流程：
 *  ApprovalRequestedData
            ↓ 用户批准
    ApprovalResolvedData
            ↓ 工具修改文件
    FileChangedData
 */
// 工具执行前，需要用户审批时发送
export interface ApprovalRequestedData {
  // 本次审批唯一id
  approvalId: string;
  // 审批过期时间
  expiresAt: number;
  // 风险说明，例如命令可能修改本地文件（packages/policy/src/tool-policy.ts中声明提示信息）
  risk: string;
  // 本次操作的简要描述，供审批界面展示
  summary: string;
  // 操作目标，例如文件路径或命令目标
  target: string;
  // 模型每次调用工具时产生的唯一标识，用来追踪“这一次具体的工具调用”
  toolCallId: string;
  // 调用工具名称
  toolName: string;
}

// 审批得到结果后发送
export interface ApprovalResolvedData {
  approvalId: string;
  // 审批结果，即 "approved"、"rejected" 或 "expired"
  decision: ApprovalDecision;
  toolCallId: string;
  toolName: string;
}

// 文件被工具成功修改后发送
export interface FileChangedData {
  // 修改前的完整文件内容；新建文件时为 null
  before: string | null;
  // 修改后的完整文件内容；文件被删除时为空字符串
  after: string;
  // 修改前后的差异文本，供 Diff 面板展示
  diff: string;
  // 被修改文件的路径
  path: string;
  toolCallId: string;
  toolName: string;
}

export type MessageHarnessEvent = HarnessEvent<AgentMessage>;
