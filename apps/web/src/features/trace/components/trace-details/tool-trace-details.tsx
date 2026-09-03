"use client";

import { ChevronRight } from "@gravity-ui/icons";
import { Link, Tabs } from "@heroui/react";
import { isPlainObject } from "es-toolkit";
import { useState } from "react";
import { AGENT_TRACE_DETAIL_STATUS_LABELS } from "../../constants/agent-trace";
import type { AgentTraceRecord } from "../../types/agent-trace";
import { formatTraceDuration, formatTraceTimestamp } from "../../utils/format-trace-duration";
import { TraceDetailCode } from "./trace-detail-content";

const TOOL_TABS = [
  ["summary", "Summary"],
  ["payload", "Payload"],
  ["result", "Result"],
  ["schema", "Schema"],
  ["timing", "Timing"],
] as const;

function ToolSchema({ record }: { record: AgentTraceRecord }) {
  const definition = isPlainObject(record.raw.toolDefinition) ? record.raw.toolDefinition : {};
  const name = typeof definition.name === "string" ? definition.name : record.label;
  const description =
    typeof definition.description === "string" ? definition.description : "工具定义未记录。";

  return (
    <div className="min-w-0">
      <div className="font-mono text-[13px] font-medium text-foreground">{name}</div>
      <p className="mt-1 whitespace-pre-wrap text-[13px] leading-5 text-muted">{description}</p>
      <div className="mt-3 mb-1 text-[11px] font-medium text-muted">Parameters</div>
      <TraceDetailCode
        ariaLabel={`复制 ${name} 参数 Schema`}
        code={definition.parameters ?? {}}
        isHeaderHidden
        name="Parameters"
      />
    </div>
  );
}

function ToolTiming({ record }: { record: AgentTraceRecord }) {
  const startedAt =
    typeof record.raw.startedAt === "number" && Number.isFinite(record.raw.startedAt)
      ? record.raw.startedAt
      : null;

  return (
    <dl className="grid grid-cols-[6rem_minmax(0,1fr)] gap-y-1 text-[13px] leading-5">
      <dt className="text-muted">Started</dt>
      <dd className="tabular-nums">{formatTraceTimestamp(startedAt)}</dd>
      <dt className="text-muted">Duration</dt>
      <dd className="tabular-nums">{formatTraceDuration(record.durationMs)}</dd>
      <dt className="text-muted">Timing source</dt>
      <dd>Session timestamps</dd>
    </dl>
  );
}

export function ToolTraceDetails({
  record,
  onOpenAssistant,
}: {
  record: AgentTraceRecord;
  onOpenAssistant: (recordId: string) => void;
}) {
  const [selectedTab, setSelectedTab] = useState("summary");
  const parentAssistantRecordId =
    typeof record.raw.parentAssistantRecordId === "string"
      ? record.raw.parentAssistantRecordId
      : null;

  return (
    <Tabs
      className="flex min-h-0 flex-1 flex-col gap-0!"
      selectedKey={selectedTab}
      variant="secondary"
      onSelectionChange={(key) => setSelectedTab(String(key))}
    >
      <Tabs.ListContainer className="w-full shrink-0 px-2">
        <Tabs.List aria-label="工具轨迹详情分类">
          {TOOL_TABS.map(([id, label]) => (
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
            {parentAssistantRecordId ? (
              <Link
                className="gap-0 text-[13px] font-normal text-foreground"
                onPress={() => onOpenAssistant(parentAssistantRecordId)}
              >
                Assistant Message
                <ChevronRight aria-hidden className="size-3 text-muted" />
              </Link>
            ) : (
              "未记录"
            )}
          </dd>
          <dt className="text-muted">Status</dt>
          <dd>{AGENT_TRACE_DETAIL_STATUS_LABELS[record.status]}</dd>
        </dl>

        <section className="mt-4">
          <Link
            className="mb-1 gap-0 text-[13px] font-medium text-foreground"
            onPress={() => setSelectedTab("payload")}
          >
            Payload
            <ChevronRight aria-hidden className="size-3.5 text-muted" />
          </Link>
          <TraceDetailCode
            ariaLabel={`复制 ${record.label} Payload`}
            code={record.raw.arguments ?? {}}
            isHeaderHidden
            name="Payload"
          />
        </section>

        <section className="mt-4">
          <Link
            className="mb-1 gap-0 text-[13px] font-medium text-foreground"
            onPress={() => setSelectedTab("result")}
          >
            Result
            <ChevronRight aria-hidden className="size-3.5 text-muted" />
          </Link>
          <TraceDetailCode
            ariaLabel={`复制 ${record.label} Result`}
            code={record.raw.result ?? record.preview}
            isHeaderHidden
            name="Result"
          />
        </section>

        <section className="mt-4">
          <Link
            className="mb-1 gap-0 text-[13px] font-medium text-foreground"
            onPress={() => setSelectedTab("schema")}
          >
            Schema
            <ChevronRight aria-hidden className="size-3.5 text-muted" />
          </Link>
          <ToolSchema record={record} />
        </section>

        <section className="mt-4">
          <Link
            className="mb-1 gap-0 text-[13px] font-medium text-foreground"
            onPress={() => setSelectedTab("timing")}
          >
            Timing
            <ChevronRight aria-hidden className="size-3.5 text-muted" />
          </Link>
          <ToolTiming record={record} />
        </section>
      </Tabs.Panel>

      <Tabs.Panel className="mt-0! min-h-0 flex-1 overflow-auto p-2" id="payload">
        <TraceDetailCode
          ariaLabel="复制工具输入"
          code={record.raw.arguments ?? {}}
          isHeaderHidden
          name="Payload"
        />
      </Tabs.Panel>
      <Tabs.Panel className="mt-0! min-h-0 flex-1 overflow-auto p-2" id="result">
        <TraceDetailCode
          ariaLabel="复制工具输出"
          code={record.raw.result ?? record.preview}
          isHeaderHidden
          name="Result"
        />
      </Tabs.Panel>
      <Tabs.Panel className="mt-0! min-h-0 flex-1 overflow-auto px-4 py-3" id="schema">
        <ToolSchema record={record} />
      </Tabs.Panel>
      <Tabs.Panel className="mt-0! min-h-0 flex-1 overflow-auto px-4 py-3" id="timing">
        <ToolTiming record={record} />
      </Tabs.Panel>
    </Tabs>
  );
}
