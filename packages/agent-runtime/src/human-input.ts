import type {
  RequestUserInputData,
  UserInputSubmission,
  UserInputToolResult,
} from "@pi-harness/tools";
import type { InputRequestedData, RunId, SessionId } from "./harness-event.js";

// 该文件定义的是 runtime 和 daemon 之间“请求用户回答”的接口约定

// 要向用户询问什么
export interface HumanInputRequest extends RequestUserInputData {
  inputId: string; // 本次提问的唯一 ID
  runId: RunId; // 哪一次执行发起的
  sessionId: SessionId; // 属于哪个会话
}

// 发起提问后，如何等待和取消
export interface HumanInputHandle {
  cancel: (reason?: unknown) => void;
  expiresAt: number;
  request: InputRequestedData; // 供 runtime 发出 input.requested 事件的数据
  result: Promise<UserInputToolResult>; // 用户回答后完成的 Promise，runtime 会 await 它
}

export type HumanInputRequester = (
  request: HumanInputRequest,
  signal?: AbortSignal,
) => HumanInputHandle;

export type HumanInputResolver = (
  sessionId: SessionId,
  runId: RunId,
  inputId: string,
  submission: UserInputSubmission,
) => void;
