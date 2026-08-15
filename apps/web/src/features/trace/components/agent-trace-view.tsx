"use client";

import { Button, Chip, Input, TextField } from "@heroui/react";
import { Clock3, ListTree, RotateCcw, Search, Wrench } from "lucide-react";
import { useMemo, useState } from "react";
import { MOCK_AGENT_TRACE } from "../data/mock-agent-trace";
import { type AgentTraceRange, AgentTraceRecordKind } from "../types/agent-trace";
import { formatTraceDuration } from "../utils/format-trace-duration";
import { isTraceRecordInRange } from "../utils/is-trace-record-in-range";
import { TraceDetailPanel } from "./trace-detail-panel";
import { TraceEventList } from "./trace-event-list";
import { TraceTimeline } from "./trace-timeline";

const FULL_TRACE_RANGE = {
  endMs: MOCK_AGENT_TRACE.durationMs,
  startMs: 0,
} as const satisfies AgentTraceRange;

const INITIAL_TRACE_RANGE = {
  endMs: 8_520,
  startMs: 120,
} as const satisfies AgentTraceRange;

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
  const selectedStep = selectedRecord
    ? MOCK_AGENT_TRACE.records
        .filter((record) => record.turn === selectedRecord.turn)
        .findIndex((record) => record.id === selectedRecord.id) + 1
    : 0;
  const visibleRecordCount = records.filter((record) =>
    isTraceRecordInRange(record.startMs, record.durationMs, range),
  ).length;
  const turnCount = new Set(
    MOCK_AGENT_TRACE.records.filter((record) => record.turn > 0).map((record) => record.turn),
  ).size;
  const toolCallCount = new Set(
    MOCK_AGENT_TRACE.records
      .filter((record) => record.kind === AgentTraceRecordKind.TOOL)
      .map((record) => record.raw.toolCallId),
  ).size;
  const isFullRange =
    range.startMs === FULL_TRACE_RANGE.startMs && range.endMs === FULL_TRACE_RANGE.endMs;

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-background pr-6 pl-10">
      <div className="shrink-0">
        <div className="flex flex-wrap items-center gap-2 border-b border-separator py-1">
          <span className="flex items-center gap-1 text-[11px] tabular-nums text-muted">
            <Clock3 className="size-3" />
            {formatTraceDuration(MOCK_AGENT_TRACE.durationMs)}
          </span>
          <span className="flex items-center gap-1 text-[11px] text-muted">
            <ListTree className="size-3" />
            {turnCount} 轮
          </span>
          <span className="flex items-center gap-1 text-[11px] text-muted">
            <Wrench className="size-3" />
            {toolCallCount} 次调用
          </span>
          <Chip className="h-5 min-h-5 text-[11px]" size="sm" variant="soft">
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
          <div className="relative min-w-40 max-w-56 flex-1 sm:flex-none">
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
          durationMs={MOCK_AGENT_TRACE.durationMs}
          range={range}
          records={records}
          onRangeChange={setRange}
        />
      </div>

      <div className="flex min-h-0 flex-1">
        <div className="min-h-0 min-w-[280px] flex-1 overflow-hidden">
          <TraceEventList
            range={range}
            records={records}
            selectedRecordId={selectedRecordId}
            onSelect={(record) => setSelectedRecordId(record.id)}
          />
        </div>

        {selectedRecord ? (
          <div className="flex min-h-0 min-w-0 w-[clamp(320px,38%,440px)] max-w-[calc(100%-280px)] flex-col border-l border-separator">
            <TraceDetailPanel
              key={selectedRecord.id}
              record={selectedRecord}
              step={selectedStep}
              onClose={() => setSelectedRecordId(null)}
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}
