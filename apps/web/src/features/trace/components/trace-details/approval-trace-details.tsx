"use client";

import { ChevronRight } from "@gravity-ui/icons";
import { Link, Tabs } from "@heroui/react";
import { ApprovalDecision } from "@pi-harness/agent-runtime/harness-event";
import { isPlainObject } from "es-toolkit";
import { useState } from "react";
import { AGENT_TRACE_DETAIL_STATUS_LABELS } from "../../constants/agent-trace";
import type { AgentTraceRecord } from "../../types/agent-trace";
import { formatTraceDuration, formatTraceTimestamp } from "../../utils/format-trace-duration";
import { TraceDetailCode } from "./trace-detail-content";

const APPROVAL_TABS = [
  ["summary", "Summary"],
  ["request", "Request"],
  ["result", "Result"],
  ["timing", "Timing"],
  ["raw", "Raw"],
] as const;

function readString(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function readTimestamp(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function decisionLabel(decision: string | null): string {
  if (decision === ApprovalDecision.APPROVED) return "Approved";
  if (decision === ApprovalDecision.REJECTED) return "Rejected";
  if (decision === ApprovalDecision.EXPIRED) return "Expired";
  return decision ?? "Pending";
}

function decisionDescription(decision: string | null): string {
  if (decision === ApprovalDecision.APPROVED) {
    return "审批已通过；工具仍需通过执行前校验，实际执行结果以对应 Tool 轨迹为准。";
  }
  if (decision === ApprovalDecision.REJECTED) return "用户已拒绝，本次工具调用不会继续执行。";
  if (decision === ApprovalDecision.EXPIRED) return "审批等待已超时，本次工具调用不会继续执行。";
  return "正在等待用户处理，工具尚未继续执行。";
}

function ApprovalTiming({ record }: { record: AgentTraceRecord }) {
  const request = isPlainObject(record.raw.request) ? record.raw.request : {};
  const requestedAt = readTimestamp(record.raw.requestedAt);
  const resolvedAt = readTimestamp(record.raw.resolvedAt);
  const expiresAt = readTimestamp(request.expiresAt);

  return (
    <dl className="grid grid-cols-[6rem_minmax(0,1fr)] gap-y-1 text-[13px] leading-5">
      <dt className="text-muted">Requested</dt>
      <dd className="tabular-nums">{formatTraceTimestamp(requestedAt)}</dd>
      <dt className="text-muted">Resolved</dt>
      <dd className="tabular-nums">{formatTraceTimestamp(resolvedAt)}</dd>
      <dt className="text-muted">Expires</dt>
      <dd className="tabular-nums">{formatTraceTimestamp(expiresAt)}</dd>
      <dt className="text-muted">Wait duration</dt>
      <dd className="tabular-nums">{formatTraceDuration(record.durationMs)}</dd>
      <dt className="text-muted">Timing source</dt>
      <dd>Session timestamps</dd>
    </dl>
  );
}

export function ApprovalTraceDetails({
  record,
  onOpenToolCall,
}: {
  record: AgentTraceRecord;
  onOpenToolCall: (toolCallId: string) => void;
}) {
  const [selectedTab, setSelectedTab] = useState("summary");
  const request = isPlainObject(record.raw.request) ? record.raw.request : {};
  const resolution = isPlainObject(record.raw.resolution) ? record.raw.resolution : null;
  const approvalId = readString(record.raw.approvalId) ?? readString(request.approvalId);
  const toolCallId = readString(record.raw.toolCallId) ?? readString(request.toolCallId);
  const toolName = readString(record.raw.toolName) ?? readString(request.toolName) ?? "未记录";
  const decision = readString(record.raw.decision) ?? readString(resolution?.decision) ?? null;
  const target = readString(request.target) ?? "未记录";
  const requestSummary = readString(request.summary) ?? "未记录";
  const risk = readString(request.risk) ?? "未记录";

  return (
    <Tabs
      className="flex min-h-0 flex-1 flex-col gap-0!"
      selectedKey={selectedTab}
      variant="secondary"
      onSelectionChange={(key) => setSelectedTab(String(key))}
    >
      <Tabs.ListContainer className="w-full shrink-0 px-2">
        <Tabs.List aria-label="审批轨迹详情分类">
          {APPROVAL_TABS.map(([id, label]) => (
            <Tabs.Tab className="w-auto! flex-none px-3 text-xs" id={id} key={id}>
              {label}
              <Tabs.Indicator />
            </Tabs.Tab>
          ))}
        </Tabs.List>
      </Tabs.ListContainer>

      <Tabs.Panel className="mt-0! min-h-0 flex-1 overflow-auto px-4 py-3" id="summary">
        <dl className="grid grid-cols-[6rem_minmax(0,1fr)] gap-y-1 text-[13px] leading-5">
          <dt className="text-muted">Hierarchy</dt>
          <dd>
            {toolCallId ? (
              <Link
                className="gap-0 text-[13px] font-normal text-foreground"
                onPress={() => onOpenToolCall(toolCallId)}
              >
                Tool Call · {toolName}
                <ChevronRight aria-hidden className="size-3 text-muted" />
              </Link>
            ) : (
              "未记录"
            )}
          </dd>
          <dt className="text-muted">Status</dt>
          <dd>{AGENT_TRACE_DETAIL_STATUS_LABELS[record.status]}</dd>
          <dt className="text-muted">Decision</dt>
          <dd>{decisionLabel(decision)}</dd>
          <dt className="text-muted">Approval ID</dt>
          <dd className="break-all font-mono text-[12px]">{approvalId ?? "未记录"}</dd>
        </dl>

        <section className="mt-4">
          <Link
            className="mb-1 gap-0 text-[13px] font-medium text-foreground"
            onPress={() => setSelectedTab("request")}
          >
            Request
            <ChevronRight aria-hidden className="size-3.5 text-muted" />
          </Link>
          <dl className="grid grid-cols-[6rem_minmax(0,1fr)] gap-y-1 text-[13px] leading-5">
            <dt className="text-muted">Tool</dt>
            <dd>{toolName}</dd>
            <dt className="text-muted">Target</dt>
            <dd className="break-all font-mono text-[12px]">{target}</dd>
            <dt className="text-muted">Summary</dt>
            <dd className="whitespace-pre-wrap">{requestSummary}</dd>
            <dt className="text-muted">Risk</dt>
            <dd className="whitespace-pre-wrap">{risk}</dd>
          </dl>
        </section>

        <section className="mt-4">
          <Link
            className="mb-1 gap-0 text-[13px] font-medium text-foreground"
            onPress={() => setSelectedTab("result")}
          >
            Result
            <ChevronRight aria-hidden className="size-3.5 text-muted" />
          </Link>
          <p className="whitespace-pre-wrap text-[13px] leading-5 text-muted">
            {decisionDescription(decision)}
          </p>
        </section>

        <section className="mt-4">
          <Link
            className="mb-1 gap-0 text-[13px] font-medium text-foreground"
            onPress={() => setSelectedTab("timing")}
          >
            Timing
            <ChevronRight aria-hidden className="size-3.5 text-muted" />
          </Link>
          <ApprovalTiming record={record} />
        </section>
      </Tabs.Panel>

      <Tabs.Panel className="mt-0! min-h-0 flex-1 overflow-auto p-2" id="request">
        <TraceDetailCode
          ariaLabel="复制审批请求"
          code={record.raw.request ?? {}}
          isHeaderHidden
          name="Request"
        />
      </Tabs.Panel>
      <Tabs.Panel className="mt-0! min-h-0 flex-1 overflow-auto px-4 py-3" id="result">
        <dl className="grid grid-cols-[6rem_minmax(0,1fr)] gap-y-1 text-[13px] leading-5">
          <dt className="text-muted">Decision</dt>
          <dd>{decisionLabel(decision)}</dd>
          <dt className="text-muted">Effect</dt>
          <dd className="whitespace-pre-wrap">{decisionDescription(decision)}</dd>
        </dl>
        {resolution ? (
          <div className="mt-4">
            <TraceDetailCode
              ariaLabel="复制审批处理事件"
              code={resolution}
              isHeaderHidden
              name="Resolution"
            />
          </div>
        ) : null}
      </Tabs.Panel>
      <Tabs.Panel className="mt-0! min-h-0 flex-1 overflow-auto px-4 py-3" id="timing">
        <ApprovalTiming record={record} />
      </Tabs.Panel>
      <Tabs.Panel className="mt-0! min-h-0 flex-1 overflow-auto p-2" id="raw">
        <TraceDetailCode
          ariaLabel="复制原始审批轨迹数据"
          code={record.raw}
          isHeaderHidden
          name={`${record.id}.json`}
        />
      </Tabs.Panel>
    </Tabs>
  );
}
