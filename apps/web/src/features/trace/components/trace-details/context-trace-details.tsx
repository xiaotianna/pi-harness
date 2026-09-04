"use client";

import { ChevronRight } from "@gravity-ui/icons";
import { Link, Tabs } from "@heroui/react";
import { useState } from "react";
import { AGENT_TRACE_DETAIL_STATUS_LABELS } from "../../constants/agent-trace";
import type { AgentTraceRecord } from "../../types/agent-trace";
import { formatTraceDuration } from "../../utils/format-trace-duration";
import { TraceDetailCode, TraceDetailMarkdown, TraceDetailText } from "./trace-detail-content";

export function ContextTraceDetails({ record }: { record: AgentTraceRecord }) {
  const [selectedTab, setSelectedTab] = useState("summary");
  const context = record.raw.context;
  if (typeof context === "string") {
    const source = {
      eventId: record.raw.eventId,
      eventType: record.source,
      label: record.label,
      runId: record.raw.runId,
      seq: record.raw.seq,
      type: record.raw.contextType,
    };

    return (
      <Tabs
        className="flex min-h-0 flex-1 flex-col gap-0!"
        selectedKey={selectedTab}
        variant="secondary"
        onSelectionChange={(key) => setSelectedTab(String(key))}
      >
        <Tabs.ListContainer className="w-full shrink-0 px-2">
          <Tabs.List aria-label="上下文详情分类">
            <Tabs.Tab className="w-auto! flex-none px-4 text-xs" id="summary">
              Summary
              <Tabs.Indicator />
            </Tabs.Tab>
            <Tabs.Tab className="w-auto! flex-none px-4 text-xs" id="preview">
              Preview
              <Tabs.Indicator />
            </Tabs.Tab>
            <Tabs.Tab className="w-auto! flex-none px-4 text-xs" id="raw">
              Raw
              <Tabs.Indicator />
            </Tabs.Tab>
            <Tabs.Tab className="w-auto! flex-none px-4 text-xs" id="source">
              Source
              <Tabs.Indicator />
            </Tabs.Tab>
          </Tabs.List>
        </Tabs.ListContainer>

        <Tabs.Panel className="mt-0! min-h-0 flex-1 overflow-auto px-4 py-3" id="summary">
          <dl className="grid grid-cols-[5rem_minmax(0,1fr)] gap-y-1 text-[13px] leading-5">
            <dt className="text-muted">Source</dt>
            <dd>
              <Link
                className="gap-0 text-[13px] font-normal text-foreground"
                onPress={() => setSelectedTab("source")}
              >
                {record.label}
                <ChevronRight aria-hidden className="size-3 text-muted" />
              </Link>
            </dd>
            <dt className="text-muted">Status</dt>
            <dd>{AGENT_TRACE_DETAIL_STATUS_LABELS[record.status]}</dd>
            <dt className="text-muted">Duration</dt>
            <dd className="tabular-nums">{formatTraceDuration(record.durationMs)}</dd>
          </dl>

          <div className="mt-3">
            <Link
              className="gap-0 text-[13px] font-medium text-foreground"
              onPress={() => setSelectedTab("preview")}
            >
              Preview
              <ChevronRight aria-hidden className="size-3.5 text-muted" />
            </Link>
            <div className="mt-1">
              <TraceDetailMarkdown>{record.preview}</TraceDetailMarkdown>
            </div>
          </div>
        </Tabs.Panel>

        <Tabs.Panel className="mt-0! min-h-0 flex-1 overflow-auto px-4 py-3" id="preview">
          <TraceDetailMarkdown>{context}</TraceDetailMarkdown>
        </Tabs.Panel>
        <Tabs.Panel className="mt-0! min-h-0 flex-1 overflow-auto px-4 py-3" id="raw">
          <pre className="m-0 whitespace-pre-wrap [overflow-wrap:anywhere] font-mono text-[13px] leading-5 text-foreground">
            {context}
          </pre>
        </Tabs.Panel>
        <Tabs.Panel className="mt-0! min-h-0 flex-1 overflow-auto p-2" id="source">
          <TraceDetailCode
            ariaLabel="复制上下文来源"
            code={source}
            isHeaderHidden
            name="上下文来源"
          />
        </Tabs.Panel>
      </Tabs>
    );
  }

  return (
    <Tabs
      className="flex min-h-0 flex-1 flex-col gap-0!"
      defaultSelectedKey="summary"
      variant="secondary"
    >
      <Tabs.ListContainer className="shrink-0 px-2">
        <Tabs.List aria-label="上下文轨迹详情分类">
          <Tabs.Tab className="w-auto! flex-none px-4 text-xs" id="summary">
            Summary
            <Tabs.Indicator />
          </Tabs.Tab>
          <Tabs.Tab className="w-auto! flex-none px-4 text-xs" id="checkpoint">
            Checkpoint
            <Tabs.Indicator />
          </Tabs.Tab>
          <Tabs.Tab className="w-auto! flex-none px-4 text-xs" id="raw">
            Raw
            <Tabs.Indicator />
          </Tabs.Tab>
        </Tabs.List>
      </Tabs.ListContainer>
      <Tabs.Panel className="mt-0! min-h-0 flex-1 overflow-auto px-4 py-3" id="summary">
        <TraceDetailText>{`${record.summary}\n\n${record.preview}`}</TraceDetailText>
      </Tabs.Panel>
      <Tabs.Panel className="mt-0! min-h-0 flex-1 overflow-auto p-2" id="checkpoint">
        <TraceDetailCode
          ariaLabel="复制上下文 Checkpoint"
          code={record.raw.checkpoint ?? {}}
          name="Checkpoint"
        />
      </Tabs.Panel>
      <Tabs.Panel className="mt-0! min-h-0 flex-1 overflow-auto p-2" id="raw">
        <TraceDetailCode
          ariaLabel="复制原始上下文轨迹数据"
          code={record.raw}
          name={`${record.id}.json`}
        />
      </Tabs.Panel>
    </Tabs>
  );
}
