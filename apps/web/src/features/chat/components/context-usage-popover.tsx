import {
  Button,
  Popover,
  ProgressBar,
  ProgressCircle,
  ScrollShadow,
  Separator,
} from "@heroui/react";
import type { ContextUsageSnapshot, SessionUsageSummary } from "../utils/session-usage";

const COMPACT_NUMBER_FORMATTER = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 1,
  notation: "compact",
});
const INTEGER_FORMATTER = new Intl.NumberFormat("zh-CN", { maximumFractionDigits: 0 });
const CONTEXT_CATEGORY_STYLES = {
  CONVERSATION: "bg-accent",
  SYSTEM_PROMPT: "bg-muted/55",
  TOOL: "bg-accent/50",
} as const;

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
    <div className="flex items-center justify-between gap-6 text-sm">
      <span className="flex min-w-0 items-center gap-2 text-muted">
        <span aria-hidden className={`size-2.5 shrink-0 rounded-sm ${markerClassName}`} />
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
    snapshot.systemPromptTokens + snapshot.toolTokens + snapshot.conversationTokens;
  if (estimatedTotal <= 0 || contextTokens <= 0 || estimatedTotal === contextTokens)
    return snapshot;

  const systemPromptTokens = Math.floor(
    (snapshot.systemPromptTokens / estimatedTotal) * contextTokens,
  );
  const toolTokens = Math.floor((snapshot.toolTokens / estimatedTotal) * contextTokens);
  return {
    ...snapshot,
    conversationTokens: Math.max(0, contextTokens - systemPromptTokens - toolTokens),
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
    <div className="flex items-center justify-between gap-6 text-sm">
      <span className="text-muted">{label}</span>
      <span className="tabular-nums text-foreground">{value}</span>
    </div>
  );
}

export interface ContextUsagePopoverProps {
  contextWindow: number;
  isGenerating: boolean;
  modelName: string;
  summary: SessionUsageSummary;
}

export function ContextUsagePopover({
  contextWindow,
  isGenerating,
  modelName,
  summary,
}: ContextUsagePopoverProps) {
  const contextTokens = summary.contextTokens ?? 0;
  const rawPercentage = contextWindow > 0 ? (contextTokens / contextWindow) * 100 : 0;
  const percentage = Math.min(100, Math.max(0, rawPercentage));
  const percentageLabel = `${Math.round(rawPercentage)}%`;
  const progressColor = readProgressColor(rawPercentage);
  const hasUsage = summary.requestCount > 0;
  const latestRun = summary.latestRun;
  const contextBreakdown =
    summary.contextSnapshot === null
      ? null
      : reconcileContextBreakdown(summary.contextSnapshot, contextTokens);

  return (
    <Popover>
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
        className="w-80 max-w-[calc(100vw-2rem)] overflow-hidden"
        offset={10}
        placement="top end"
      >
        <Popover.Dialog className="p-0">
          <ScrollShadow
            className="max-h-[min(70dvh,36rem)] overscroll-y-contain p-3"
            orientation="vertical"
          >
            <div className="flex flex-col gap-3">
              <div className="flex items-start justify-between gap-6">
                <div className="min-w-0">
                  <Popover.Heading>上下文与用量</Popover.Heading>
                  <p className="mt-0.5 truncate text-xs text-muted">{modelName}</p>
                </div>
                <span className="shrink-0 text-sm font-medium tabular-nums text-foreground">
                  {percentageLabel}
                </span>
              </div>

              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between gap-4 text-sm">
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
                  <p className="rounded-xl bg-default px-3 py-2 text-xs leading-relaxed text-muted">
                    旧记录没有上下文分段快照，下一次模型请求时会自动记录。
                  </p>
                ) : (
                  <div className="mt-1 flex flex-col gap-2.5">
                    <ContextBreakdownMetric
                      label="系统提示词"
                      markerClassName={CONTEXT_CATEGORY_STYLES.SYSTEM_PROMPT}
                      value={formatTokens(contextBreakdown.systemPromptTokens)}
                    />
                    <ContextBreakdownMetric
                      label="工具"
                      markerClassName={CONTEXT_CATEGORY_STYLES.TOOL}
                      value={formatTokens(contextBreakdown.toolTokens)}
                    />
                    <ContextBreakdownMetric
                      label="对话消息"
                      markerClassName={CONTEXT_CATEGORY_STYLES.CONVERSATION}
                      value={formatTokens(contextBreakdown.conversationTokens)}
                    />
                    <p className="text-xs tabular-nums text-muted">
                      {isGenerating ? "当前" : "最近"} Run 第 {contextBreakdown.requestIndex}{" "}
                      次模型请求 · 单次快照
                    </p>
                  </div>
                )}
              </div>

              <Separator />

              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between gap-6">
                  <span className="text-sm font-medium text-foreground">最近 Run</span>
                  <span className="text-xs tabular-nums text-muted">
                    {latestRun ? `${latestRun.requestCount} 次模型请求` : "暂无请求"}
                  </span>
                </div>
                <UsageMetric
                  label="Token 合计"
                  value={latestRun ? formatExactTokens(latestRun.usage.totalTokens) : "—"}
                />
                <UsageMetric
                  label="预估费用"
                  value={formatCost(latestRun?.usage.cost.total ?? 0, latestRun !== null)}
                />
              </div>

              <Separator />

              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between gap-6">
                  <span className="text-sm font-medium text-foreground">会话累计</span>
                  <span className="text-xs tabular-nums text-muted">
                    {summary.runCount} 个 Run · {summary.requestCount} 次请求
                  </span>
                </div>
                <UsageMetric label="输入" value={formatExactTokens(summary.usage.input)} />
                <UsageMetric
                  label="输出（含推理）"
                  value={formatExactTokens(summary.usage.output)}
                />
                <UsageMetric label="其中推理" value={formatExactTokens(summary.usage.reasoning)} />
                <UsageMetric label="缓存读取" value={formatExactTokens(summary.usage.cacheRead)} />
                <UsageMetric label="缓存写入" value={formatExactTokens(summary.usage.cacheWrite)} />
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
              </div>

              <p className="text-xs leading-relaxed text-muted">
                当前上下文按最近一次模型请求单独记录，分类为发送前估算，总量在 Provider
                返回输入用量后校准；不会跨请求累加。Run 与会话累计包含已报告的失败或中止用量。推理
                Token 已包含在输出中，订阅或自定义模型可能不提供金额。
              </p>
            </div>
          </ScrollShadow>
        </Popover.Dialog>
      </Popover.Content>
    </Popover>
  );
}
