import { type AgentTraceRecord, AgentTraceRecordKind } from "../types/agent-trace";

export function getTraceEventRowText(record: AgentTraceRecord): string {
  if (record.kind === AgentTraceRecordKind.TOOL || record.kind === AgentTraceRecordKind.APPROVAL) {
    return record.label;
  }
  if (record.kind === AgentTraceRecordKind.SYSTEM) return record.label;
  if (record.kind === AgentTraceRecordKind.RUN) {
    return record.preview === record.label ? record.label : `${record.label} · ${record.preview}`;
  }
  return record.kind === AgentTraceRecordKind.USER
    ? `${record.label} · ${record.preview}`
    : record.preview;
}
