"use client";

import { CodeBlock } from "@agile-avocation/ui-pro/code-block";
import { Button, Chip, Tabs, Tooltip } from "@heroui/react";
import { X } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import {
  AGENT_TRACE_LANE_LABELS,
  AGENT_TRACE_STATUS_COLORS,
  AGENT_TRACE_STATUS_LABELS,
} from "../constants/agent-trace";
import type { AgentTraceRecord } from "../types/agent-trace";
import { formatTraceDuration } from "../utils/format-trace-duration";
import { TraceKindChip } from "./trace-kind-chip";

const DETAIL_TRANSITION = {
  duration: 0.18,
  ease: [0.22, 1, 0.36, 1],
} as const;

export interface TraceDetailPanelProps {
  record: AgentTraceRecord;
  step: number;
  onClose: () => void;
}

export function TraceDetailPanel({ record, step, onClose }: TraceDetailPanelProps) {
  const shouldReduceMotion = useReducedMotion();
  const rawJson = JSON.stringify(record.raw, null, 2);

  return (
    <motion.aside
      animate={{ opacity: 1, x: 0 }}
      className="flex h-full min-h-0 flex-col bg-background"
      initial={shouldReduceMotion ? false : { opacity: 0, x: 16 }}
      transition={shouldReduceMotion ? { duration: 0 } : DETAIL_TRANSITION}
    >
      <div className="flex h-9 shrink-0 items-center gap-2 border-b border-separator px-3">
        <TraceKindChip kind={record.kind} />
        <span className="min-w-0 flex-1 truncate text-xs font-medium">{record.label}</span>
        <span className="shrink-0 text-[11px] text-muted">
          Turn {record.turn} · Step {step}
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

      <Tabs
        className="flex min-h-0 flex-1 flex-col gap-0!"
        defaultSelectedKey="summary"
        variant="secondary"
      >
        <Tabs.ListContainer className="shrink-0 px-2">
          <Tabs.List aria-label="轨迹详情分类">
            <Tabs.Tab className="text-xs" id="summary">
              摘要
              <Tabs.Indicator />
            </Tabs.Tab>
            <Tabs.Tab className="text-xs" id="preview">
              预览
              <Tabs.Indicator />
            </Tabs.Tab>
            <Tabs.Tab className="text-xs" id="raw">
              原始数据
              <Tabs.Indicator />
            </Tabs.Tab>
            <Tabs.Tab className="text-xs" id="source">
              来源
              <Tabs.Indicator />
            </Tabs.Tab>
          </Tabs.List>
        </Tabs.ListContainer>

        <Tabs.Panel className="mt-0! min-h-0 flex-1 overflow-auto px-3 py-2" id="summary">
          <dl className="grid grid-cols-[72px_minmax(0,1fr)] items-center gap-x-3 gap-y-1.5 text-xs">
            <dt className="text-muted">来源</dt>
            <dd>{record.source}</dd>
            <dt className="text-muted">状态</dt>
            <dd>
              <Chip color={AGENT_TRACE_STATUS_COLORS[record.status]} size="sm" variant="soft">
                {AGENT_TRACE_STATUS_LABELS[record.status]}
              </Chip>
            </dd>
            <dt className="text-muted">耗时</dt>
            <dd className="tabular-nums">{formatTraceDuration(record.durationMs)}</dd>
            <dt className="text-muted">开始时间</dt>
            <dd className="tabular-nums">{formatTraceDuration(record.startMs)}</dd>
          </dl>
          <div className="mt-3">
            <h3 className="text-xs font-medium">概要</h3>
            <p className="mt-1 text-xs leading-5 text-muted">{record.summary}</p>
          </div>
        </Tabs.Panel>

        <Tabs.Panel className="mt-0! min-h-0 flex-1 overflow-auto px-3 py-2" id="preview">
          <p className="whitespace-pre-wrap text-xs leading-5 text-foreground">{record.preview}</p>
        </Tabs.Panel>

        <Tabs.Panel className="mt-0! min-h-0 flex-1 overflow-auto p-2" id="raw">
          <CodeBlock className="rounded-md! border-0!">
            <CodeBlock.Header>
              <span>{record.id}.json</span>
              <CodeBlock.CopyButton aria-label="复制原始轨迹数据" code={rawJson} />
            </CodeBlock.Header>
            <CodeBlock.Code code={rawJson} language="json" />
          </CodeBlock>
        </Tabs.Panel>

        <Tabs.Panel className="mt-0! min-h-0 flex-1 overflow-auto px-3 py-2" id="source">
          <dl className="grid grid-cols-[72px_minmax(0,1fr)] items-center gap-x-3 gap-y-1.5 text-xs">
            <dt className="text-muted">记录 ID</dt>
            <dd className="break-all font-mono text-[11px]">{record.id}</dd>
            <dt className="text-muted">通道</dt>
            <dd>{AGENT_TRACE_LANE_LABELS[record.lane]}</dd>
            <dt className="text-muted">轮次</dt>
            <dd className="tabular-nums">{record.turn}</dd>
            <dt className="text-muted">采集来源</dt>
            <dd>{record.source}</dd>
          </dl>
        </Tabs.Panel>
      </Tabs>
    </motion.aside>
  );
}
