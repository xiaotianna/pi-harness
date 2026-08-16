import type { AgentTraceRange } from "../types/agent-trace";

export function isTraceRecordInRange(
  startMs: number,
  durationMs: number,
  range: AgentTraceRange | null,
): boolean {
  if (range === null) return true;

  return startMs <= range.endMs && startMs + durationMs >= range.startMs;
}
