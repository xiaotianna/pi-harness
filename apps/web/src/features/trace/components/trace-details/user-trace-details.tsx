"use client";

import { ChevronRight } from "@gravity-ui/icons";
import { Link, Tabs } from "@heroui/react";
import { isPlainObject } from "es-toolkit";
import { useState } from "react";
import { AGENT_TRACE_DETAIL_STATUS_LABELS } from "../../constants/agent-trace";
import type { AgentTraceRecord } from "../../types/agent-trace";
import { formatTraceDuration } from "../../utils/format-trace-duration";
import { TraceDetailCode, TraceDetailMarkdown } from "./trace-detail-content";

function UserMessageRaw({ content, fallback }: { content: unknown; fallback: string }) {
  const blocks = Array.isArray(content) ? content : [{ text: fallback, type: "text" }];

  return (
    <div className="flex flex-col gap-4">
      {blocks.map((block, index) => {
        const type =
          isPlainObject(block) && typeof block.type === "string" ? block.type : "unknown";
        const text = isPlainObject(block) && typeof block.text === "string" ? block.text : null;

        return (
          <section key={`${index}-${type}`}>
            <div className="mb-1 font-mono text-[11px] text-muted">{`Block #${index + 1} ${type}`}</div>
            {text === null ? (
              <TraceDetailCode
                ariaLabel={`复制 Block #${index + 1}`}
                code={block}
                isHeaderHidden
                name={`Block #${index + 1}`}
              />
            ) : (
              <pre className="m-0 whitespace-pre-wrap [overflow-wrap:anywhere] font-sans text-[13px] leading-5 text-foreground">
                {text}
              </pre>
            )}
          </section>
        );
      })}
    </div>
  );
}

export function UserTraceDetails({ record }: { record: AgentTraceRecord }) {
  const [selectedTab, setSelectedTab] = useState("summary");
  const message = typeof record.raw.message === "string" ? record.raw.message : record.preview;
  const source = record.raw.source ?? { kind: "user" };

  return (
    <Tabs
      className="flex min-h-0 flex-1 flex-col gap-0!"
      selectedKey={selectedTab}
      variant="secondary"
      onSelectionChange={(key) => setSelectedTab(String(key))}
    >
      <Tabs.ListContainer className="w-full shrink-0 px-2">
        <Tabs.List aria-label="用户轨迹详情分类">
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
              User
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
            <TraceDetailMarkdown>{message}</TraceDetailMarkdown>
          </div>
        </div>
      </Tabs.Panel>

      <Tabs.Panel className="mt-0! min-h-0 flex-1 overflow-auto px-4 py-3" id="preview">
        <TraceDetailMarkdown>{message}</TraceDetailMarkdown>
      </Tabs.Panel>

      <Tabs.Panel className="mt-0! min-h-0 flex-1 overflow-auto px-4 py-3" id="raw">
        <UserMessageRaw content={record.raw.content} fallback={message} />
      </Tabs.Panel>

      <Tabs.Panel className="mt-0! min-h-0 flex-1 overflow-auto p-2" id="source">
        <TraceDetailCode
          ariaLabel="复制用户消息来源"
          code={source}
          isHeaderHidden
          name="用户消息来源"
        />
      </Tabs.Panel>
    </Tabs>
  );
}
