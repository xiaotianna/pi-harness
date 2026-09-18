"use client";

import { AreaChart } from "@agile-avocation/ui-pro/area-chart";
import { BarChart } from "@agile-avocation/ui-pro/bar-chart";
import {
  Alert,
  Button,
  Label,
  ListBox,
  Modal,
  ProgressCircle,
  RangeCalendar,
  Select,
  Separator,
  Surface,
} from "@heroui/react";
import { useQuery } from "@tanstack/react-query";
import * as HeatGraph from "heat-graph";
import { useMemo, useState } from "react";
import { ModelProviderIcon } from "@/features/models";
import { usageStatisticsQueryOptions } from "../api/usage-queries";
import {
  dateKey,
  summarizeUsage,
  type UsageDateRange,
  UsagePeriod,
  type UsageTotal,
  usageDateRange,
} from "../utils/usage-summary";

const TOKEN_FORMAT = new Intl.NumberFormat("zh-CN");
const COST_FORMAT = new Intl.NumberFormat("zh-CN", {
  maximumFractionDigits: 2,
  minimumFractionDigits: 2,
});
const AXIS_FORMAT = new Intl.NumberFormat("zh-CN", {
  maximumFractionDigits: 1,
  notation: "compact",
});
const HEAT_COLORS = [
  "var(--default)",
  "color-mix(in oklch, var(--accent) 25%, var(--default))",
  "color-mix(in oklch, var(--accent) 45%, var(--default))",
  "color-mix(in oklch, var(--accent) 70%, var(--default))",
  "var(--accent)",
];
const PERIOD_OPTIONS = [
  { id: UsagePeriod.TODAY, label: "今天" },
  { id: UsagePeriod.YESTERDAY, label: "昨天" },
  { id: UsagePeriod.LAST_7_DAYS, label: "近 7 天" },
  { id: UsagePeriod.LAST_30_DAYS, label: "近 30 天" },
  { id: UsagePeriod.THIS_MONTH, label: "本月" },
  { id: UsagePeriod.LAST_MONTH, label: "上月" },
  { id: UsagePeriod.CUSTOM, label: "自定义" },
] as const;

