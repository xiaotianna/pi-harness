"use client";

import { Tooltip } from "@heroui/react";
import type { KeyboardEvent as ReactKeyboardEvent, PointerEvent as ReactPointerEvent } from "react";
import { memo, useEffect, useRef } from "react";
import {
  AGENT_TRACE_KIND_LABELS,
  AGENT_TRACE_KIND_STYLES,
  AGENT_TRACE_LANE_LABELS,
} from "../constants/agent-trace";
import { AgentTraceLane, type AgentTraceRange, type AgentTraceRecord } from "../types/agent-trace";
import { formatTraceDuration } from "../utils/format-trace-duration";

const TIMELINE_LANES = [AgentTraceLane.INPUT, AgentTraceLane.MODEL, AgentTraceLane.TOOLS] as const;
const MINIMUM_RANGE_MS = 240;
const TRACE_RECORD_TOOLTIP_DELAY_MS = 1_000;

interface TraceTurnStart {
  startMs: number;
  turn: number;
}

interface TraceTimelineRecordProps {
  durationMs: number;
  isSelected: boolean;
  record: AgentTraceRecord;
  onSelect: (record: AgentTraceRecord) => void;
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(Math.max(value, minimum), maximum);
}

function normalizeRange(startMs: number, endMs: number, durationMs: number): AgentTraceRange {
  const rangeStart = Math.min(startMs, endMs);
  const rangeEnd = Math.max(startMs, endMs);

  if (rangeEnd - rangeStart >= MINIMUM_RANGE_MS) {
    return { endMs: rangeEnd, startMs: rangeStart };
  }

  const center = (rangeStart + rangeEnd) / 2;
  const expandedStart = clamp(center - MINIMUM_RANGE_MS / 2, 0, durationMs);
  const expandedEnd = clamp(expandedStart + MINIMUM_RANGE_MS, 0, durationMs);

  return {
    endMs: expandedEnd,
    startMs: Math.max(0, expandedEnd - MINIMUM_RANGE_MS),
  };
}

function getTraceTurnStarts(records: readonly AgentTraceRecord[]): TraceTurnStart[] {
  const startMsByTurn = new Map<number, number>();

  for (const record of records) {
    if (record.turn <= 0) continue;

    const currentStartMs = startMsByTurn.get(record.turn);
    if (currentStartMs === undefined || record.startMs < currentStartMs) {
      startMsByTurn.set(record.turn, record.startMs);
    }
  }

  return Array.from(startMsByTurn, ([turn, startMs]) => ({ startMs, turn })).sort(
    (left, right) => left.startMs - right.startMs,
  );
}

function TraceTimelineRecord({
  durationMs,
  isSelected,
  record,
  onSelect,
}: TraceTimelineRecordProps) {
  const endMs = record.startMs + record.durationMs;
  const handleKeyDown = (event: ReactKeyboardEvent<HTMLElement>) => {
    if (event.key !== "Enter" && event.key !== " ") return;

    event.preventDefault();
    onSelect(record);
  };

  return (
    <Tooltip delay={TRACE_RECORD_TOOLTIP_DELAY_MS}>
      <Tooltip.Trigger
        aria-current={isSelected || undefined}
        aria-label={`${record.label}，${formatTraceDuration(record.startMs)} 到 ${formatTraceDuration(endMs)}`}
        className={`group absolute inset-y-0 cursor-[var(--cursor-interactive)] ${isSelected ? "z-40" : "hover:z-40"}`}
        data-trace-timeline-record
        style={{
          left: `${(record.startMs / durationMs) * 100}%`,
          width: `${Math.max((record.durationMs / durationMs) * 100, 0.7)}%`,
        }}
        onClick={() => onSelect(record)}
        onKeyDown={handleKeyDown}
      >
        <span
          aria-hidden
          className={`block size-full rounded-[1px] ${AGENT_TRACE_KIND_STYLES[record.kind].timelineClassName}`}
        />
        <span
          aria-hidden
          className={`pointer-events-none absolute -inset-0.5 rounded-[3px] border border-accent ${
            isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-100"
          }`}
        />
      </Tooltip.Trigger>
      <Tooltip.Content className="flex flex-col gap-0.5 whitespace-nowrap" placement="bottom">
        <span className="font-semibold">{AGENT_TRACE_KIND_LABELS[record.kind]}</span>
        <span>{record.label}</span>
        <span className="tabular-nums text-muted">
          {formatTraceDuration(record.startMs)} → {formatTraceDuration(endMs)} · 总计{" "}
          {formatTraceDuration(record.durationMs)}
        </span>
      </Tooltip.Content>
    </Tooltip>
  );
}

export interface TraceTimelineProps {
  durationMs: number;
  range: AgentTraceRange | null;
  records: readonly AgentTraceRecord[];
  selectedRecordId: string | null;
  onRangeChange: (range: AgentTraceRange | null) => void;
  onSelectRecord: (record: AgentTraceRecord) => void;
}

