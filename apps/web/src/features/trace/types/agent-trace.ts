export const AgentTraceLane = {
  INPUT: "input",
  MODEL: "model",
  TOOLS: "tools",
} as const;

export type AgentTraceLane = (typeof AgentTraceLane)[keyof typeof AgentTraceLane];

export const AgentTraceRecordKind = {
  ASSISTANT: "assistant",
  CONTEXT: "context",
  SYSTEM: "system",
  TOOL: "tool",
  USER: "user",
} as const;

export type AgentTraceRecordKind = (typeof AgentTraceRecordKind)[keyof typeof AgentTraceRecordKind];

export const AgentTraceStatus = {
  COMPLETED: "completed",
  FAILED: "failed",
  RUNNING: "running",
} as const;

export type AgentTraceStatus = (typeof AgentTraceStatus)[keyof typeof AgentTraceStatus];

export interface AgentTraceRecord {
  durationMs: number;
  id: string;
  kind: AgentTraceRecordKind;
  label: string;
  lane: AgentTraceLane;
  preview: string;
  raw: Readonly<Record<string, unknown>>;
  source: string;
  startMs: number;
  status: AgentTraceStatus;
  summary: string;
  turn: number;
}

export interface AgentTraceSession {
  durationMs: number;
  model: string;
  records: readonly AgentTraceRecord[];
}

export interface AgentTraceRange {
  endMs: number;
  startMs: number;
}
