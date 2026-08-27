import type { AgentMessage } from "@earendil-works/pi-agent-core";

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
  // 为避免超过模型上下文窗口，历史上下文被裁剪或摘要压缩
  CONTEXT_COMPACTED: "context.compacted",
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
export interface RunStartedData {
  providerId: string;
  modelId: string;
}

// context.usage_snapshot
export interface ContextUsageSnapshotData {
  conversationTokens: number;
  estimatedTotalTokens: number;
  requestIndex: number;
  systemPromptTokens: number;
  toolTokens: number;
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
