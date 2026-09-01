"use client";

import {
  Clock as Clock3,
  Hierarchy as ListTree,
  Magnifier as Search,
  Wrench,
} from "@gravity-ui/icons";
import { Chip, Drawer, Input, ScrollShadow, TextField, useMediaQuery } from "@heroui/react";
import { useCallback, useDeferredValue, useEffect, useMemo, useState } from "react";
import { MOCK_AGENT_TRACE } from "../data/mock-agent-trace";
import {
  type AgentTraceRange,
  type AgentTraceRecord,
  AgentTraceRecordKind,
} from "../types/agent-trace";
import { formatTraceDuration } from "../utils/format-trace-duration";
import { isTraceRecordInRange } from "../utils/is-trace-record-in-range";
import { TraceDetailPanel } from "./trace-detail-panel";
import { TraceEventList } from "./trace-event-list";
import { TraceTimeline } from "./trace-timeline";

export function AgentTraceView() {
  const [range, setRange] = useState<AgentTraceRange | null>(null);
  const [search, setSearch] = useState("");
  const [isMobileDetailOpen, setIsMobileDetailOpen] = useState(false);
  const [selectedRecordId, setSelectedRecordId] = useState<string | null>(
    MOCK_AGENT_TRACE.records[3]?.id ?? null,
  );
  const isMobile = useMediaQuery("(max-width: 767px)");
  const deferredSearch = useDeferredValue(search);

  useEffect(() => {
    if (!isMobile) setIsMobileDetailOpen(false);
  }, [isMobile]);

  const records = useMemo(() => {
    const query = deferredSearch.trim().toLowerCase();
    if (!query) return MOCK_AGENT_TRACE.records;

    return MOCK_AGENT_TRACE.records.filter((record) =>
      `${record.label} ${record.preview} ${record.source}`.toLowerCase().includes(query),
    );
  }, [deferredSearch]);

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
  const hasRange = range !== null;
  const handleRecordSelect = useCallback(
    (record: AgentTraceRecord) => {
      setSelectedRecordId(record.id);
      if (isMobile) setIsMobileDetailOpen(true);
    },
    [isMobile],
  );

  const handleDetailClose = useCallback(() => {
    setSelectedRecordId(null);
  }, []);

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-background px-4 md:pr-6 md:pl-10">
      <div className="shrink-0">
        <div className="flex flex-col gap-2 border-b border-separator py-2 sm:flex-row sm:items-center sm:py-1">
          <ScrollShadow
            hideScrollBar
            className="w-full sm:w-auto sm:shrink-0"
            orientation="horizontal"
            size={16}
          >
            <div className="flex w-max items-center gap-2 pr-2 sm:pr-0">
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
                {hasRange
                  ? `范围内 ${visibleRecordCount}/${records.length}`
                  : `全部 ${records.length}`}
              </Chip>
            </div>
          </ScrollShadow>
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
          durationMs={MOCK_AGENT_TRACE.durationMs}
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
            onSelect={handleRecordSelect}
          />
        </div>

        {selectedRecord ? (
          <div className="hidden min-h-0 min-w-0 w-[clamp(320px,38%,440px)] max-w-[calc(100%-280px)] flex-col border-l border-separator md:flex">
            <TraceDetailPanel
              key={selectedRecord.id}
              record={selectedRecord}
              step={selectedStep}
              onClose={handleDetailClose}
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
                  key={selectedRecord.id}
                  record={selectedRecord}
                  step={selectedStep}
                  onClose={() => setIsMobileDetailOpen(false)}
                />
              </Drawer.Body>
            </Drawer.Dialog>
          </Drawer.Content>
        </Drawer.Backdrop>
      ) : null}
    </div>
  );
}
