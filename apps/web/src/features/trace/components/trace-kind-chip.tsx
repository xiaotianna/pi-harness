import { Chip } from "@heroui/react";
import {
  AGENT_TRACE_KIND_LABELS,
  AGENT_TRACE_KIND_STYLES,
  AGENT_TRACE_RUN_STATUS_CHIP_CLASS_NAMES,
} from "../constants/agent-trace";
import {
  type AgentTraceRecordKind,
  AgentTraceRecordKind as AgentTraceRecordKindValue,
  type AgentTraceStatus,
} from "../types/agent-trace";

export function TraceKindChip({
  kind,
  status,
}: {
  kind: AgentTraceRecordKind;
  status: AgentTraceStatus;
}) {
  return (
    <Chip
      className={
        kind === AgentTraceRecordKindValue.RUN
          ? AGENT_TRACE_RUN_STATUS_CHIP_CLASS_NAMES[status]
          : AGENT_TRACE_KIND_STYLES[kind].chipClassName
      }
      size="sm"
      variant="soft"
    >
      {AGENT_TRACE_KIND_LABELS[kind]}
    </Chip>
  );
}
