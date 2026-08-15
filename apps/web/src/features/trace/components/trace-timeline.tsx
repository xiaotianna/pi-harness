"use client";

import type { PointerEvent as ReactPointerEvent } from "react";
import { useRef } from "react";
import { AGENT_TRACE_KIND_STYLES, AGENT_TRACE_LANE_LABELS } from "../constants/agent-trace";
import { AgentTraceLane, type AgentTraceRange, type AgentTraceRecord } from "../types/agent-trace";
import { formatTraceDuration } from "../utils/format-trace-duration";

const TIMELINE_LANES = [AgentTraceLane.INPUT, AgentTraceLane.MODEL, AgentTraceLane.TOOLS] as const;
const MINIMUM_RANGE_MS = 240;

interface TraceTurnStart {
  startMs: number;
  turn: number;
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

export interface TraceTimelineProps {
  durationMs: number;
  range: AgentTraceRange;
  records: readonly AgentTraceRecord[];
  onRangeChange: (range: AgentTraceRange) => void;
}

export function TraceTimeline({ durationMs, range, records, onRangeChange }: TraceTimelineProps) {
  const dragStartRef = useRef<number | null>(null);

  const resolveTime = (event: ReactPointerEvent<HTMLElement>): number => {
    const bounds = event.currentTarget.getBoundingClientRect();
    const ratio = clamp((event.clientX - bounds.left) / bounds.width, 0, 1);
    return ratio * durationMs;
  };

  const handlePointerDown = (event: ReactPointerEvent<HTMLElement>) => {
    if (event.button !== 0) return;

    const startMs = resolveTime(event);
    dragStartRef.current = startMs;
    event.currentTarget.setPointerCapture(event.pointerId);
    onRangeChange({ endMs: startMs, startMs });
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLElement>) => {
    if (dragStartRef.current === null) return;
    onRangeChange(normalizeRange(dragStartRef.current, resolveTime(event), durationMs));
  };

  const handlePointerUp = (event: ReactPointerEvent<HTMLElement>) => {
    const startMs = dragStartRef.current;
    if (startMs === null) return;

    dragStartRef.current = null;
    onRangeChange(normalizeRange(startMs, resolveTime(event), durationMs));
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  const selectionStart = Math.min(range.startMs, range.endMs);
  const selectionEnd = Math.max(range.startMs, range.endMs);
  const turnStarts = getTraceTurnStarts(records);

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
        aria-label={`Agent 时间轴，已选择 ${formatTraceDuration(selectionStart)} 到 ${formatTraceDuration(selectionEnd)}`}
        className="relative grid h-9 touch-none cursor-crosshair grid-rows-[repeat(3,8px)] gap-y-1.5 overflow-hidden"
        onPointerCancel={handlePointerUp}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      >
        {TIMELINE_LANES.map((lane) => (
          <div className="relative h-2" key={lane}>
            {records
              .filter((record) => record.lane === lane)
              .map((record) => (
                <span
                  className={`absolute inset-y-0 ${AGENT_TRACE_KIND_STYLES[record.kind].timelineClassName}`}
                  key={record.id}
                  style={{
                    left: `${(record.startMs / durationMs) * 100}%`,
                    width: `${Math.max((record.durationMs / durationMs) * 100, 0.7)}%`,
                  }}
                  title={`${record.label} · ${formatTraceDuration(record.durationMs)}`}
                />
              ))}
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
          aria-hidden
          className="absolute inset-y-0 border-x-[3px] border-accent bg-accent/10"
          style={{
            left: `${(selectionStart / durationMs) * 100}%`,
            width: `${((selectionEnd - selectionStart) / durationMs) * 100}%`,
          }}
        />
      </div>
    </div>
  );
}
