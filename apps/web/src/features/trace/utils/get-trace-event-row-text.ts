import { type AgentTraceRecord, AgentTraceRecordKind } from "../types/agent-trace";

export function getTraceEventRowText(record: AgentTraceRecord): string {
  if (record.kind === AgentTraceRecordKind.TOOL || record.kind === AgentTraceRecordKind.APPROVAL) {
    return record.label;
  }
  return record.kind === AgentTraceRecordKind.USER || record.kind === AgentTraceRecordKind.SYSTEM
    ? `${record.label} · ${record.preview}`
    : record.preview;
}
