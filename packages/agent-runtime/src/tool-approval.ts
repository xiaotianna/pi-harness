import type { ApprovalDecision, ApprovalRequestedData, RunId, SessionId } from "./harness-event.js";

// Runtime 发起审批时提供的数据
export interface ToolApprovalRequest extends Omit<ApprovalRequestedData, "expiresAt"> {
  runId: RunId;
  sessionId: SessionId;
}

/**
 * 表示审批创建后返回的控制句柄：
 *  - result：等待批准、拒绝或超时的 Promise。
    - expiresAt：审批过期时间。
    - cancel()：Run 取消或发生错误时取消等待。
 */
export interface ToolApprovalHandle {
  // 等待批准、拒绝或超时的 Promise，用于将状态挂起
  result: Promise<ApprovalDecision>;
  expiresAt: number;
  // Run 取消或发生错误时取消等待
  cancel(): void;
}

// 定义发起审批的函数类型
export type ToolApprovalRequester = (
  request: ToolApprovalRequest,
  signal?: AbortSignal,
) => ToolApprovalHandle;
