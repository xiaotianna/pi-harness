"use client";

import { Resizable } from "@agile-avocation/ui-pro/resizable";
import { Button, Chip, Input, TextField } from "@heroui/react";
import { Clock3, ListTree, RotateCcw, Search, Wrench } from "lucide-react";
import { useMemo, useState } from "react";
import { MOCK_AGENT_TRACE } from "../data/mock-agent-trace";
import { type AgentTraceRange, AgentTraceRecordKind } from "../types/agent-trace";
import { formatTraceDuration } from "../utils/format-trace-duration";
import { TraceDetailPanel } from "./trace-detail-panel";
import { TraceEventList } from "./trace-event-list";
import { TraceTimeline } from "./trace-timeline";

const FULL_TRACE_RANGE = {
  endMs: MOCK_AGENT_TRACE.durationMs,
  startMs: 0,
} as const satisfies AgentTraceRange;

const INITIAL_TRACE_RANGE = {
  endMs: 3_520,
  startMs: 540,
} as const satisfies AgentTraceRange;

function isRecordInRange(startMs: number, durationMs: number, range: AgentTraceRange): boolean {
  return startMs <= range.endMs && startMs + durationMs >= range.startMs;
}

export function AgentTraceView() {
  const [range, setRange] = useState<AgentTraceRange>(INITIAL_TRACE_RANGE);
  const [search, setSearch] = useState("");
  const [selectedRecordId, setSelectedRecordId] = useState<string | null>(
    MOCK_AGENT_TRACE.records[3]?.id ?? null,
  );

  const records = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return MOCK_AGENT_TRACE.records;

    return MOCK_AGENT_TRACE.records.filter((record) =>
      `${record.label} ${record.preview} ${record.source}`.toLowerCase().includes(query),
    );
  }, [search]);

  const selectedRecord =
    MOCK_AGENT_TRACE.records.find((record) => record.id === selectedRecordId) ?? null;
  const visibleRecordCount = records.filter((record) =>
    isRecordInRange(record.startMs, record.durationMs, range),
  ).length;
  const turnCount = new Set(
    MOCK_AGENT_TRACE.records.filter((record) => record.turn > 0).map((record) => record.turn),
  ).size;
  const toolCallCount = MOCK_AGENT_TRACE.records.filter(
    (record) => record.kind === AgentTraceRecordKind.TOOL_CALL,
  ).length;
  const isFullRange =
    range.startMs === FULL_TRACE_RANGE.startMs && range.endMs === FULL_TRACE_RANGE.endMs;

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-background pr-6 pl-12">
      <div className="flex shrink-0 flex-wrap items-center gap-3 border-b border-separator py-2">
        <span className="flex items-center gap-1.5 text-xs text-muted">
          <Clock3 className="size-3.5" />
          {formatTraceDuration(MOCK_AGENT_TRACE.durationMs)}
        </span>
        <span className="flex items-center gap-1.5 text-xs text-muted">
          <ListTree className="size-3.5" />
          {turnCount} 轮
        </span>
        <span className="flex items-center gap-1.5 text-xs text-muted">
          <Wrench className="size-3.5" />
          {toolCallCount} 次调用
        </span>
        <Chip size="sm" variant="soft">
          范围内 {visibleRecordCount}/{records.length}
        </Chip>
        <span className="min-w-0 flex-1" />
        <Button
          isDisabled={isFullRange}
          size="sm"
          variant="tertiary"
          onPress={() => setRange(FULL_TRACE_RANGE)}
        >
          <RotateCcw className="size-3.5" />
          重置范围
        </Button>
        <div className="relative min-w-48 max-w-64 flex-1 sm:flex-none">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 z-10 size-3.5 -translate-y-1/2 text-muted" />
          <TextField
            aria-label="搜索轨迹记录"
            fullWidth
            value={search}
            variant="secondary"
            onChange={setSearch}
          >
            <Input className="h-8 pl-8 text-xs" placeholder="搜索轨迹" />
          </TextField>
        </div>
      </div>

      <TraceTimeline
        durationMs={MOCK_AGENT_TRACE.durationMs}
        range={range}
        records={records}
        onRangeChange={setRange}
      />

      <Resizable className="min-h-0 flex-1" orientation="horizontal">
        <Resizable.Panel
          defaultSize={selectedRecord ? "58%" : "100%"}
          id="agent-trace-records"
          minSize="240px"
        >
          <TraceEventList
            range={range}
            records={records}
            selectedRecordId={selectedRecordId}
            onSelect={(record) => setSelectedRecordId(record.id)}
          />
        </Resizable.Panel>

        {selectedRecord
          ? [
              <Resizable.Handle
                aria-label="调整轨迹列表与详情宽度"
                key="agent-trace-detail-handle"
                type="line"
                variant="primary"
              />,
              <Resizable.Panel
                defaultSize="42%"
                id="agent-trace-detail"
                key="agent-trace-detail"
                maxSize="65%"
                minSize="280px"
              >
                <TraceDetailPanel
                  key={selectedRecord.id}
                  record={selectedRecord}
                  onClose={() => setSelectedRecordId(null)}
                />
              </Resizable.Panel>,
            ]
          : null}
      </Resizable>
    </div>
  );
}
