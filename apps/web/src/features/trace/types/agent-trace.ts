export const AgentTraceLane = {
  INPUT: "input",
  MODEL: "model",
  TOOLS: "tools",
} as const;

export type AgentTraceLane = (typeof AgentTraceLane)[keyof typeof AgentTraceLane];

export const AgentTraceRecordKind = {
  APPROVAL: "approval",
  ASSISTANT: "assistant",
  CONTEXT: "context",
  RUN: "run",
  SYSTEM: "system",
  TOOL: "tool",
  USER: "user",
} as const;

export type AgentTraceRecordKind = (typeof AgentTraceRecordKind)[keyof typeof AgentTraceRecordKind];

export const AgentTraceStatus = {
  ABORTED: "aborted",
  COMPLETED: "completed",
  FAILED: "failed",
  RUNNING: "running",
} as const;

export type AgentTraceStatus = (typeof AgentTraceStatus)[keyof typeof AgentTraceStatus];

export interface AgentTraceTokenUsage {
  cacheRead: number;
  cacheWrite: number;
  input: number;
  output: number;
  reasoning: number;
  total: number;
}

export interface AgentTraceToolDefinition {
  description: string;
  name: string;
  parameters: unknown;
}

export interface AgentTraceSystemPrompt {
  content: string;
  tools: readonly AgentTraceToolDefinition[];
}

export interface AgentTraceRecord {
  cumulativeTokenUsage?: AgentTraceTokenUsage;
  durationMs: number;
  errorCode?: string;
  id: string;
  kind: AgentTraceRecordKind;
  label: string;
  lane: AgentTraceLane;
  preview: string;
  raw: Readonly<Record<string, unknown>>;
  request?: number;
  source: string;
  startMs: number;
  status: AgentTraceStatus;
  summary: string;
  systemPrompt?: AgentTraceSystemPrompt;
  tokenUsage?: AgentTraceTokenUsage;
  turn: number;
}

export interface AgentTraceSession {
  durationMs: number;
  errorCode?: string;
  model: string;
  records: readonly AgentTraceRecord[];
  startedAt: number;
  status: AgentTraceStatus;
  tokenUsage: AgentTraceTokenUsage;
  traceId: string;
}

export interface AgentTraceRange {
  endMs: number;
  startMs: number;
}
