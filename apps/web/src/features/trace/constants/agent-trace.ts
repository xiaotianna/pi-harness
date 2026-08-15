import { AgentTraceLane, AgentTraceRecordKind, AgentTraceStatus } from "../types/agent-trace";

export const AGENT_TRACE_EVENT_ROW_HEIGHT = 30;

const TRACE_KIND_CHIP_CLASS_NAME =
  "h-4! min-h-4! rounded-sm! px-1.5 text-[10px]! leading-none font-semibold tracking-wide";

export const AGENT_TRACE_LANE_LABELS = {
  [AgentTraceLane.INPUT]: "输入",
  [AgentTraceLane.MODEL]: "模型",
  [AgentTraceLane.TOOLS]: "工具",
} as const;

export const AGENT_TRACE_KIND_LABELS = {
  [AgentTraceRecordKind.ASSISTANT]: "ASSISTANT",
  [AgentTraceRecordKind.CONTEXT]: "CONTEXT",
  [AgentTraceRecordKind.SYSTEM]: "SYSTEM",
  [AgentTraceRecordKind.TOOL]: "TOOL",
  [AgentTraceRecordKind.USER]: "USER",
} as const;

export const AGENT_TRACE_KIND_STYLES = {
  [AgentTraceRecordKind.ASSISTANT]: {
    chipClassName: `${TRACE_KIND_CHIP_CLASS_NAME} [--chip-bg:color-mix(in_oklab,oklch(0.55_0.16_305)_16%,transparent)] [--chip-fg:oklch(0.46_0.14_305)]`,
    timelineClassName: "bg-[oklch(0.55_0.16_305)]/65",
  },
  [AgentTraceRecordKind.CONTEXT]: {
    chipClassName: `${TRACE_KIND_CHIP_CLASS_NAME} [--chip-bg:var(--success-soft)] [--chip-fg:var(--success-soft-foreground)]`,
    timelineClassName: "bg-success/65",
  },
  [AgentTraceRecordKind.SYSTEM]: {
    chipClassName: `${TRACE_KIND_CHIP_CLASS_NAME} [--chip-bg:var(--default)] [--chip-fg:var(--default-foreground)]`,
    timelineClassName: "bg-muted/70",
  },
  [AgentTraceRecordKind.TOOL]: {
    chipClassName: `${TRACE_KIND_CHIP_CLASS_NAME} [--chip-bg:color-mix(in_oklab,var(--warning)_10%,transparent)] [--chip-fg:oklch(0.68_0.16_55)]`,
    timelineClassName: "bg-warning/60",
  },
  [AgentTraceRecordKind.USER]: {
    chipClassName: `${TRACE_KIND_CHIP_CLASS_NAME} [--chip-bg:var(--accent-soft)] [--chip-fg:var(--accent-soft-foreground)]`,
    timelineClassName: "bg-accent/75",
  },
} as const satisfies Record<
  AgentTraceRecordKind,
  { chipClassName: string; timelineClassName: string }
>;

export const AGENT_TRACE_STATUS_LABELS = {
  [AgentTraceStatus.COMPLETED]: "已完成",
  [AgentTraceStatus.FAILED]: "失败",
  [AgentTraceStatus.RUNNING]: "运行中",
} as const;

export const AGENT_TRACE_STATUS_COLORS = {
  [AgentTraceStatus.COMPLETED]: "success",
  [AgentTraceStatus.FAILED]: "danger",
  [AgentTraceStatus.RUNNING]: "accent",
} as const;
