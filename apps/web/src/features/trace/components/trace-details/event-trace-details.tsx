import type { AgentTraceRecord } from "../../types/agent-trace";
import { TraceDetailCode } from "./trace-detail-content";

export function EventTraceDetails({ record }: { record: AgentTraceRecord }) {
  return (
    <div className="min-h-0 flex-1 overflow-auto px-4 py-3">
      <p className="mb-3 text-[13px] text-muted">{record.source}</p>
      <TraceDetailCode
        ariaLabel={`复制 ${record.label} 原始事件`}
        code={record.raw.data}
        isHeaderHidden
        name={record.label}
      />
    </div>
  );
}
