import { ErrorState } from "../../../../components/ai/error-state";
import { AGENT_TRACE_DETAIL_STATUS_LABELS } from "../../constants/agent-trace";
import { type AgentTraceRecord, AgentTraceStatus } from "../../types/agent-trace";
import { TraceDetailCode, TraceDetailMarkdown } from "./trace-detail-content";

export function RunTraceDetails({ record }: { record: AgentTraceRecord }) {
  const message = typeof record.raw.message === "string" ? record.raw.message : record.summary;

  return (
    <div className="min-h-0 flex-1 overflow-auto px-4 py-3">
      {record.status === AgentTraceStatus.FAILED ? (
        <ErrorState
          detail={message}
          title={record.source.startsWith("subagent.") ? "子 Agent 失败" : "回复生成失败"}
        />
      ) : record.source === "subagent.completed" ? (
        <TraceDetailMarkdown>{message}</TraceDetailMarkdown>
      ) : (
        <p className="text-[13px] leading-5 text-foreground">{message}</p>
      )}

      <dl className="mt-4 grid grid-cols-[5rem_minmax(0,1fr)] gap-y-1 text-[13px] leading-5">
        <dt className="text-muted">Status</dt>
        <dd>{AGENT_TRACE_DETAIL_STATUS_LABELS[record.status]}</dd>
        {record.errorCode ? (
          <>
            <dt className="text-muted">Code</dt>
            <dd className="font-mono [overflow-wrap:anywhere]">{record.errorCode}</dd>
          </>
        ) : null}
        <dt className="text-muted">Source</dt>
        <dd className="font-mono [overflow-wrap:anywhere]">{record.source}</dd>
      </dl>
      {record.raw.terminal !== undefined ? (
        <div className="mt-4">
          <TraceDetailCode
            ariaLabel="复制子 Agent 结束事件"
            code={record.raw.terminal}
            name="结束事件"
          />
        </div>
      ) : null}
    </div>
  );
}
