"use client";

import { ChevronRight, Wrench } from "@gravity-ui/icons";
import { Disclosure, Link, Tabs } from "@heroui/react";
import { isPlainObject } from "es-toolkit";
import { useState } from "react";
import { AGENT_TRACE_DETAIL_STATUS_LABELS } from "../../constants/agent-trace";
import type { AgentTraceRecord } from "../../types/agent-trace";
import { formatTraceDuration } from "../../utils/format-trace-duration";
import { TraceDetailMarkdown } from "./trace-detail-content";

type AssistantTraceBlock =
  | { content: string; kind: "text" | "thinking"; label: string }
  | {
      content: string;
      kind: "tool-call";
      label: "tool-call";
      toolCallId: string;
      toolName: string;
    }
  | { content: string; kind: "unknown"; label: string };

function stringify(value: unknown, spacing?: number): string {
  if (typeof value === "string") return value;
  try {
    return JSON.stringify(value, null, spacing) ?? "undefined";
  } catch {
    return "无法展示该数据";
  }
}

function readBlocks(record: AgentTraceRecord): AssistantTraceBlock[] {
  const response = isPlainObject(record.raw.response) ? record.raw.response : {};
  const content = response.content;
  if (!Array.isArray(content)) {
    return [
      {
        content: typeof content === "string" ? content : record.preview,
        kind: "text",
        label: "text",
      },
    ];
  }

  return content.map((block) => {
    if (!isPlainObject(block)) {
      return { content: stringify(block, 2), kind: "unknown", label: "unknown" };
    }
    if (block.type === "text" && typeof block.text === "string") {
      return { content: block.text, kind: "text", label: "text" };
    }
    if (block.type === "thinking" && typeof block.thinking === "string") {
      return { content: block.thinking, kind: "thinking", label: "thinking" };
    }
    if (
      block.type === "toolCall" &&
      typeof block.id === "string" &&
      typeof block.name === "string"
    ) {
      return {
        content: stringify(block.arguments),
        kind: "tool-call",
        label: "tool-call",
        toolCallId: block.id,
        toolName: block.name,
      };
    }
    return {
      content: stringify(block, 2),
      kind: "unknown",
      label: typeof block.type === "string" ? block.type : "unknown",
    };
  });
}

function AssistantPreview({
  blocks,
  onOpenToolCall,
}: {
  blocks: readonly AssistantTraceBlock[];
  onOpenToolCall: (toolCallId: string) => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      {blocks.map((block, index) => {
        if (block.kind === "thinking") {
          return (
            <Disclosure className="border-l border-separator pl-2" key={`${index}-thinking`}>
              <Disclosure.Heading>
                <Disclosure.Trigger className="group flex min-h-6 items-center gap-0 p-0 text-[13px] font-medium text-muted hover:text-foreground">
                  Thinking
                  <Disclosure.Indicator className="size-3.5 text-muted" />
                </Disclosure.Trigger>
              </Disclosure.Heading>
              <Disclosure.Content>
                <Disclosure.Body className="px-0! py-1!">
                  <TraceDetailMarkdown>{block.content}</TraceDetailMarkdown>
                </Disclosure.Body>
              </Disclosure.Content>
            </Disclosure>
          );
        }
        if (block.kind === "text") {
          return <TraceDetailMarkdown key={`${index}-text`}>{block.content}</TraceDetailMarkdown>;
        }
        if (block.kind === "tool-call") {
          return (
            <Link
              className="flex min-w-0 max-w-full gap-1.5 text-[13px] font-normal text-muted"
              key={block.toolCallId}
              onPress={() => onOpenToolCall(block.toolCallId)}
            >
              <Wrench aria-hidden className="size-3.5 shrink-0" />
              <code className="shrink-0 text-[13px]">{block.toolName}</code>
              <code className="min-w-0 truncate text-[12px]" title={block.content}>
                {block.content}
              </code>
            </Link>
          );
        }
        return null;
      })}
    </div>
  );
}

