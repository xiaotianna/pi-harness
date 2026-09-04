import { ClockArrowRotateLeft } from "@gravity-ui/icons";
import {
  Button,
  Disclosure,
  Popover,
  ProgressBar,
  ProgressCircle,
  ScrollShadow,
  Separator,
} from "@heroui/react";
import type { HarnessEvent } from "@pi-harness/agent-runtime/harness-event";
import { sumBy } from "es-toolkit";
import { useMemo, useState } from "react";
import { readSessionContextCheckpoints } from "../utils/context-checkpoints";
import type { ContextUsageSnapshot, SessionUsageSummary } from "../utils/session-usage";
import { ContextCheckpointDialog } from "./context-checkpoint-dialog";

const COMPACT_NUMBER_FORMATTER = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 1,
  notation: "compact",
});
const INTEGER_FORMATTER = new Intl.NumberFormat("zh-CN", { maximumFractionDigits: 0 });
const CONTEXT_CATEGORY_STYLES = {
  CONVERSATION: "bg-accent",
  CONTEXT: ["bg-success/75", "bg-success/55", "bg-success/35", "bg-success/20"],
  SYSTEM_PROMPT: "bg-muted/55",
  TOOL: "bg-warning/60",
} as const;

function readContextCategoryStyle(index: number): string {
  return CONTEXT_CATEGORY_STYLES.CONTEXT[index % CONTEXT_CATEGORY_STYLES.CONTEXT.length] ?? "";
}

function formatTokens(value: number): string {
  return COMPACT_NUMBER_FORMATTER.format(value);
}

function formatExactTokens(value: number): string {
  return INTEGER_FORMATTER.format(value);
}

function formatCost(value: number, hasUsage: boolean): string {
  if (value <= 0) return hasUsage ? "未提供" : "—";
  return new Intl.NumberFormat("en-US", {
    currency: "USD",
    maximumFractionDigits: value < 0.01 ? 6 : 4,
    minimumFractionDigits: value < 0.01 ? 4 : 2,
    style: "currency",
  }).format(value);
}

function readProgressColor(percentage: number): "accent" | "danger" | "warning" {
  if (percentage >= 90) return "danger";
  if (percentage >= 75) return "warning";
  return "accent";
}

interface UsageMetricProps {
  label: string;
  value: string;
}

interface ContextBreakdownMetricProps extends UsageMetricProps {
  markerClassName: string;
}

function ContextBreakdownMetric({ label, markerClassName, value }: ContextBreakdownMetricProps) {
  return (
    <div className="flex items-center justify-between gap-4 text-xs">
      <span className="flex min-w-0 items-center gap-1.5 text-muted">
        <span aria-hidden className={`size-2 shrink-0 rounded-sm ${markerClassName}`} />
        {label}
      </span>
      <span className="shrink-0 tabular-nums text-foreground">~{value}</span>
    </div>
  );
}

function reconcileContextBreakdown(
  snapshot: ContextUsageSnapshot,
  contextTokens: number,
): ContextUsageSnapshot {
  const estimatedTotal =
    snapshot.systemPromptTokens +
    sumBy(snapshot.contexts, ({ tokens }) => tokens) +
    snapshot.toolTokens +
    snapshot.conversationTokens;
  if (estimatedTotal <= 0 || contextTokens <= 0 || estimatedTotal === contextTokens)
    return snapshot;

  const systemPromptTokens = Math.floor(
    (snapshot.systemPromptTokens / estimatedTotal) * contextTokens,
  );
  const contexts = snapshot.contexts.map((context) => ({
    ...context,
    tokens: Math.floor((context.tokens / estimatedTotal) * contextTokens),
  }));
  const toolTokens = Math.floor((snapshot.toolTokens / estimatedTotal) * contextTokens);
  return {
    ...snapshot,
    conversationTokens: Math.max(
      0,
      contextTokens - systemPromptTokens - sumBy(contexts, ({ tokens }) => tokens) - toolTokens,
    ),
    contexts,
    systemPromptTokens,
    toolTokens,
  };
}

function readSegmentPercentage(tokens: number, contextWindow: number): number {
  if (tokens <= 0 || contextWindow <= 0) return 0;
  return Math.min(100, (tokens / contextWindow) * 100);
}

function UsageMetric({ label, value }: UsageMetricProps) {
  return (
    <div className="flex items-center justify-between gap-4 text-xs">
      <span className="text-muted">{label}</span>
      <span className="tabular-nums text-foreground">{value}</span>
    </div>
  );
}

function formatCompactionReason(reason: string): string {
  return reason === "milestone" ? "里程碑" : "阈值";
}

function formatCompactionStrategy(strategy: string): string {
  return strategy === "fallback" ? "安全降级" : "模型摘要";
}

