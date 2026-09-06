import type { AgentTraceRange } from "../types/agent-trace";

export function isTraceRecordInRange(index: number, range: AgentTraceRange | null): boolean {
  if (range === null) return true;

  return index >= range.startIndex && index <= range.endIndex;
}