function AssistantRaw({
  blocks,
  onOpenToolCall,
}: {
  blocks: readonly AssistantTraceBlock[];
  onOpenToolCall: (toolCallId: string) => void;
}) {
  return (
    <div className="flex flex-col gap-4">
      {blocks.map((block, index) => (
        <section key={`${index}-${block.kind}`}>
          {block.kind === "tool-call" ? (
            <Link
              className="mb-1 gap-0 font-mono text-[11px] font-normal text-muted"
              onPress={() => onOpenToolCall(block.toolCallId)}
            >
              {`Block #${index + 1} ${block.label}`}
              <ChevronRight aria-hidden className="size-3" />
            </Link>
          ) : (
            <div className="mb-1 font-mono text-[11px] text-muted">{`Block #${index + 1} ${block.label}`}</div>
          )}
          <pre className="m-0 whitespace-pre-wrap [overflow-wrap:anywhere] font-mono text-[13px] leading-5 text-foreground">
            {block.content}
          </pre>
        </section>
      ))}
    </div>
  );
}

export function AssistantTraceDetails({
  record,
  onOpenRequest,
  onOpenToolCall,
}: {
  record: AgentTraceRecord;
  onOpenRequest: (recordId: string) => void;
  onOpenToolCall: (toolCallId: string) => void;
}) {
  const [selectedTab, setSelectedTab] = useState("summary");
  const blocks = readBlocks(record);
  const usage = record.tokenUsage;
  const startedAt =
    typeof record.raw.requestStartedAt === "number"
      ? new Date(record.raw.requestStartedAt).toLocaleString()
      : null;

  return (
    <Tabs
      className="flex min-h-0 flex-1 flex-col gap-0!"
      selectedKey={selectedTab}
      variant="secondary"
      onSelectionChange={(key) => setSelectedTab(String(key))}
    >
      <Tabs.ListContainer className="w-full shrink-0 px-2">
        <Tabs.List aria-label="助手轨迹详情分类">
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
        </Tabs.List>
      </Tabs.ListContainer>

      <Tabs.Panel className="mt-0! min-h-0 flex-1 overflow-auto px-4 py-3" id="summary">
        <dl className="grid grid-cols-[5rem_minmax(0,1fr)] gap-y-1 text-[13px] leading-5">
          <dt className="text-muted">Source</dt>
          <dd>
            <Link
              className="gap-0 text-[13px] font-normal text-foreground"
              onPress={() => onOpenRequest(record.id)}
            >
              {`Request #${record.request ?? "—"}`}
              <ChevronRight aria-hidden className="size-3 text-muted" />
            </Link>
          </dd>
          <dt className="text-muted">Status</dt>
          <dd>{AGENT_TRACE_DETAIL_STATUS_LABELS[record.status]}</dd>
          <dt className="text-muted">Tokens</dt>
          <dd className="tabular-nums">{`${(usage?.total ?? 0).toLocaleString()} tok`}</dd>
          {usage?.reasoning ? (
            <>
              <dt className="pl-3 text-muted">Reasoning</dt>
              <dd className="tabular-nums">{`${usage.reasoning.toLocaleString()} tok`}</dd>
              <dt className="pl-3 text-muted">Content</dt>
              <dd className="tabular-nums">{`${Math.max(0, usage.output - usage.reasoning).toLocaleString()} tok`}</dd>
            </>
          ) : null}
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
            <AssistantPreview blocks={blocks} onOpenToolCall={onOpenToolCall} />
          </div>
        </div>

        <div className="mt-4">
          <div className="mb-1 text-[13px] font-medium text-foreground">Request Timing</div>
          <dl className="grid grid-cols-[5rem_minmax(0,1fr)] gap-y-1 text-[13px] leading-5">
            {startedAt ? (
              <>
                <dt className="text-muted">Started</dt>
                <dd className="tabular-nums">{startedAt}</dd>
              </>
            ) : null}
            <dt className="text-muted">Duration</dt>
            <dd className="tabular-nums">{formatTraceDuration(record.durationMs)}</dd>
          </dl>
        </div>
      </Tabs.Panel>

      <Tabs.Panel className="mt-0! min-h-0 flex-1 overflow-auto px-4 py-3" id="preview">
        <AssistantPreview blocks={blocks} onOpenToolCall={onOpenToolCall} />
      </Tabs.Panel>

      <Tabs.Panel className="mt-0! min-h-0 flex-1 overflow-auto px-4 py-3" id="raw">
        <AssistantRaw blocks={blocks} onOpenToolCall={onOpenToolCall} />
      </Tabs.Panel>
    </Tabs>
  );
}
