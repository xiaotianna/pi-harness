"use client";

import { Tooltip } from "@heroui/react";
import type { KeyboardEvent as ReactKeyboardEvent, PointerEvent as ReactPointerEvent } from "react";
import { memo, useEffect, useRef } from "react";
import {
  AGENT_TRACE_KIND_LABELS,
  AGENT_TRACE_KIND_STYLES,
  AGENT_TRACE_LANE_LABELS,
  AGENT_TRACE_RUN_STATUS_TIMELINE_CLASS_NAMES,
} from "../constants/agent-trace";
import {
  AgentTraceLane,
  type AgentTraceRange,
  type AgentTraceRecord,
  AgentTraceRecordKind,
} from "../types/agent-trace";
import { formatTraceDuration } from "../utils/format-trace-duration";

const TIMELINE_LANES = [AgentTraceLane.INPUT, AgentTraceLane.MODEL, AgentTraceLane.TOOLS] as const;
const TRACE_RECORD_TOOLTIP_DELAY_MS = 1_000;

interface TraceTurnStart {
  index: number;
  turn: number;
}

interface TraceTimelineConnection {
  id: string;
  index: number;
}

interface TraceTimelineRecordProps {
  index: number;
  isSelected: boolean;
  record: AgentTraceRecord;
  recordCount: number;
  onSelect: (record: AgentTraceRecord) => void;
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(Math.max(value, minimum), maximum);
}

function normalizeRange(startIndex: number, endIndex: number): AgentTraceRange {
  return {
    endIndex: Math.max(startIndex, endIndex),
    startIndex: Math.min(startIndex, endIndex),
  };
}

function getTraceTurnStarts(records: readonly AgentTraceRecord[]): TraceTurnStart[] {
  const indexByTurn = new Map<number, number>();

  for (const [index, record] of records.entries()) {
    if (record.turn > 0 && !indexByTurn.has(record.turn)) indexByTurn.set(record.turn, index);
  }

  return Array.from(indexByTurn, ([turn, index]) => ({ index, turn }));
}

function getApprovalToolConnections(
  records: readonly AgentTraceRecord[],
): TraceTimelineConnection[] {
  const toolsByCallId = new Map<string, { index: number; record: AgentTraceRecord }>();

  for (const [index, record] of records.entries()) {
    if (record.kind !== AgentTraceRecordKind.TOOL) continue;
    const toolCallId = record.raw.toolCallId;
    if (typeof toolCallId === "string") toolsByCallId.set(toolCallId, { index, record });
  }

  return records.flatMap((record) => {
    if (record.kind !== AgentTraceRecordKind.APPROVAL) return [];
    const toolCallId = record.raw.toolCallId;
    if (typeof toolCallId !== "string") return [];
    const tool = toolsByCallId.get(toolCallId);
    const handoffTimeMs = record.startMs + record.durationMs;
    return tool?.record.startMs === handoffTimeMs
      ? [{ id: `${record.id}:${tool.record.id}`, index: tool.index }]
      : [];
  });
}

function TraceTimelineRecord({
  index,
  isSelected,
  record,
  recordCount,
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
          left: `${(index / recordCount) * 100}%`,
          width: `${100 / recordCount}%`,
        }}
        onClick={() => onSelect(record)}
        onKeyDown={handleKeyDown}
      >
        <span
          aria-hidden
          className={`block size-full rounded-[1px] ${
            record.kind === AgentTraceRecordKind.RUN
              ? AGENT_TRACE_RUN_STATUS_TIMELINE_CLASS_NAMES[record.status]
              : AGENT_TRACE_KIND_STYLES[record.kind].timelineClassName
          }`}
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
  range: AgentTraceRange | null;
  records: readonly AgentTraceRecord[];
  selectedRecordId: string | null;
  onRangeChange: (range: AgentTraceRange | null) => void;
  onSelectRecord: (record: AgentTraceRecord) => void;
}

export const TraceTimeline = memo(function TraceTimeline({
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

    if (!nextRange || records.length === 0) {
      indicator.style.opacity = "0";
      return;
    }

    indicator.style.left = `${(nextRange.startIndex / records.length) * 100}%`;
    indicator.style.width = `${((nextRange.endIndex - nextRange.startIndex + 1) / records.length) * 100}%`;
    indicator.style.opacity = "1";
  };

  useEffect(() => {
    updateSelectionIndicator(range);
  }, [range, records.length]);

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

  const resolveIndex = (event: ReactPointerEvent<HTMLElement>): number => {
    const bounds = event.currentTarget.getBoundingClientRect();
    const ratio = clamp((event.clientX - bounds.left) / bounds.width, 0, 1);
    return clamp(Math.floor(ratio * records.length), 0, records.length - 1);
  };

  const updateHoverIndicator = (event: ReactPointerEvent<HTMLElement>) => {
    const indicator = hoverIndicatorRef.current;
    if (!indicator) return;
    if (records.length === 0) {
      indicator.style.opacity = "0";
      return;
    }

    indicator.style.left = `${((resolveIndex(event) + 0.5) / records.length) * 100}%`;
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

    const startIndex = resolveIndex(event);
    if (startIndex < 0) return;
    dragStartRef.current = startIndex;
    event.currentTarget.setPointerCapture(event.pointerId);
    updateSelectionIndicator({ endIndex: startIndex, startIndex });
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLElement>) => {
    updateHoverIndicator(event);

    if (dragStartRef.current !== null) {
      updateSelectionIndicator(normalizeRange(dragStartRef.current, resolveIndex(event)));
    }
  };

  const handlePointerUp = (event: ReactPointerEvent<HTMLElement>) => {
    const startIndex = dragStartRef.current;
    if (startIndex === null) return;

    dragStartRef.current = null;
    const nextRange = normalizeRange(startIndex, resolveIndex(event));
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

  const turnStarts = getTraceTurnStarts(records);
  const approvalToolConnections = getApprovalToolConnections(records);
  const timelineLabel =
    range !== null
      ? `Agent 事件轨迹，已选择第 ${range.startIndex + 1} 到第 ${range.endIndex + 1} 个事件`
      : "Agent 事件轨迹，当前显示全部记录";

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
        {approvalToolConnections.map((connection) => (
          <span
            aria-hidden
            className="pointer-events-none absolute top-1 bottom-1 z-10 w-px bg-warning/60"
            key={connection.id}
            style={{ left: `${(connection.index / records.length) * 100}%` }}
          />
        ))}
        {TIMELINE_LANES.map((lane) => (
          <div className="relative h-2" key={lane}>
            {records.map((record, index) => {
              if (record.lane !== lane) return null;
              const isSelected = record.id === selectedRecordId;

              return (
                <TraceTimelineRecord
                  index={index}
                  isSelected={isSelected}
                  key={record.id}
                  record={record}
                  recordCount={records.length}
                  onSelect={handleRecordSelect}
                />
              );
            })}
          </div>
        ))}
      </section>
      <div className="pointer-events-none absolute inset-y-0 right-0 left-10 z-20">
        {turnStarts.map(({ index, turn }) => (
          <span
            aria-hidden
            className="absolute inset-y-0 w-px bg-separator"
            key={turn}
            style={{ left: `${(index / records.length) * 100}%` }}
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
