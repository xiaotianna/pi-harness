"use client";

import { EmptyState } from "@agile-avocation/ui-pro/empty-state";
import {
  Clock as Clock3,
  Hierarchy as ListTree,
  Magnifier as Search,
  Wrench,
} from "@gravity-ui/icons";
import { Drawer, Input, ScrollShadow, TextField, useMediaQuery } from "@heroui/react";
import type { HarnessEvent } from "@pi-harness/agent-runtime/harness-event";
import { useCallback, useDeferredValue, useEffect, useMemo, useState } from "react";
import { AGENT_TRACE_STATUS_LABELS } from "../constants/agent-trace";
import {
  type AgentTraceRange,
  type AgentTraceRecord,
  AgentTraceRecordKind,
  AgentTraceStatus,
} from "../types/agent-trace";
import { formatTraceDuration } from "../utils/format-trace-duration";
import { isTraceRecordInRange } from "../utils/is-trace-record-in-range";
import { sessionEventsToAgentTraces } from "../utils/session-events-to-agent-traces";
import { TraceDetailPanel } from "./trace-detail-panel";
import { TraceEventList } from "./trace-event-list";
import { TraceTimeline } from "./trace-timeline";

export interface AgentTraceViewProps {
  events: readonly HarnessEvent[];
}

export function AgentTraceView({ events }: AgentTraceViewProps) {
  const [range, setRange] = useState<AgentTraceRange | null>(null);
  const [search, setSearch] = useState("");
  const [isMobileDetailOpen, setIsMobileDetailOpen] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const [selectedRecordId, setSelectedRecordId] = useState<string | null>(null);
  const [selectedRequestRecordId, setSelectedRequestRecordId] = useState<string | null>(null);
  const isMobile = useMediaQuery("(max-width: 767px)");
  const deferredSearch = useDeferredValue(search);
  const trace = useMemo(() => sessionEventsToAgentTraces(events, now)[0] ?? null, [events, now]);
  const isTraceRunning = trace?.status === AgentTraceStatus.RUNNING;

  useEffect(() => {
    if (!isTraceRunning) return;
    const timer = window.setInterval(() => setNow(Date.now()), 1_000);
    return () => window.clearInterval(timer);
  }, [isTraceRunning]);

  useEffect(() => {
    setRange(null);
    setSearch("");
    setSelectedRecordId(null);
    setSelectedRequestRecordId(null);
    setIsMobileDetailOpen(false);
  }, [trace?.traceId]);

  useEffect(() => {
    if (!isMobile) setIsMobileDetailOpen(false);
  }, [isMobile]);

  const records = useMemo(() => {
    if (!trace) return [];
    const query = deferredSearch.trim().toLowerCase();
    if (!query) return trace.records;

    return trace.records.filter((record) => {
      const systemPrompt = record.systemPrompt;
      return `${record.label} ${record.preview} ${record.source} ${record.errorCode ?? ""} ${systemPrompt?.content ?? ""} ${systemPrompt?.tools.map(({ description, name }) => `${name} ${description}`).join(" ") ?? ""}`
        .toLowerCase()
        .includes(query);
    });
  }, [deferredSearch, trace]);

  const selectedRecord = trace?.records.find((record) => record.id === selectedRecordId) ?? null;
  const selectedStep =
    selectedRecord && trace
      ? trace.records
          .filter((record) => record.turn === selectedRecord.turn)
          .findIndex((record) => record.id === selectedRecord.id) + 1
      : 0;
  const visibleRecordCount = records.filter((record) =>
    isTraceRecordInRange(record.startMs, record.durationMs, range),
  ).length;
  const turnCount = new Set(
    trace?.records.filter((record) => record.turn > 0).map((record) => record.turn) ?? [],
  ).size;
  const toolCallCount = new Set(
    (trace?.records ?? [])
      .filter((record) => record.kind === AgentTraceRecordKind.TOOL)
      .map((record) => record.raw.toolCallId),
  ).size;
  const hasRange = range !== null;
  const handleRecordSelect = useCallback(
    (record: AgentTraceRecord) => {
      setSelectedRecordId(record.id);
      setSelectedRequestRecordId(null);
      if (isMobile) setIsMobileDetailOpen(true);
    },
    [isMobile],
  );

  const handleDetailClose = useCallback(() => {
    setSelectedRecordId(null);
    setSelectedRequestRecordId(null);
  }, []);

  const handleRequestOpen = useCallback(
    (recordId: string) => {
      const requestRecord = trace?.records.find(
        (record) => record.id === recordId && record.kind === AgentTraceRecordKind.ASSISTANT,
      );
      if (!requestRecord) return;
      setSearch("");
      setSelectedRecordId(recordId);
      setSelectedRequestRecordId(recordId);
      if (isMobile) setIsMobileDetailOpen(true);
    },
    [isMobile, trace],
  );

  const handleToolCallOpen = useCallback(
    (toolCallId: string) => {
      const toolRecord = trace?.records.find(
        (record) =>
          record.kind === AgentTraceRecordKind.TOOL && record.raw.toolCallId === toolCallId,
      );
      if (!toolRecord) return;
      setSearch("");
      handleRecordSelect(toolRecord);
    },
    [handleRecordSelect, trace],
  );

  const handleAssistantOpen = useCallback(
    (recordId: string) => {
      const assistantRecord = trace?.records.find(
        (record) => record.id === recordId && record.kind === AgentTraceRecordKind.ASSISTANT,
      );
      if (assistantRecord) handleRecordSelect(assistantRecord);
    },
    [handleRecordSelect, trace],
  );

  if (!trace) {
    return (
      <div className="grid h-full min-h-0 place-items-center bg-background px-4 md:pr-6 md:pl-10">
        <EmptyState size="sm">
          <EmptyState.Header>
            <EmptyState.Media variant="icon">
              <ListTree className="size-5" />
            </EmptyState.Media>
            <EmptyState.Title>暂无运行轨迹</EmptyState.Title>
            <EmptyState.Description>
              发送消息后，这里会显示连续的 Session 轨迹。
            </EmptyState.Description>
          </EmptyState.Header>
        </EmptyState>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-background px-4 md:pr-6 md:pl-10">
      <div className="shrink-0">
        <div className="flex flex-col gap-2 border-b border-separator py-2 sm:flex-row sm:items-center sm:py-1">
          <div className="flex min-w-0 items-center gap-2 sm:flex-1">
            <ScrollShadow
              hideScrollBar
              className="min-w-0 flex-1"
              orientation="horizontal"
              size={16}
            >
              <div className="flex w-max items-center gap-2 pr-2 sm:pr-0">
                <span className="flex items-center gap-1 text-[11px] tabular-nums text-muted">
                  <Clock3 className="size-3" />
                  {formatTraceDuration(trace.durationMs)}
                </span>
                <span className="flex items-center gap-1 text-[11px] text-muted">
                  <ListTree className="size-3" />
                  {turnCount} 轮
                </span>
                <span className="flex items-center gap-1 text-[11px] text-muted">
                  <Wrench className="size-3" />
                  {toolCallCount} 次调用
                </span>
                {trace.tokenUsage.total > 0 ? (
                  <span className="text-[11px] tabular-nums text-muted">
                    {trace.tokenUsage.total.toLocaleString()} tokens
                  </span>
                ) : null}
                <span className="text-[11px] text-muted">
                  {AGENT_TRACE_STATUS_LABELS[trace.status]}
                </span>
                <span className="text-[11px] tabular-nums text-muted">
                  {hasRange
                    ? `范围内 ${visibleRecordCount}/${records.length}`
                    : `全部 ${records.length}`}
                </span>
              </div>
            </ScrollShadow>
          </div>
          <div className="relative w-full sm:ml-auto sm:min-w-40 sm:max-w-56 sm:flex-1">
            <Search className="pointer-events-none absolute top-1/2 left-2 z-10 size-3.5 -translate-y-1/2 text-muted" />
            <TextField
              aria-label="搜索轨迹记录"
              fullWidth
              value={search}
              variant="secondary"
              onChange={setSearch}
            >
              <Input className="h-7 pl-7 text-xs" placeholder="搜索轨迹" />
            </TextField>
          </div>
        </div>

        <TraceTimeline
          durationMs={trace.durationMs}
          range={range}
          records={records}
          selectedRecordId={selectedRecordId}
          onRangeChange={setRange}
          onSelectRecord={handleRecordSelect}
        />
      </div>

      <div className="flex min-h-0 flex-1">
        <div className="min-h-0 min-w-[280px] flex-1 overflow-hidden">
          <TraceEventList
            range={range}
            records={records}
            selectedRecordId={selectedRecordId}
            selectedRequestRecordId={selectedRequestRecordId}
            onOpenRequest={handleRequestOpen}
            onSelect={handleRecordSelect}
          />
        </div>

        {selectedRecord ? (
          <div className="hidden min-h-0 min-w-0 w-[clamp(320px,32%,400px)] max-w-[calc(100%-280px)] flex-col border-l border-separator md:flex">
            <TraceDetailPanel
              isRequestSelected={selectedRequestRecordId === selectedRecord.id}
              key={selectedRecord.id}
              record={selectedRecord}
              step={selectedStep}
              onClose={handleDetailClose}
              onOpenAssistant={handleAssistantOpen}
              onOpenRequest={handleRequestOpen}
              onOpenToolCall={handleToolCallOpen}
            />
          </div>
        ) : null}
      </div>

      {isMobile && selectedRecord ? (
        <Drawer.Backdrop isOpen={isMobileDetailOpen} onOpenChange={setIsMobileDetailOpen}>
          <Drawer.Content placement="bottom">
            <Drawer.Dialog
              aria-label={`轨迹详情：${selectedRecord.label}`}
              className="h-[min(78dvh,640px)] bg-background p-0!"
            >
              <Drawer.Handle className="pt-2" />
              <Drawer.Body className="m-0! min-h-0 p-0!">
                <TraceDetailPanel
                  isRequestSelected={selectedRequestRecordId === selectedRecord.id}
                  key={selectedRecord.id}
                  record={selectedRecord}
                  step={selectedStep}
                  onClose={() => setIsMobileDetailOpen(false)}
                  onOpenAssistant={handleAssistantOpen}
                  onOpenRequest={handleRequestOpen}
                  onOpenToolCall={handleToolCallOpen}
                />
              </Drawer.Body>
            </Drawer.Dialog>
          </Drawer.Content>
        </Drawer.Backdrop>
      ) : null}
    </div>
  );
}
