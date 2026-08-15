"use client";

import type { PointerEvent as ReactPointerEvent } from "react";
import { useRef } from "react";
import {
  AGENT_TRACE_LANE_LABELS,
  AGENT_TRACE_TIMELINE_CLASS_NAMES,
} from "../constants/agent-trace";
import { AgentTraceLane, type AgentTraceRange, type AgentTraceRecord } from "../types/agent-trace";
import { formatTraceDuration } from "../utils/format-trace-duration";

const TIMELINE_LANES = [AgentTraceLane.INPUT, AgentTraceLane.MODEL, AgentTraceLane.TOOLS] as const;
const MINIMUM_RANGE_MS = 240;

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

  return (
    <div className="grid grid-cols-[64px_minmax(0,1fr)] border-b border-separator bg-background py-3">
      <div className="grid grid-rows-3 gap-1 pr-3 text-right text-[11px] leading-5 text-muted">
        {TIMELINE_LANES.map((lane) => (
          <span key={lane}>{AGENT_TRACE_LANE_LABELS[lane]}</span>
        ))}
      </div>
      <section
        aria-label={`Agent 时间轴，已选择 ${formatTraceDuration(selectionStart)} 到 ${formatTraceDuration(selectionEnd)}`}
        className="relative grid touch-none cursor-crosshair grid-rows-3 gap-1 overflow-hidden rounded-lg bg-default/45 p-1"
        onPointerCancel={handlePointerUp}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      >
        {TIMELINE_LANES.map((lane) => (
          <div className="relative h-4" key={lane}>
            {records
              .filter((record) => record.lane === lane)
              .map((record) => (
                <span
                  className={`absolute inset-y-0 rounded-sm ${AGENT_TRACE_TIMELINE_CLASS_NAMES[record.kind]}`}
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
        <span
          aria-hidden
          className="pointer-events-none absolute inset-y-0 border-x-2 border-accent bg-accent/10"
          style={{
            left: `${(selectionStart / durationMs) * 100}%`,
            width: `${((selectionEnd - selectionStart) / durationMs) * 100}%`,
          }}
        />
      </section>
    </div>
  );
}
