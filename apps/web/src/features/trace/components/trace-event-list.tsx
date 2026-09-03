"use client";

import { EmptyState } from "@agile-avocation/ui-pro/empty-state";
import { Button, Tooltip } from "@heroui/react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { SearchX } from "lucide-react";
import { memo, useEffect, useMemo, useRef } from "react";
import { AGENT_TRACE_EVENT_ROW_HEIGHT } from "../constants/agent-trace";
import type { AgentTraceRange, AgentTraceRecord } from "../types/agent-trace";
import { getTraceEventRowText } from "../utils/get-trace-event-row-text";
import { isTraceRecordInRange } from "../utils/is-trace-record-in-range";
import { TraceKindChip } from "./trace-kind-chip";

interface TraceEventListItem {
  isTurnStart: boolean;
  record: AgentTraceRecord;
}

function toTraceEventListItems(records: readonly AgentTraceRecord[]): TraceEventListItem[] {
  return records.map((record, index) => {
    const previous = records[index - 1];
    const hasTurn = record.turn > 0;

    return {
      isTurnStart: hasTurn && record.turn !== previous?.turn,
      record,
    };
  });
}

function TraceTurnRail({
  isRecordSelected,
  isTurnSelected,
  isTurnStart,
  turn,
}: {
  isRecordSelected: boolean;
  isTurnSelected: boolean;
  isTurnStart: boolean;
  turn: number;
}) {
  return (
    <span className="relative w-10 shrink-0 self-stretch">
      {turn > 0 && isTurnStart ? (
        <span
          className={`absolute top-0 left-0 z-20 rounded-sm px-1 py-0.5 text-[9px] leading-none font-medium tabular-nums ${
            isTurnSelected ? "bg-accent/12 text-accent" : "bg-default text-foreground"
          }`}
        >
          Turn {turn}
        </span>
      ) : null}
      {isRecordSelected ? (
        <span className="absolute inset-y-0 left-0 z-10 w-[3px] bg-accent" />
      ) : null}
    </span>
  );
}

const TRACE_EVENT_ROW_BUTTON_CLASS_NAME =
  "h-[30px]! min-h-[30px]! transform-none! items-stretch! justify-start rounded-none! border-b border-separator/70 px-0 py-0 text-left";

const TRACE_EVENT_ROW_SELECTED_CLASS_NAME =
  "[--button-bg:color-mix(in_oklab,var(--accent)_10%,transparent)] [--button-bg-hover:color-mix(in_oklab,var(--accent)_10%,transparent)] [--button-bg-pressed:color-mix(in_oklab,var(--accent)_12%,transparent)]";

export interface TraceEventListProps {
  range: AgentTraceRange | null;
  records: readonly AgentTraceRecord[];
  selectedRecordId: string | null;
  selectedRequestRecordId: string | null;
  onOpenRequest: (recordId: string) => void;
  onSelect: (record: AgentTraceRecord) => void;
}