function UsageTrendCharts({
  costChart = false,
  days,
  totals,
  trend,
}: {
  costChart?: boolean;
  days: number;
  totals: UsageTotal;
  trend: ReturnType<typeof summarizeUsage>["trend"];
}) {
  const period = days <= 31 ? "每日" : "每 7 天";
  return (
    <div className="mt-8 grid gap-x-6 gap-y-8 @2xl/settings:grid-cols-2">
      <figure className="min-w-0">
        <figcaption className="font-medium text-foreground">
          模型请求{" "}
          <span className="font-normal tabular-nums text-muted">
            {TOKEN_FORMAT.format(totals.requests)}
          </span>
        </figcaption>
        <p className="mt-1 text-xs text-muted">{period}请求次数</p>
        <AreaChart
          className="mt-4"
          data={trend}
          height={220}
          margin={{ bottom: 0, left: 0, right: 4, top: 8 }}
        >
          <AreaChart.Grid vertical={false} />
          <AreaChart.XAxis dataKey="label" minTickGap={24} />
          <AreaChart.YAxis
            tickFormatter={(value: number) => AXIS_FORMAT.format(value)}
            width={48}
          />
          <AreaChart.Area
            dataKey="requests"
            fill="var(--accent-soft)"
            isAnimationActive={false}
            name="请求次数"
            stroke="var(--accent)"
            type="monotone"
          />
          <AreaChart.Tooltip content={<AreaChart.TooltipContent />} />
        </AreaChart>
      </figure>
      <figure className="min-w-0">
        <figcaption className="font-medium text-foreground">
          Token 消耗{" "}
          <span className="font-normal tabular-nums text-muted">
            {TOKEN_FORMAT.format(totals.totalTokens)}
          </span>
        </figcaption>
        <p className="mt-1 text-xs text-muted">{period}总量</p>
        <BarChart
          className="mt-4"
          data={trend}
          height={220}
          margin={{ bottom: 0, left: 0, right: 4, top: 8 }}
        >
          <BarChart.Grid vertical={false} />
          <BarChart.XAxis dataKey="label" minTickGap={24} />
          <BarChart.YAxis tickFormatter={(value: number) => AXIS_FORMAT.format(value)} width={54} />
          <BarChart.Bar
            dataKey="totalTokens"
            fill="var(--accent)"
            isAnimationActive={false}
            name="Token"
            radius={[3, 3, 0, 0]}
          />
          <BarChart.Tooltip
            content={
              <BarChart.TooltipContent
                valueFormatter={(value) => TOKEN_FORMAT.format(Number(value))}
              />
            }
          />
        </BarChart>
      </figure>
      {costChart && totals.cost > 0 && (
        <figure className="min-w-0 @2xl/settings:col-span-2">
          <figcaption className="font-medium text-foreground">
            已记录费用{" "}
            <span className="font-normal tabular-nums text-muted">
              US${COST_FORMAT.format(totals.cost)}
            </span>
          </figcaption>
          <p className="mt-1 text-xs text-muted">{period}预估费用 · USD</p>
          <BarChart
            className="mt-4"
            data={trend}
            height={200}
            margin={{ bottom: 0, left: 0, right: 4, top: 8 }}
          >
            <BarChart.Grid vertical={false} />
            <BarChart.XAxis dataKey="label" minTickGap={24} />
            <BarChart.YAxis
              tickFormatter={(value: number) => `$${AXIS_FORMAT.format(value)}`}
              width={56}
            />
            <BarChart.Bar
              dataKey="cost"
              fill="var(--warning)"
              isAnimationActive={false}
              name="预估费用"
              radius={[3, 3, 0, 0]}
            />
            <BarChart.Tooltip
              content={
                <BarChart.TooltipContent
                  valueFormatter={(value) => `US$${COST_FORMAT.format(Number(value))}`}
                />
              }
            />
          </BarChart>
        </figure>
      )}
    </div>
  );
}

