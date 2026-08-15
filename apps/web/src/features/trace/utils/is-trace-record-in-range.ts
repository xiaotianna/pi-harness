import type { AgentTraceRange } from "../types/agent-trace";

export function isTraceRecordInRange(
  startMs: number,
  durationMs: number,
  range: AgentTraceRange,
): boolean {
  return startMs <= range.endMs && startMs + durationMs >= range.startMs;
}
