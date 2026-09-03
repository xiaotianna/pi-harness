"use client";

import { ChevronRight } from "@gravity-ui/icons";
import { Link, Tabs } from "@heroui/react";
import { isPlainObject } from "es-toolkit";
import { useState } from "react";
import { AGENT_TRACE_DETAIL_STATUS_LABELS } from "../../constants/agent-trace";
import type { AgentTraceRecord, AgentTraceTokenUsage } from "../../types/agent-trace";
import { formatTraceDuration, formatTraceTimestamp } from "../../utils/format-trace-duration";
import { TraceDetailCode } from "./trace-detail-content";

const EMPTY_USAGE: AgentTraceTokenUsage = {
  cacheRead: 0,
  cacheWrite: 0,
  input: 0,
  output: 0,
  reasoning: 0,
  total: 0,
};
const REQUEST_TABS = [
  ["summary", "Summary"],
  ["options", "Options"],
  ["usage", "Usage"],
  ["timing", "Timing"],
] as const;

function readNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : null;
}

function readString(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function formatTokens(value: number): string {
  return `${value.toLocaleString()} tok`;
}

function UsageMetrics({ usage }: { usage: AgentTraceTokenUsage }) {
  return (
    <dl className="grid grid-cols-[6rem_minmax(0,1fr)] gap-y-1 text-[13px] leading-5">
      <dt className="text-muted">Input</dt>
      <dd className="tabular-nums">
        {formatTokens(usage.input + usage.cacheRead + usage.cacheWrite)}
      </dd>
      <dt className="pl-3 text-muted">Cache read</dt>
      <dd className="tabular-nums">{formatTokens(usage.cacheRead)}</dd>
      <dt className="pl-3 text-muted">Cache write</dt>
      <dd className="tabular-nums">{formatTokens(usage.cacheWrite)}</dd>
      <dt className="pl-3 text-muted">Other</dt>
      <dd className="tabular-nums">{formatTokens(usage.input)}</dd>
      <dt className="text-muted">Output</dt>
      <dd className="tabular-nums">{formatTokens(usage.output)}</dd>
      <dt className="pl-3 text-muted">Reasoning</dt>
      <dd className="tabular-nums">{formatTokens(usage.reasoning)}</dd>
      <dt className="pl-3 text-muted">Content</dt>
      <dd className="tabular-nums">{formatTokens(Math.max(0, usage.output - usage.reasoning))}</dd>
      <dt className="text-muted">Token total</dt>
      <dd className="tabular-nums">{formatTokens(usage.total)}</dd>
    </dl>
  );
}

function TimingMetrics({
  durationMs,
  generationMs,
  requestStartedAt,
  throughput,
  ttftMs,
  isSummary = false,
}: {
  durationMs: number;
  generationMs: number | null;
  requestStartedAt: number | null;
  throughput: string;
  ttftMs: number | null;
  isSummary?: boolean;
}) {
  return (
    <dl className="grid grid-cols-[6rem_minmax(0,1fr)] gap-y-1 text-[13px] leading-5">
      <dt className="text-muted">Started</dt>
      <dd className="tabular-nums">{formatTraceTimestamp(requestStartedAt)}</dd>
      <dt className="text-muted">Total duration</dt>
      <dd className="tabular-nums">{formatTraceDuration(durationMs)}</dd>
      <dt className="text-muted">TTFT</dt>
      <dd className="tabular-nums">{ttftMs === null ? "—" : formatTraceDuration(ttftMs)}</dd>
      {isSummary ? null : (
        <>
          <dt className="text-muted">Generation</dt>
          <dd className="tabular-nums">
            {generationMs === null ? "—" : formatTraceDuration(generationMs)}
          </dd>
          <dt className="text-muted">Throughput</dt>
          <dd className="tabular-nums">{throughput}</dd>
        </>
      )}
    </dl>
  );
}

export function RequestTraceDetails({
  record,
  onOpenAssistant,
}: {
  record: AgentTraceRecord;
  onOpenAssistant: (recordId: string) => void;
}) {
  const [selectedTab, setSelectedTab] = useState("summary");
  const rawOptions = isPlainObject(record.raw.options) ? record.raw.options : {};
  const response = isPlainObject(record.raw.response) ? record.raw.response : {};
  const provider = readString(rawOptions.provider) ?? readString(response.provider) ?? "未记录";
  const model = readString(rawOptions.model) ?? readString(response.model) ?? "未记录";
  const thinkingLevel = readString(rawOptions.thinkingLevel);
  const maxTokens = readNumber(rawOptions.maxTokens);
  const toolCallCount = readNumber(record.raw.toolCallCount) ?? 0;
  const usage = record.tokenUsage ?? EMPTY_USAGE;
  const cumulativeUsage = record.cumulativeTokenUsage ?? usage;
  const requestStartedAt = readNumber(record.raw.requestStartedAt);
  const responseStartedAt = readNumber(record.raw.responseStartedAt);
  const ttftMs =
    requestStartedAt === null || responseStartedAt === null
      ? null
      : Math.max(0, responseStartedAt - requestStartedAt);
  const generationMs = ttftMs === null ? null : Math.max(0, record.durationMs - ttftMs);
  const throughput =
    generationMs !== null && generationMs > 0
      ? `${((usage.output * 1_000) / generationMs).toFixed(1)} tok/s`
      : "—";
  const options = {
    provider,
    model,
    thinkingLevel: thinkingLevel ?? "未记录",
    maxTokens,
  };

  return (
    <Tabs
      className="flex min-h-0 flex-1 flex-col gap-0!"
      selectedKey={selectedTab}
      variant="secondary"
      onSelectionChange={(key) => setSelectedTab(String(key))}
    >
      <Tabs.ListContainer className="w-full shrink-0 px-2">
        <Tabs.List aria-label="模型请求详情分类">
          {REQUEST_TABS.map(([id, label]) => (
            <Tabs.Tab className="w-auto! flex-none px-3 text-xs" id={id} key={id}>
              {label}
              <Tabs.Indicator />
            </Tabs.Tab>
          ))}
        </Tabs.List>
      </Tabs.ListContainer>

      <Tabs.Panel className="mt-0! min-h-0 flex-1 overflow-auto px-4 py-3" id="summary">
        <dl className="grid grid-cols-[6rem_minmax(0,1fr)] gap-y-1 text-[13px] leading-5">
          <dt className="text-muted">Status</dt>
          <dd>{AGENT_TRACE_DETAIL_STATUS_LABELS[record.status]}</dd>
          <dt className="text-muted">Provider</dt>
          <dd className="truncate" title={provider}>
            {provider}
          </dd>
          <dt className="text-muted">Model</dt>
          <dd className="truncate" title={model}>
            {model}
          </dd>
          <dt className="text-muted">Tool calls</dt>
          <dd className="tabular-nums">{toolCallCount.toLocaleString()}</dd>
          <dt className="text-muted">Result</dt>
          <dd>
            <Link
              className="gap-0 text-[13px] font-normal text-foreground"
              onPress={() => onOpenAssistant(record.id)}
            >
              Assistant Message
              <ChevronRight aria-hidden className="size-3 text-muted" />
            </Link>
          </dd>
        </dl>

        <section className="mt-4">
          <Link
            className="mb-1 gap-0 text-[13px] font-medium text-foreground"
            onPress={() => setSelectedTab("options")}
          >
            Options
            <ChevronRight aria-hidden className="size-3.5 text-muted" />
          </Link>
          <TraceDetailCode
            ariaLabel={`复制 Request #${record.request ?? "—"} 配置`}
            code={options}
            isHeaderHidden
            name="Options"
          />
        </section>

        <section className="mt-4">
          <Link
            className="mb-1 gap-0 text-[13px] font-medium text-foreground"
            onPress={() => setSelectedTab("usage")}
          >
            Usage
            <ChevronRight aria-hidden className="size-3.5 text-muted" />
          </Link>
          <dl className="grid grid-cols-[6rem_minmax(0,1fr)] gap-y-1 text-[13px] leading-5">
            <dt className="text-muted">Input</dt>
            <dd className="tabular-nums">
              {formatTokens(usage.input + usage.cacheRead + usage.cacheWrite)}
            </dd>
            <dt className="text-muted">Output</dt>
            <dd className="tabular-nums">{formatTokens(usage.output)}</dd>
          </dl>
        </section>

        <section className="mt-4">
          <Link
            className="mb-1 gap-0 text-[13px] font-medium text-foreground"
            onPress={() => setSelectedTab("timing")}
          >
            Timing
            <ChevronRight aria-hidden className="size-3.5 text-muted" />
          </Link>
          <TimingMetrics
            isSummary
            durationMs={record.durationMs}
            generationMs={generationMs}
            requestStartedAt={requestStartedAt}
            throughput={throughput}
            ttftMs={ttftMs}
          />
        </section>
      </Tabs.Panel>

      <Tabs.Panel className="mt-0! min-h-0 flex-1 overflow-auto p-2" id="options">
        <TraceDetailCode
          ariaLabel={`复制 Request #${record.request ?? "—"} 配置`}
          code={options}
          isHeaderHidden
          name="Options"
        />
      </Tabs.Panel>

      <Tabs.Panel className="mt-0! min-h-0 flex-1 overflow-auto px-4 py-3" id="usage">
        <section>
          <h3 className="mb-2 text-[13px] font-medium text-foreground">This request</h3>
          <UsageMetrics usage={usage} />
        </section>
        <section className="mt-5">
          <h3 className="mb-2 text-[13px] font-medium text-foreground">Session cumulative</h3>
          <UsageMetrics usage={cumulativeUsage} />
        </section>
      </Tabs.Panel>

      <Tabs.Panel className="mt-0! min-h-0 flex-1 overflow-auto px-4 py-3" id="timing">
        <TimingMetrics
          durationMs={record.durationMs}
          generationMs={generationMs}
          requestStartedAt={requestStartedAt}
          throughput={throughput}
          ttftMs={ttftMs}
        />
      </Tabs.Panel>
    </Tabs>
  );
}
