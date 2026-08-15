"use client";

import { EmptyState } from "@agile-avocation/ui-pro/empty-state";
import { Button, Chip } from "@heroui/react";
import { Clock3, SearchX } from "lucide-react";
import { AGENT_TRACE_KIND_COLORS, AGENT_TRACE_KIND_LABELS } from "../constants/agent-trace";
import type { AgentTraceRange, AgentTraceRecord } from "../types/agent-trace";
import { formatTraceDuration } from "../utils/format-trace-duration";

function isRecordInRange(record: AgentTraceRecord, range: AgentTraceRange): boolean {
  const recordEnd = record.startMs + record.durationMs;
  return record.startMs <= range.endMs && recordEnd >= range.startMs;
}

export interface TraceEventListProps {
  range: AgentTraceRange;
  records: readonly AgentTraceRecord[];
  selectedRecordId: string | null;
  onSelect: (record: AgentTraceRecord) => void;
}

export function TraceEventList({
  range,
  records,
  selectedRecordId,
  onSelect,
}: TraceEventListProps) {
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
    <div className="h-full overflow-auto bg-background">
      {records.map((record) => {
        const isInRange = isRecordInRange(record, range);
        const isSelected = record.id === selectedRecordId;

        return (
          <Button
            fullWidth
            aria-label={`查看轨迹记录：${record.label}`}
            className={`relative h-auto justify-start rounded-none px-3 py-2 text-left ${isSelected ? "bg-default" : ""} ${isInRange ? "opacity-100" : "opacity-35"}`}
            data-current={isSelected || undefined}
            key={record.id}
            variant="ghost"
            onPress={() => onSelect(record)}
          >
            {isSelected ? <span className="absolute inset-y-0 left-0 w-0.5 bg-accent" /> : null}
            <span className="grid min-w-0 flex-1 grid-cols-[76px_minmax(0,1fr)_auto] items-center gap-3">
              <Chip color={AGENT_TRACE_KIND_COLORS[record.kind]} size="sm" variant="soft">
                {AGENT_TRACE_KIND_LABELS[record.kind]}
              </Chip>
              <span className="min-w-0">
                <span className="block truncate text-xs font-medium text-foreground">
                  {record.label}
                </span>
                <span className="block truncate text-[11px] text-muted">{record.preview}</span>
              </span>
              <span className="flex items-center gap-1 text-[11px] tabular-nums text-muted">
                <Clock3 className="size-3" />
                {formatTraceDuration(record.durationMs)}
              </span>
            </span>
          </Button>
        );
      })}
    </div>
  );
}