export const TraceEventList = memo(function TraceEventList({
  range,
  records,
  selectedRecordId,
  selectedRequestRecordId,
  onOpenRequest,
  onSelect,
}: TraceEventListProps) {
  const parentRef = useRef<HTMLDivElement>(null);
  const items = useMemo(() => toTraceEventListItems(records), [records]);
  const selectedIndex = useMemo(
    () =>
      selectedRequestRecordId === null
        ? items.findIndex((item) => item.record.id === selectedRecordId)
        : -1,
    [items, selectedRecordId, selectedRequestRecordId],
  );
  const selectedTurn = selectedIndex >= 0 ? (items[selectedIndex]?.record.turn ?? null) : null;
  const virtualizer = useVirtualizer({
    count: items.length,
    estimateSize: () => AGENT_TRACE_EVENT_ROW_HEIGHT,
    getItemKey: (index) => items[index]?.record.id ?? index,
    getScrollElement: () => parentRef.current,
    overscan: 16,
  });

  useEffect(() => {
    if (selectedIndex < 0) return;

    virtualizer.scrollToIndex(selectedIndex, { align: "auto" });
  }, [selectedIndex, virtualizer]);

  if (records.length === 0) {
    return (
      <div className="grid h-full place-items-center bg-background">
        <EmptyState size="sm">
          <EmptyState.Header>
            <EmptyState.Media variant="icon">
              <SearchX className="size-5" />
            </EmptyState.Media>
            <EmptyState.Title>未找到轨迹记录</EmptyState.Title>
            <EmptyState.Description>尝试调整搜索关键词</EmptyState.Description>
          </EmptyState.Header>
        </EmptyState>
      </div>
    );
  }

  return (
    <div
      className="h-full min-h-0 overflow-x-hidden overflow-y-auto bg-background pb-12"
      ref={parentRef}
      style={{ contain: "strict" }}
    >
      <ul
        aria-label="轨迹事件"
        className="relative m-0 w-full list-none p-0"
        style={{ height: virtualizer.getTotalSize() }}
      >
        {virtualizer.getVirtualItems().map((virtualItem) => {
          const item = items[virtualItem.index];
          if (!item) return null;

          const { record, isTurnStart } = item;
          const isInRange = isTraceRecordInRange(record.startMs, record.durationMs, range);
          const isSelected = selectedRequestRecordId === null && record.id === selectedRecordId;

          return (
            <li
              className="absolute top-0 right-0 left-0"
              key={virtualItem.key}
              style={{
                height: virtualItem.size,
                transform: `translateY(${virtualItem.start}px)`,
              }}
            >
              {record.request !== undefined ? (
                <Tooltip delay={0}>
                  <Button
                    aria-label={`查看 Request #${record.request}`}
                    aria-pressed={selectedRequestRecordId === record.id}
                    className="group absolute top-0 left-2.5 z-40 h-5! min-h-5! w-5! min-w-5! -translate-x-1/2 -translate-y-1/2 rounded-full! p-0! [--button-bg:transparent] [--button-bg-hover:transparent] [--button-bg-pressed:transparent]"
                    size="sm"
                    variant="ghost"
                    onPress={() => onOpenRequest(record.id)}
                  >
                    <span
                      aria-hidden
                      className={`rounded-full border-2 ${
                        selectedRequestRecordId === record.id
                          ? "size-2 border-accent bg-accent/20"
                          : "size-2 border-background bg-muted group-hover:bg-accent group-focus-visible:bg-accent"
                      }`}
                    />
                  </Button>
                  <Tooltip.Content placement="right">Request #{record.request}</Tooltip.Content>
                </Tooltip>
              ) : null}
              <Button
                fullWidth
                aria-label={`查看轨迹记录：${record.label}`}
                aria-selected={isSelected}
                className={`${TRACE_EVENT_ROW_BUTTON_CLASS_NAME} ${isSelected ? TRACE_EVENT_ROW_SELECTED_CLASS_NAME : ""} ${isInRange ? "opacity-100" : "opacity-40"}`}
                data-current={isSelected || undefined}
                size="sm"
                variant="ghost"
                onPress={() => onSelect(record)}
              >
                <span className="flex h-full min-w-0 w-full items-stretch">
                  <TraceTurnRail
                    isRecordSelected={isSelected}
                    isTurnSelected={record.turn === selectedTurn}
                    isTurnStart={isTurnStart}
                    turn={record.turn}
                  />
                  <span className="flex min-w-0 flex-1 items-center gap-2 pr-3">
                    <span className="flex w-20 shrink-0 justify-end">
                      <TraceKindChip kind={record.kind} status={record.status} />
                    </span>
                    <span
                      className={`min-w-0 truncate text-xs ${isSelected ? "text-foreground" : "text-muted"}`}
                    >
                      {getTraceEventRowText(record)}
                    </span>
                  </span>
                </span>
              </Button>
            </li>
          );
        })}
      </ul>
    </div>
  );
});
