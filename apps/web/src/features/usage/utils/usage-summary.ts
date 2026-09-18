import type { UsageStatistic } from "../api/usage-api";

export interface UsageTotal {
  requests: number;
  input: number;
  output: number;
  cacheRead: number;
  cacheWrite: number;
  reasoning: number;
  totalTokens: number;
  cost: number;
}

export interface ModelUsage extends UsageTotal {
  providerId: string;
  modelId: string;
}

export const UsagePeriod = {
  TODAY: "today",
  YESTERDAY: "yesterday",
  LAST_7_DAYS: "last-7-days",
  LAST_30_DAYS: "last-30-days",
  THIS_MONTH: "this-month",
  LAST_MONTH: "last-month",
  CUSTOM: "custom",
} as const;

export type UsagePeriod = (typeof UsagePeriod)[keyof typeof UsagePeriod];

export interface UsageDateRange {
  start: string;
  end: string;
}

export function dateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function usageDateRange(
  period: Exclude<UsagePeriod, typeof UsagePeriod.CUSTOM>,
  now = new Date(),
): UsageDateRange {
  const year = now.getFullYear();
  const month = now.getMonth();
  const day = now.getDate();
  switch (period) {
    case UsagePeriod.TODAY:
      return { start: dateKey(now), end: dateKey(now) };
    case UsagePeriod.YESTERDAY: {
      const yesterday = dateKey(new Date(year, month, day - 1));
      return { start: yesterday, end: yesterday };
    }
    case UsagePeriod.LAST_7_DAYS:
      return { start: dateKey(new Date(year, month, day - 6)), end: dateKey(now) };
    case UsagePeriod.LAST_30_DAYS:
      return { start: dateKey(new Date(year, month, day - 29)), end: dateKey(now) };
    case UsagePeriod.THIS_MONTH:
      return { start: dateKey(new Date(year, month, 1)), end: dateKey(now) };
    case UsagePeriod.LAST_MONTH:
      return {
        start: dateKey(new Date(year, month - 1, 1)),
        end: dateKey(new Date(year, month, 0)),
      };
  }
}

export function summarizeUsage(
  rows: readonly UsageStatistic[],
  range: UsageDateRange,
  modelKey: string,
) {
  const totals: UsageTotal = {
    requests: 0,
    input: 0,
    output: 0,
    cacheRead: 0,
    cacheWrite: 0,
    reasoning: 0,
    totalTokens: 0,
    cost: 0,
  };
  const byModel = new Map<string, ModelUsage>();
  const byDay = new Map<string, { requests: number; totalTokens: number; cost: number }>();

  for (const row of rows) {
    if (row.date < range.start || row.date > range.end) continue;
    const key = JSON.stringify([row.providerId, row.modelId]);
    if (modelKey !== "all" && key !== modelKey) continue;
    const model = byModel.get(key) ?? {
      requests: 0,
      input: 0,
      output: 0,
      cacheRead: 0,
      cacheWrite: 0,
      reasoning: 0,
      totalTokens: 0,
      cost: 0,
      providerId: row.providerId,
      modelId: row.modelId,
    };
    for (const field of [
      "requests",
      "input",
      "output",
      "cacheRead",
      "cacheWrite",
      "reasoning",
      "totalTokens",
      "cost",
    ] as const) {
      model[field] += row[field];
      totals[field] += row[field];
    }
    byModel.set(key, model);
    const day = byDay.get(row.date) ?? { requests: 0, totalTokens: 0, cost: 0 };
    day.requests += row.requests;
    day.totalTokens += row.totalTokens;
    day.cost += row.cost;
    byDay.set(row.date, day);
  }

  const models = [...byModel.values()].sort((a, b) => b.totalTokens - a.totalTokens);
  const [year, month, day] = range.start.split("-").map(Number);
  const daily: { date: string; requests: number; totalTokens: number; cost: number }[] = [];
  for (
    let date = new Date(year ?? 0, (month ?? 1) - 1, day ?? 1);
    dateKey(date) <= range.end;
    date = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1)
  ) {
    const key = dateKey(date);
    daily.push({ date: key, ...(byDay.get(key) ?? { requests: 0, totalTokens: 0, cost: 0 }) });
  }
  const trend =
    daily.length <= 31
      ? daily.map(({ date, requests, totalTokens, cost }) => ({
          label: date.slice(5),
          requests,
          totalTokens,
          cost,
        }))
      : Array.from({ length: Math.ceil(daily.length / 7) }, (_, index) => {
          const week = daily.slice(index * 7, index * 7 + 7);
          return {
            label: week[0]?.date.slice(5) ?? "",
            requests: week.reduce((sum, day) => sum + day.requests, 0),
            totalTokens: week.reduce((sum, day) => sum + day.totalTokens, 0),
            cost: week.reduce((sum, day) => sum + day.cost, 0),
          };
        });
  return { daily, models, totals, trend };
}
