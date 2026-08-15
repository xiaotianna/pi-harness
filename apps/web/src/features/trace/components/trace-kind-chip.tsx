import { Chip } from "@heroui/react";
import { AGENT_TRACE_KIND_LABELS, AGENT_TRACE_KIND_STYLES } from "../constants/agent-trace";
import type { AgentTraceRecordKind } from "../types/agent-trace";

export function TraceKindChip({ kind }: { kind: AgentTraceRecordKind }) {
  return (
    <Chip className={AGENT_TRACE_KIND_STYLES[kind].chipClassName} size="sm" variant="soft">
      {AGENT_TRACE_KIND_LABELS[kind]}
    </Chip>
  );
}