export const TraceTimeline = memo(function TraceTimeline({
  durationMs,
  range,
  records,
  selectedRecordId,
  onRangeChange,
  onSelectRecord,
}: TraceTimelineProps) {
  const dragStartRef = useRef<number | null>(null);
  const hoverIndicatorRef = useRef<HTMLSpanElement>(null);
  const selectionIndicatorRef = useRef<HTMLSpanElement>(null);
  const timelineRef = useRef<HTMLElement>(null);

  const updateSelectionIndicator = (nextRange: AgentTraceRange | null) => {
    const indicator = selectionIndicatorRef.current;
    if (!indicator) return;

    if (!nextRange) {
      indicator.style.opacity = "0";
      return;
    }

    const startMs = Math.min(nextRange.startMs, nextRange.endMs);
    const endMs = Math.max(nextRange.startMs, nextRange.endMs);
    indicator.style.left = `${(startMs / durationMs) * 100}%`;
    indicator.style.width = `${((endMs - startMs) / durationMs) * 100}%`;
    indicator.style.opacity = "1";
  };

  useEffect(() => {
    updateSelectionIndicator(range);
  }, [durationMs, range]);

  useEffect(() => {
    if (range === null) return;

    const handleOutsidePointerDown = (event: PointerEvent) => {
      const timeline = timelineRef.current;
      const target = event.target;

      if (timeline && target instanceof Node && !timeline.contains(target)) {
        onRangeChange(null);
      }
    };

    document.addEventListener("pointerdown", handleOutsidePointerDown, true);
    return () => document.removeEventListener("pointerdown", handleOutsidePointerDown, true);
  }, [onRangeChange, range]);

  const resolveTime = (event: ReactPointerEvent<HTMLElement>): number => {
    const bounds = event.currentTarget.getBoundingClientRect();
    const ratio = clamp((event.clientX - bounds.left) / bounds.width, 0, 1);
    return ratio * durationMs;
  };

  const updateHoverIndicator = (event: ReactPointerEvent<HTMLElement>) => {
    const indicator = hoverIndicatorRef.current;
    if (!indicator) return;

    indicator.style.left = `${(resolveTime(event) / durationMs) * 100}%`;
    indicator.style.opacity = "1";
  };

  const handlePointerDown = (event: ReactPointerEvent<HTMLElement>) => {
    if (event.button !== 0) return;

    const target = event.target;
    if (target instanceof Element && target.closest("[data-trace-timeline-record]")) {
      dragStartRef.current = null;
      onRangeChange(null);
      return;
    }

    const startMs = resolveTime(event);
    dragStartRef.current = startMs;
    event.currentTarget.setPointerCapture(event.pointerId);
    updateSelectionIndicator({ endMs: startMs, startMs });
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLElement>) => {
    const currentTimeMs = resolveTime(event);
    updateHoverIndicator(event);

    if (dragStartRef.current !== null) {
      updateSelectionIndicator(normalizeRange(dragStartRef.current, currentTimeMs, durationMs));
    }
  };

  const handlePointerUp = (event: ReactPointerEvent<HTMLElement>) => {
    const startMs = dragStartRef.current;
    if (startMs === null) return;

    dragStartRef.current = null;
    const nextRange = normalizeRange(startMs, resolveTime(event), durationMs);
    updateSelectionIndicator(nextRange);
    onRangeChange(nextRange);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  const handleRecordSelect = (record: AgentTraceRecord) => {
    updateSelectionIndicator(null);
    onRangeChange(null);
    onSelectRecord(record);
  };

  const selectionStart = range ? Math.min(range.startMs, range.endMs) : null;
  const selectionEnd = range ? Math.max(range.startMs, range.endMs) : null;
  const turnStarts = getTraceTurnStarts(records);
  const timelineLabel =
    selectionStart !== null && selectionEnd !== null
      ? `Agent 时间轴，已选择 ${formatTraceDuration(selectionStart)} 到 ${formatTraceDuration(selectionEnd)}`
      : "Agent 时间轴，当前显示全部轨迹";

  return (
    <div className="relative grid h-[50px] grid-cols-[40px_minmax(0,1fr)] items-center border-b border-separator bg-background">
      <div className="grid h-9 grid-rows-[repeat(3,8px)] gap-y-1.5 pr-2 text-right text-[10px] leading-2 text-muted">
        {TIMELINE_LANES.map((lane) => (
          <span className="flex items-center justify-end" key={lane}>
            {AGENT_TRACE_LANE_LABELS[lane]}
          </span>
        ))}
      </div>
      <section
        ref={timelineRef}
        aria-label={timelineLabel}
        className="relative grid h-9 touch-none cursor-crosshair grid-rows-[repeat(3,8px)] gap-y-1.5 overflow-x-clip overflow-y-visible"
        onPointerCancel={handlePointerUp}
        onPointerDown={handlePointerDown}
        onPointerEnter={updateHoverIndicator}
        onPointerLeave={() => {
          if (hoverIndicatorRef.current) hoverIndicatorRef.current.style.opacity = "0";
        }}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      >
        {TIMELINE_LANES.map((lane) => (
          <div className="relative h-2" key={lane}>
            {records
              .filter((record) => record.lane === lane && record.durationMs > 0)
              .map((record) => {
                const isSelected = record.id === selectedRecordId;

                return (
                  <TraceTimelineRecord
                    durationMs={durationMs}
                    isSelected={isSelected}
                    key={record.id}
                    record={record}
                    onSelect={handleRecordSelect}
                  />
                );
              })}
          </div>
        ))}
      </section>
      <div className="pointer-events-none absolute inset-y-0 right-0 left-10 z-20">
        {turnStarts.map(({ startMs, turn }) => (
          <span
            aria-hidden
            className="absolute inset-y-0 w-px bg-separator"
            key={turn}
            style={{ left: `${(startMs / durationMs) * 100}%` }}
            title={`Turn ${turn}`}
          />
        ))}
      </div>
      <div className="pointer-events-none absolute inset-y-0 right-0 left-10 z-30">
        <span
          ref={selectionIndicatorRef}
          aria-hidden
          className="absolute inset-y-0 border-x-[3px] border-accent bg-accent/10 opacity-0"
        />
      </div>
      <div className="pointer-events-none absolute inset-y-0 right-0 left-10 z-50">
        <span
          ref={hoverIndicatorRef}
          aria-hidden
          className="absolute inset-y-0 w-px bg-accent opacity-0"
        />
      </div>
    </div>
  );
});