export function UsageSettingsPanel() {
  const query = useQuery(usageStatisticsQueryOptions());
  const [period, setPeriod] = useState<UsagePeriod>(UsagePeriod.LAST_30_DAYS);
  const [customRange, setCustomRange] = useState<UsageDateRange | null>(null);
  const [customDraft, setCustomDraft] = useState<UsageDateRange | null>(null);
  const [isCustomOpen, setIsCustomOpen] = useState(false);
  const [modelKey, setModelKey] = useState("all");
  const rows = query.data ?? [];
  const availableModels = useMemo(
    () =>
      [
        ...new Map(
          rows.map((row) => [
            JSON.stringify([row.providerId, row.modelId]),
            { providerId: row.providerId, modelId: row.modelId },
          ]),
        ).entries(),
      ].sort((a, b) => a[1].modelId.localeCompare(b[1].modelId)),
    [rows],
  );
  const range = useMemo(
    () =>
      period === UsagePeriod.CUSTOM
        ? (customRange ?? usageDateRange(UsagePeriod.LAST_30_DAYS))
        : usageDateRange(period),
    [period, customRange],
  );
  const summary = useMemo(() => summarizeUsage(rows, range, modelKey), [rows, range, modelKey]);
  const modelCharts = useMemo(
    () =>
      summary.models.map((model) => ({
        model,
        trend: summarizeUsage(rows, range, JSON.stringify([model.providerId, model.modelId])).trend,
      })),
    [rows, range, summary.models],
  );
  const year = useMemo(() => {
    const now = new Date();
    return summarizeUsage(
      rows,
      {
        start: dateKey(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 364)),
        end: dateKey(now),
      },
      "all",
    );
  }, [rows]);
  const heatData = useMemo(
    () =>
      year.daily.map(({ date, totalTokens }) => {
        const [year, month, day] = date.split("-").map(Number);
        return { date: new Date(year ?? 0, (month ?? 1) - 1, day ?? 1), count: totalTokens };
      }),
    [year.daily],
  );
  const today = new Date();
  const heatStart = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 364);
  const heatEnd = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const cacheRatio = summary.totals.input + summary.totals.cacheRead + summary.totals.cacheWrite;

  return (
    <section aria-label="用量统计" className="w-full max-w-[820px] pb-6">
      <header>
        <h2 className="text-lg font-medium text-foreground">用量统计</h2>
        <p className="mt-2 text-sm text-muted">
          按本机日期汇总已记录的模型请求，包含归档会话与子 Agent。
        </p>
      </header>

      {query.isPending ? (
        <div
          aria-busy="true"
          className="flex min-h-96 flex-col items-center justify-center gap-4 text-center"
        >
          <ProgressCircle aria-label="正在汇总用量统计" isIndeterminate size="lg">
            <ProgressCircle.Track>
              <ProgressCircle.TrackCircle />
              <ProgressCircle.FillCircle />
            </ProgressCircle.Track>
          </ProgressCircle>
          <div role="status">
            <p className="text-sm font-medium text-foreground">正在汇总用量统计</p>
            <p className="mt-1 text-xs text-muted">读取历史会话与子 Agent 的模型请求</p>
          </div>
        </div>
      ) : query.isError ? (
        <Alert className="mt-6" role="alert" status="danger">
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Title>{query.error.message}</Alert.Title>
          </Alert.Content>
        </Alert>
      ) : (
        <>
          <section aria-label="总 Token 活动" className="mt-8">
            <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
              <h3 className="font-medium text-foreground">总 Token 活动</h3>
              <span className="text-sm tabular-nums text-muted">
                近一年 · {TOKEN_FORMAT.format(year.totals.totalTokens)} Token
              </span>
            </div>
            <p className="mt-1 text-xs text-muted">全部模型，每格代表一天；颜色越深，消耗越多。</p>
            <HeatGraph.Root
              className="mt-4"
              colorScale={HEAT_COLORS}
              data={heatData}
              end={heatEnd}
              start={heatStart}
              weekStart="monday"
            >
              <div className="overflow-x-auto">
                <div className="min-w-[680px]">
                  <div className="relative mb-2 h-4 text-xs text-muted">
                    <HeatGraph.MonthLabels>
                      {({ label, totalWeeks }) =>
                        label.month === heatEnd.getMonth() ? null : (
                          <span
                            className="absolute"
                            style={{ left: `${(label.column / totalWeeks) * 100}%` }}
                          >
                            {label.month + 1}月
                          </span>
                        )
                      }
                    </HeatGraph.MonthLabels>
                  </div>
                  <HeatGraph.Grid className="gap-[3px]">
                    {({ cell }) => (
                      <HeatGraph.Cell
                        aria-label={`${dateKey(cell.date)}，${TOKEN_FORMAT.format(cell.count)} Token`}
                        className="aspect-square rounded-sm"
                        role="img"
                      />
                    )}
                  </HeatGraph.Grid>
                </div>
              </div>
              <HeatGraph.Tooltip
                className="rounded-lg bg-surface px-3 py-2 text-xs text-foreground shadow-surface"
                side="top"
              >
                {({ cell }) => `${dateKey(cell.date)} · ${TOKEN_FORMAT.format(cell.count)} Token`}
              </HeatGraph.Tooltip>
            </HeatGraph.Root>
          </section>

          <Separator className="mt-5" />

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Select
              aria-label="统计时间范围"
              className="w-32"
              value={period}
              variant="secondary"
              onChange={(key) => {
                if (key === UsagePeriod.CUSTOM) {
                  setCustomDraft(null);
                  setIsCustomOpen(true);
                } else {
                  const option = PERIOD_OPTIONS.find((option) => option.id === key);
                  if (option) setPeriod(option.id);
                }
              }}
            >
              <Select.Trigger>
                <Select.Value />
                <Select.Indicator />
              </Select.Trigger>
              <Select.Popover>
                <ListBox items={PERIOD_OPTIONS}>
                  {(option) => (
                    <ListBox.Item id={option.id} textValue={option.label}>
                      <Label>{option.label}</Label>
                      <ListBox.ItemIndicator />
                    </ListBox.Item>
                  )}
                </ListBox>
              </Select.Popover>
            </Select>
            <Select
              aria-label="统计模型"
              className="min-w-0 w-64 max-w-full"
              value={modelKey}
              variant="secondary"
              onChange={(key) => {
                if (typeof key === "string") setModelKey(key);
              }}
            >
              <Select.Trigger className="w-full min-w-0">
                <Select.Value className="min-w-0 truncate" />
                <Select.Indicator />
              </Select.Trigger>
              <Select.Popover className="max-w-[calc(100vw-2rem)]">
                <ListBox>
                  <ListBox.Item id="all" textValue="全部模型">
                    <Label>全部模型</Label>
                    <ListBox.ItemIndicator />
                  </ListBox.Item>
                  {availableModels.map(([key, model]) => (
                    <ListBox.Item
                      id={key}
                      key={key}
                      textValue={`${model.modelId} · ${model.providerId}`}
                    >
                      <Label>
                        {model.modelId} · {model.providerId}
                      </Label>
                      <ListBox.ItemIndicator />
                    </ListBox.Item>
                  ))}
                </ListBox>
              </Select.Popover>
            </Select>
            {period === UsagePeriod.CUSTOM && customRange && (
              <Button
                aria-label="修改自定义日期范围"
                size="sm"
                variant="tertiary"
                onPress={() => {
                  setCustomDraft(null);
                  setIsCustomOpen(true);
                }}
              >
                {customRange.start} — {customRange.end}
              </Button>
            )}
          </div>

          {summary.totals.requests === 0 ? (
            <Surface className="mt-4 p-6 text-center text-sm text-muted" variant="secondary">
              这个范围内还没有已记录的模型用量。
            </Surface>
          ) : (
            <>
              <Surface className="mt-4 rounded-2xl p-2" variant="secondary">
                <dl className="grid grid-cols-2 @2xl/settings:grid-cols-4">
                  <div className="min-w-0 border-r border-b border-separator p-4 @2xl/settings:border-b-0">
                    <dt className="text-sm text-muted">总 Token</dt>
                    <dd className="mt-1 text-xl font-semibold tracking-tight tabular-nums text-foreground">
                      {TOKEN_FORMAT.format(summary.totals.totalTokens)}
                    </dd>
                  </div>
                  <div className="min-w-0 border-b border-separator p-4 @2xl/settings:border-r @2xl/settings:border-b-0">
                    <dt className="text-sm text-muted">模型请求</dt>
                    <dd className="mt-1 text-xl font-semibold tracking-tight tabular-nums text-foreground">
                      {TOKEN_FORMAT.format(summary.totals.requests)}
                    </dd>
                  </div>
                  <div className="min-w-0 border-r border-separator p-4">
                    <dt className="text-sm text-muted">缓存读取</dt>
                    <dd className="mt-1 text-xl font-semibold tracking-tight tabular-nums text-foreground">
                      {TOKEN_FORMAT.format(summary.totals.cacheRead)}
                      <span className="mt-1 block text-xs font-normal tracking-normal text-muted">
                        占输入{" "}
                        {cacheRatio > 0
                          ? `${((summary.totals.cacheRead / cacheRatio) * 100).toFixed(1)}%`
                          : "0%"}
                      </span>
                    </dd>
                  </div>
                  <div className="min-w-0 p-4">
                    <dt className="text-sm text-muted">已记录费用</dt>
                    <dd className="mt-1 text-xl font-semibold tracking-tight tabular-nums text-foreground">
                      {summary.totals.cost > 0
                        ? `US$${COST_FORMAT.format(summary.totals.cost)}`
                        : "未提供"}
                    </dd>
                  </div>
                </dl>
              </Surface>

              {modelKey === "all" && (
                <UsageTrendCharts
                  costChart
                  days={summary.daily.length}
                  totals={summary.totals}
                  trend={summary.trend}
                />
              )}
            </>
          )}

          {modelCharts.length > 0 && (
            <section aria-label="各模型用量" className="mt-10">
              <h3 className="font-medium text-foreground">各模型用量</h3>
              <p className="mt-1 text-xs text-muted">
                按总 Token 排序；费用为模型费率估算，零费率或订阅调用可能未提供。
              </p>
              <ul className="mt-5 space-y-10">
                {modelCharts.map(({ model, trend }) => (
                  <li
                    className="min-w-0 border-t border-separator pt-6"
                    key={JSON.stringify([model.providerId, model.modelId])}
                  >
                    <section aria-label={`${model.modelId} 用量`}>
                      <div className="flex min-w-0 items-center gap-3">
                        <ModelProviderIcon isColor providerId={model.providerId} size={24} />
                        <div className="min-w-0">
                          <h4 className="break-all text-base font-medium text-foreground">
                            {model.modelId}
                          </h4>
                          <p className="text-xs text-muted">{model.providerId}</p>
                        </div>
                      </div>
                      <UsageTrendCharts
                        costChart={modelKey !== "all"}
                        days={summary.daily.length}
                        totals={model}
                        trend={trend}
                      />
                      <dl className="mt-5 grid grid-cols-2 gap-x-5 gap-y-3 text-xs @2xl/settings:grid-cols-3">
                        <div>
                          <dt className="text-muted">输入</dt>
                          <dd className="mt-1 tabular-nums text-foreground">
                            {TOKEN_FORMAT.format(model.input)}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-muted">输出</dt>
                          <dd className="mt-1 tabular-nums text-foreground">
                            {TOKEN_FORMAT.format(model.output)}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-muted">缓存读取</dt>
                          <dd className="mt-1 tabular-nums text-foreground">
                            {TOKEN_FORMAT.format(model.cacheRead)}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-muted">缓存写入</dt>
                          <dd className="mt-1 tabular-nums text-foreground">
                            {TOKEN_FORMAT.format(model.cacheWrite)}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-muted">推理</dt>
                          <dd className="mt-1 tabular-nums text-foreground">
                            {TOKEN_FORMAT.format(model.reasoning)}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-muted">预估费用</dt>
                          <dd className="mt-1 tabular-nums text-foreground">
                            {model.cost > 0 ? `US$${COST_FORMAT.format(model.cost)}` : "未提供"}
                          </dd>
                        </div>
                      </dl>
                    </section>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}
      <Modal.Backdrop isOpen={isCustomOpen} onOpenChange={setIsCustomOpen}>
        <Modal.Container size="sm">
          <Modal.Dialog>
            <Modal.CloseTrigger />
            <Modal.Header>
              <Modal.Heading>自定义时间范围</Modal.Heading>
            </Modal.Header>
            <Modal.Body className="flex flex-col items-center gap-3">
              <p className="self-start text-sm text-muted">选择近一年内的开始和结束日期。</p>
              <RangeCalendar
                aria-label="用量统计日期范围"
                isDateUnavailable={(date) =>
                  date.toString() < dateKey(heatStart) || date.toString() > dateKey(heatEnd)
                }
                onChange={(value) =>
                  setCustomDraft({ start: value.start.toString(), end: value.end.toString() })
                }
              >
                <RangeCalendar.Header>
                  <RangeCalendar.Heading />
                  <RangeCalendar.NavButton slot="previous" />
                  <RangeCalendar.NavButton slot="next" />
                </RangeCalendar.Header>
                <RangeCalendar.Grid>
                  <RangeCalendar.GridHeader>
                    {(day) => <RangeCalendar.HeaderCell>{day}</RangeCalendar.HeaderCell>}
                  </RangeCalendar.GridHeader>
                  <RangeCalendar.GridBody>
                    {(date) => <RangeCalendar.Cell date={date} />}
                  </RangeCalendar.GridBody>
                </RangeCalendar.Grid>
              </RangeCalendar>
            </Modal.Body>
            <Modal.Footer>
              <Button variant="tertiary" onPress={() => setIsCustomOpen(false)}>
                取消
              </Button>
              <Button
                isDisabled={!customDraft}
                onPress={() => {
                  if (!customDraft) return;
                  setCustomRange(customDraft);
                  setPeriod(UsagePeriod.CUSTOM);
                  setIsCustomOpen(false);
                }}
              >
                应用范围
              </Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </section>
  );
}
