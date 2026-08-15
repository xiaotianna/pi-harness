import { AgentTraceLane, AgentTraceRecordKind, AgentTraceStatus } from "../types/agent-trace";

export const AGENT_TRACE_LANE_LABELS = {
  [AgentTraceLane.INPUT]: "输入",
  [AgentTraceLane.MODEL]: "模型",
  [AgentTraceLane.TOOLS]: "工具",
} as const;

export const AGENT_TRACE_KIND_LABELS = {
  [AgentTraceRecordKind.ASSISTANT]: "助手",
  [AgentTraceRecordKind.CONTEXT]: "上下文",
  [AgentTraceRecordKind.REASONING]: "推理",
  [AgentTraceRecordKind.SYSTEM]: "系统",
  [AgentTraceRecordKind.TOOL_CALL]: "工具调用",
  [AgentTraceRecordKind.TOOL_RESULT]: "工具结果",
  [AgentTraceRecordKind.USER]: "用户",
} as const;

export const AGENT_TRACE_KIND_COLORS = {
  [AgentTraceRecordKind.ASSISTANT]: "accent",
  [AgentTraceRecordKind.CONTEXT]: "success",
  [AgentTraceRecordKind.REASONING]: "accent",
  [AgentTraceRecordKind.SYSTEM]: "default",
  [AgentTraceRecordKind.TOOL_CALL]: "warning",
  [AgentTraceRecordKind.TOOL_RESULT]: "warning",
  [AgentTraceRecordKind.USER]: "accent",
} as const;

export const AGENT_TRACE_TIMELINE_CLASS_NAMES = {
  [AgentTraceRecordKind.ASSISTANT]: "bg-accent/65",
  [AgentTraceRecordKind.CONTEXT]: "bg-success/65",
  [AgentTraceRecordKind.REASONING]: "bg-accent",
  [AgentTraceRecordKind.SYSTEM]: "bg-muted/70",
  [AgentTraceRecordKind.TOOL_CALL]: "bg-warning",
  [AgentTraceRecordKind.TOOL_RESULT]: "bg-warning/55",
  [AgentTraceRecordKind.USER]: "bg-accent/75",
} as const;

export const AGENT_TRACE_STATUS_LABELS = {
  [AgentTraceStatus.COMPLETED]: "已完成",
  [AgentTraceStatus.FAILED]: "失败",
  [AgentTraceStatus.RUNNING]: "运行中",
} as const;

export const AGENT_TRACE_STATUS_COLORS = {
  [AgentTraceStatus.COMPLETED]: "success",
  [AgentTraceStatus.FAILED]: "danger",
  [AgentTraceStatus.RUNNING]: "accent",
} as const;
