import { type AgentTraceRecord, AgentTraceRecordKind } from "../types/agent-trace";

export function getTraceEventRowText(record: AgentTraceRecord): string {
  return record.kind === AgentTraceRecordKind.TOOL ? record.label : record.preview;
}