export interface ContextUsagePopoverProps {
  contextWindow: number;
  events: readonly HarnessEvent[];
  isGenerating: boolean;
  sessionId: string;
  summary: SessionUsageSummary;
}

export function ContextUsagePopover({
  contextWindow,
  events,
  isGenerating,
  sessionId,
  summary,
}: ContextUsagePopoverProps) {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [isCheckpointDialogOpen, setIsCheckpointDialogOpen] = useState(false);
  const checkpointState = useMemo(() => readSessionContextCheckpoints(events), [events]);
  const contextTokens = summary.contextTokens ?? 0;
  const rawPercentage = contextWindow > 0 ? (contextTokens / contextWindow) * 100 : 0;
  const percentage = Math.min(100, Math.max(0, rawPercentage));
  const percentageLabel = `${Math.round(rawPercentage)}%`;
  const progressColor = readProgressColor(rawPercentage);
  const hasUsage = summary.requestCount > 0;
  const latestRun = summary.latestRun;
  const runtime = summary.contextRuntime;
  const contextBreakdown =
    summary.contextSnapshot === null
      ? null
      : reconcileContextBreakdown(summary.contextSnapshot, contextTokens);

  const openCheckpointDialog = () => {
    setIsPopoverOpen(false);
    setIsCheckpointDialogOpen(true);
  };

  return (
    <>
      <Popover isOpen={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
        <Button
          aria-label={`查看上下文与用量，当前上下文已用 ${percentageLabel}`}
          className="gap-1.5 px-2 tabular-nums"
          size="sm"
          variant="ghost"
        >
          <ProgressCircle
            aria-label={`上下文已用 ${percentageLabel}`}
            color={progressColor}
            size="sm"
            value={percentage}
          >
            <ProgressCircle.Track className="size-4">
              <ProgressCircle.TrackCircle />
              <ProgressCircle.FillCircle />
            </ProgressCircle.Track>
          </ProgressCircle>
          <span className="text-xs text-muted">{percentageLabel}</span>
        </Button>
        <Popover.Content
          className="w-[264px] max-w-[calc(100vw-2rem)] overflow-hidden"
          offset={10}
          placement="top end"
        >
          <Popover.Dialog className="p-0">
            <ScrollShadow
              className="max-h-[min(70dvh,36rem)] overscroll-y-contain p-2.5"
              orientation="vertical"
            >
              <div className="flex flex-col gap-2.5">
                <div className="flex items-center justify-between gap-4">
                  <Popover.Heading className="text-sm font-medium">上下文与用量</Popover.Heading>
                  <span className="shrink-0 text-xs font-medium tabular-nums text-foreground">
                    {percentageLabel}
                  </span>
                </div>

                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between gap-4 text-xs">
                    <span className="text-muted">当前上下文</span>
                    <span className="tabular-nums text-foreground">
                      {summary.contextTokens === null
                        ? "等待模型请求"
                        : `~${formatTokens(contextTokens)}`}{" "}
                      / {formatTokens(contextWindow)}
                    </span>
                  </div>
                  <ProgressBar
                    aria-label="当前上下文占用"
                    color={progressColor}
                    size="sm"
                    value={percentage}
                  >
                    <ProgressBar.Track className="flex">
                      {contextBreakdown === null ? (
                        <ProgressBar.Fill />
                      ) : (
                        [
                          {
                            className: CONTEXT_CATEGORY_STYLES.SYSTEM_PROMPT,
                            key: "system-prompt",
                            tokens: contextBreakdown.systemPromptTokens,
                          },
                          ...contextBreakdown.contexts.map((context, index) => ({
                            className: readContextCategoryStyle(index),
                            key: `context-${context.type}-${index}`,
                            tokens: context.tokens,
                          })),
                          {
                            className: CONTEXT_CATEGORY_STYLES.TOOL,
                            key: "tool",
                            tokens: contextBreakdown.toolTokens,
                          },
                          {
                            className: CONTEXT_CATEGORY_STYLES.CONVERSATION,
                            key: "conversation",
                            tokens: contextBreakdown.conversationTokens,
                          },
                        ].map((segment) =>
                          segment.tokens > 0 ? (
                            <span
                              aria-hidden
                              className={`h-full min-w-px shrink-0 transition-[width] duration-300 ease-out motion-reduce:transition-none ${segment.className}`}
                              key={segment.key}
                              style={{
                                width: `${readSegmentPercentage(segment.tokens, contextWindow)}%`,
                              }}
                            />
                          ) : null,
                        )
                      )}
                    </ProgressBar.Track>
                  </ProgressBar>
                  {contextBreakdown === null ? (
                    <p className="rounded-xl bg-default px-2.5 py-2 text-[11px] leading-relaxed text-muted">
                      旧记录没有上下文分段快照，下一次模型请求时会自动记录。
                    </p>
                  ) : (
                    <div className="mt-0.5 flex flex-col gap-2">
                      <ContextBreakdownMetric
                        label="系统提示词"
                        markerClassName={CONTEXT_CATEGORY_STYLES.SYSTEM_PROMPT}
                        value={formatTokens(contextBreakdown.systemPromptTokens)}
                      />
                      {contextBreakdown.contexts.map((context, index) => (
                        <ContextBreakdownMetric
                          key={`${context.type}-${index}`}
                          label={context.label}
                          markerClassName={readContextCategoryStyle(index)}
                          value={formatTokens(context.tokens)}
                        />
                      ))}
                      <ContextBreakdownMetric
                        label="工具定义"
                        markerClassName={CONTEXT_CATEGORY_STYLES.TOOL}
                        value={formatTokens(contextBreakdown.toolTokens)}
                      />
                      <ContextBreakdownMetric
                        label="会话消息（含工具调用）"
                        markerClassName={CONTEXT_CATEGORY_STYLES.CONVERSATION}
                        value={formatTokens(contextBreakdown.conversationTokens)}
                      />
                      <p className="text-[11px] tabular-nums text-muted">
                        {isGenerating ? "当前" : "最近"} Run 第 {contextBreakdown.requestIndex}{" "}
                        次模型请求前 · 完整 Session 上下文
                      </p>
                    </div>
                  )}
                </div>

                <Separator />
                <Disclosure>
                  {({ isExpanded }) => (
                    <>
                      <Disclosure.Heading>
                        <Disclosure.Trigger className="flex min-h-6 w-full items-center justify-center gap-1 p-0 text-[11px] text-muted hover:text-foreground">
                          {isExpanded ? "收起" : "展开更多"}
                          <Disclosure.Indicator className="size-3 opacity-60" />
                        </Disclosure.Trigger>
                      </Disclosure.Heading>
                      <Disclosure.Content>
                        <Disclosure.Body style={{ padding: 0 }}>
                          <div className="flex flex-col gap-2.5 pt-2.5">
                            <div className="flex flex-col gap-2">
                              <div className="flex items-center justify-between gap-3">
                                <span className="text-xs font-medium text-foreground">
                                  上下文运行时
                                </span>
                                <span className="text-[11px] tabular-nums text-muted">
                                  {runtime.compactionCount} 次压缩 · {runtime.restoreCount} 次回退
                                </span>
                              </div>
                              {checkpointState.checkpoints.length > 0 ? (
                                <Button
                                  fullWidth
                                  size="sm"
                                  variant="secondary"
                                  onPress={openCheckpointDialog}
                                >
                                  <ClockArrowRotateLeft className="size-4" />
                                  管理 Checkpoint
                                </Button>
                              ) : null}
                              {runtime.activeCheckpoint ? (
                                <>
                                  <UsageMetric
                                    label="活动 Checkpoint"
                                    value={`${formatExactTokens(runtime.activeCheckpoint.beforeTokens)} → ${formatExactTokens(runtime.activeCheckpoint.afterTokens)}`}
                                  />
                                  <UsageMetric
                                    label="生成方式"
                                    value={`${formatCompactionReason(runtime.activeCheckpoint.reason)} · ${formatCompactionStrategy(runtime.activeCheckpoint.strategy)}`}
                                  />
                                  <section
                                    aria-label="Checkpoint 工作状态"
                                    className="flex flex-col gap-2.5 rounded-xl bg-default px-2.5 py-2"
                                  >
                                    <div className="flex flex-col gap-0.5">
                                      <span className="text-[11px] font-medium text-foreground">
                                        当前目标
                                      </span>
                                      <p
                                        className="line-clamp-3 text-[11px] leading-relaxed text-muted"
                                        title={runtime.activeCheckpoint.objective}
                                      >
                                        {runtime.activeCheckpoint.objective}
                                      </p>
                                    </div>
                                    <div className="flex flex-col gap-0.5">
                                      <span className="text-[11px] font-medium text-foreground">
                                        下一步
                                      </span>
                                      <p
                                        className="line-clamp-3 text-[11px] leading-relaxed text-muted"
                                        title={runtime.activeCheckpoint.nextAction}
                                      >
                                        {runtime.activeCheckpoint.nextAction}
                                      </p>
                                    </div>
                                  </section>
                                </>
                              ) : (
                                <p className="text-[11px] leading-relaxed text-muted">
                                  尚未触发上下文压缩。
                                </p>
                              )}
                              {runtime.plan ? (
                                <UsageMetric
                                  label="Plan"
                                  value={`${runtime.plan.completed}/${runtime.plan.total} 已完成${runtime.plan.inProgress ? " · 1 进行中" : ""}`}
                                />
                              ) : null}
                              {runtime.todos ? (
                                <UsageMetric
                                  label="Todos"
                                  value={`${runtime.todos.completed}/${runtime.todos.total} 已完成 · ${runtime.todos.inProgress} 进行中 · ${runtime.todos.blocked} 阻塞`}
                                />
                              ) : null}
                            </div>

                            <Separator />

                            <div className="flex flex-col gap-2">
                              <div className="flex items-center justify-between gap-6">
                                <span className="text-xs font-medium text-foreground">
                                  最近 Run
                                </span>
                                <span className="text-[11px] tabular-nums text-muted">
                                  {latestRun ? `${latestRun.requestCount} 次模型调用` : "暂无请求"}
                                </span>
                              </div>
                              <UsageMetric
                                label="Token 合计"
                                value={
                                  latestRun ? formatExactTokens(latestRun.usage.totalTokens) : "—"
                                }
                              />
                              <UsageMetric
                                label="预估费用"
                                value={formatCost(
                                  latestRun?.usage.cost.total ?? 0,
                                  latestRun !== null,
                                )}
                              />
                            </div>

                            <Separator />

                            <div className="flex flex-col gap-2">
                              <div className="flex items-center justify-between gap-6">
                                <span className="text-xs font-medium text-foreground">
                                  会话累计
                                </span>
                                <span className="text-[11px] tabular-nums text-muted">
                                  {summary.runCount} 个 Run · {summary.requestCount} 次请求
                                </span>
                              </div>
                              <UsageMetric
                                label="输入"
                                value={formatExactTokens(summary.usage.input)}
                              />
                              <UsageMetric
                                label="输出（含推理）"
                                value={formatExactTokens(summary.usage.output)}
                              />
                              <UsageMetric
                                label="其中推理"
                                value={formatExactTokens(summary.usage.reasoning)}
                              />
                              <UsageMetric
                                label="缓存读取"
                                value={formatExactTokens(summary.usage.cacheRead)}
                              />
                              <UsageMetric
                                label="缓存写入"
                                value={formatExactTokens(summary.usage.cacheWrite)}
                              />
                              <UsageMetric
                                label="Token 合计"
                                value={formatExactTokens(summary.usage.totalTokens)}
                              />
                              <UsageMetric
                                label="预估费用"
                                value={formatCost(summary.usage.cost.total, hasUsage)}
                              />
                              {summary.interruptedRequestCount > 0 ? (
                                <UsageMetric
                                  label="失败或中止的部分用量"
                                  value={`${summary.interruptedRequestCount} 次请求`}
                                />
                              ) : null}
                              {summary.compactionRequestCount > 0 ? (
                                <UsageMetric
                                  label="其中压缩调用"
                                  value={`${summary.compactionRequestCount} 次请求`}
                                />
                              ) : null}
                            </div>

                            <section aria-label="统计说明" className="flex flex-col gap-2">
                              <span className="text-xs font-medium text-foreground">统计说明</span>
                              <div className="flex flex-col gap-1.5 text-[11px] leading-relaxed text-muted">
                                <p>
                                  <span className="font-medium text-foreground">当前上下文：</span>
                                  取最近一次模型请求实际携带的完整 Session
                                  Context，包含系统提示词、工作区上下文、工具定义，以及按顺序累积的会话消息、工具调用与结果。
                                </p>
                                <p>
                                  <span className="font-medium text-foreground">估算方式：</span>
                                  分类为发送前估算，总量在 Provider
                                  返回输入用量后校准，不会把多次请求重复累加。
                                </p>
                                <p>
                                  <span className="font-medium text-foreground">累计范围：</span>
                                  Run 与会话累计包含主任务、上下文压缩，以及已报告的失败或中止用量。
                                </p>
                                <p>
                                  <span className="font-medium text-foreground">费用说明：</span>
                                  推理 Token 已包含在输出中，订阅或自定义模型可能不提供金额。
                                </p>
                              </div>
                            </section>
                          </div>
                        </Disclosure.Body>
                      </Disclosure.Content>
                    </>
                  )}
                </Disclosure>
              </div>
            </ScrollShadow>
          </Popover.Dialog>
        </Popover.Content>
      </Popover>
      <ContextCheckpointDialog
        activeEventSeq={checkpointState.activeEventSeq}
        checkpoints={checkpointState.checkpoints}
        isGenerating={isGenerating}
        isOpen={isCheckpointDialogOpen}
        sessionId={sessionId}
        onClose={() => setIsCheckpointDialogOpen(false)}
      />
    </>
  );
}
