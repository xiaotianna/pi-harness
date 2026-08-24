import type { AgentMessage } from "@earendil-works/pi-agent-core";

export type SessionId = string;
export type RunId = string;

export const HarnessEventType = {
  APPROVAL_REQUESTED: "approval.requested",
  APPROVAL_RESOLVED: "approval.resolved",
  CONTEXT_COMPACTED: "context.compacted",
  FILE_CHANGED: "file.changed",
  INPUT_EXPIRED: "input.expired",
  INPUT_REQUESTED: "input.requested",
  INPUT_RESOLVED: "input.resolved",
  MESSAGE_COMPLETED: "message.completed",
  MESSAGE_DELTA: "message.delta",
  MESSAGE_STARTED: "message.started",
  PLAN_UPDATED: "plan.updated",
  RUN_ABORTED: "run.aborted",
  RUN_AWAITING_INPUT: "run.awaiting_input",
  RUN_COMPLETED: "run.completed",
  RUN_FAILED: "run.failed",
  RUN_RESUMED: "run.resumed",
  RUN_STARTED: "run.started",
  TODO_UPDATED: "todo.updated",
  TOOL_COMPLETED: "tool.completed",
  TOOL_FAILED: "tool.failed",
  TOOL_SKIPPED: "tool.skipped",
  TOOL_STARTED: "tool.started",
  TOOL_UPDATED: "tool.updated",
} as const;

export type HarnessEventType = (typeof HarnessEventType)[keyof typeof HarnessEventType];

export const MessageDeltaKind = {
  TEXT: "text",
  THINKING: "thinking",
  TOOL_CALL: "tool_call",
} as const;

export type MessageDeltaKind = (typeof MessageDeltaKind)[keyof typeof MessageDeltaKind];

export interface HarnessEvent<TData = unknown> {
  data: TData;
  id: string;
  runId?: RunId;
  seq: number;
  sessionId: SessionId;
  timestamp: number;
  type: HarnessEventType;
}

export interface HarnessEventDraft<TData = unknown> {
  data: TData;
  type: HarnessEventType;
}

export interface RunStartedData {
  modelId: string;
  providerId: string;
}

export interface RunFailureData {
  code: string;
  message: string;
}

export interface MessageDeltaData {
  contentIndex: number;
  delta: string;
  kind: MessageDeltaKind;
}

export interface ToolStartedData {
  arguments: unknown;
  toolCallId: string;
  toolName: string;
}

export interface ToolUpdatedData extends ToolStartedData {
  partialResult: unknown;
}

export interface ToolCompletedData {
  isError: boolean;
  result: unknown;
  toolCallId: string;
  toolName: string;
}

export type MessageHarnessEvent = HarnessEvent<AgentMessage>;
