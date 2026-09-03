"use client";

import { Xmark as X } from "@gravity-ui/icons";
import { Button, Tooltip } from "@heroui/react";
import { motion, useReducedMotion } from "motion/react";
import { memo } from "react";
import { type AgentTraceRecord, AgentTraceRecordKind } from "../types/agent-trace";
import { ApprovalTraceDetails } from "./trace-details/approval-trace-details";
import { AssistantTraceDetails } from "./trace-details/assistant-trace-details";
import { ContextTraceDetails } from "./trace-details/context-trace-details";
import { RequestTraceDetails } from "./trace-details/request-trace-details";
import { RunTraceDetails } from "./trace-details/run-trace-details";
import { SystemTraceDetails } from "./trace-details/system-trace-details";
import { ToolTraceDetails } from "./trace-details/tool-trace-details";
import { UserTraceDetails } from "./trace-details/user-trace-details";
import { TraceKindChip } from "./trace-kind-chip";

const DETAIL_TRANSITION = {
  duration: 0.18,
  ease: [0.22, 1, 0.36, 1],
} as const;

export interface TraceDetailPanelProps {
  isRequestSelected: boolean;
  record: AgentTraceRecord;
  step: number;
  onClose: () => void;
  onOpenAssistant: (recordId: string) => void;
  onOpenRequest: (recordId: string) => void;
  onOpenToolCall: (toolCallId: string) => void;
}

function TraceDetails({
  isRequestSelected,
  record,
  onOpenAssistant,
  onOpenRequest,
  onOpenToolCall,
}: {
  isRequestSelected: boolean;
  record: AgentTraceRecord;
  onOpenAssistant: (recordId: string) => void;
  onOpenRequest: (recordId: string) => void;
  onOpenToolCall: (toolCallId: string) => void;
}) {
  if (isRequestSelected) {
    return <RequestTraceDetails record={record} onOpenAssistant={onOpenAssistant} />;
  }

  switch (record.kind) {
    case AgentTraceRecordKind.SYSTEM:
      return <SystemTraceDetails record={record} />;
    case AgentTraceRecordKind.CONTEXT:
      return <ContextTraceDetails record={record} />;
    case AgentTraceRecordKind.RUN:
      return <RunTraceDetails record={record} />;
    case AgentTraceRecordKind.USER:
      return <UserTraceDetails record={record} />;
    case AgentTraceRecordKind.TOOL:
      return <ToolTraceDetails record={record} onOpenAssistant={onOpenAssistant} />;
    case AgentTraceRecordKind.ASSISTANT:
      return (
        <AssistantTraceDetails
          record={record}
          onOpenRequest={onOpenRequest}
          onOpenToolCall={onOpenToolCall}
        />
      );
    case AgentTraceRecordKind.APPROVAL:
      return <ApprovalTraceDetails record={record} onOpenToolCall={onOpenToolCall} />;
  }
}

export const TraceDetailPanel = memo(function TraceDetailPanel({
  isRequestSelected,
  record,
  step,
  onClose,
  onOpenAssistant,
  onOpenRequest,
  onOpenToolCall,
}: TraceDetailPanelProps) {
  const shouldReduceMotion = useReducedMotion();

  return (
    <motion.aside
      animate={{ opacity: 1, x: 0 }}
      className="flex h-full min-h-0 flex-col bg-background [&_[role=tabpanel]]:pb-12!"
      initial={shouldReduceMotion ? false : { opacity: 0, x: 16 }}
      transition={shouldReduceMotion ? { duration: 0 } : DETAIL_TRANSITION}
    >
      <div className="flex h-9 shrink-0 items-center gap-2 border-b border-separator px-3">
        {isRequestSelected ? (
          <span aria-hidden className="size-2 shrink-0 rounded-full bg-accent" />
        ) : (
          <TraceKindChip kind={record.kind} status={record.status} />
        )}
        <span className="min-w-0 flex-1 truncate text-xs font-medium">
          {isRequestSelected ? `Request #${record.request ?? "—"}` : record.label}
        </span>
        <span className="shrink-0 text-[11px] text-muted">
          {record.turn > 0
            ? isRequestSelected
              ? `Turn ${record.turn}`
              : `Turn ${record.turn} · Step ${step}`
            : "Session 事件"}
        </span>
        <Tooltip delay={0}>
          <Button
            isIconOnly
            aria-label="关闭轨迹详情"
            className="-mr-2"
            size="sm"
            variant="ghost"
            onPress={onClose}
          >
            <X className="size-3.5" />
          </Button>
          <Tooltip.Content placement="left">关闭详情</Tooltip.Content>
        </Tooltip>
      </div>

      <TraceDetails
        isRequestSelected={isRequestSelected}
        record={record}
        onOpenAssistant={onOpenAssistant}
        onOpenRequest={onOpenRequest}
        onOpenToolCall={onOpenToolCall}
      />
    </motion.aside>
  );
});
