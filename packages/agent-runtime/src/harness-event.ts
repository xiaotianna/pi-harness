import type { AgentMessage } from "@earendil-works/pi-agent-core";

export type SessionId = string;
export type RunId = string;

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

// run.failed / run.aborted
export interface RunFailureData {
  code: string;
  message: string;
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

export type MessageHarnessEvent = HarnessEvent<AgentMessage>;
