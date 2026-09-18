import { type HarnessEvent, HarnessEventType } from "@pi-harness/agent-runtime";
import { isPlainObject } from "es-toolkit";

export interface UsageStatistic {
  date: string;
  providerId: string;
  modelId: string;
  requests: number;
  input: number;
  output: number;
  cacheRead: number;
  cacheWrite: number;
  reasoning: number;
  totalTokens: number;
  cost: number;
}

function nonNegative(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : 0;
}

function localDate(timestamp: number): string {
  const date = new Date(timestamp);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function summarizeUsageStatistics(
  events: readonly HarnessEvent[],
  since: number,
  until: number,
  totals: Map<string, UsageStatistic>,
): void {
  const runs = new Map<string, { providerId: string; modelId: string }>();
  const subagents = new Map<string, { providerId: string; modelId: string }>();

  for (const event of events) {
    if (event.type === HarnessEventType.RUN_STARTED && event.runId && isPlainObject(event.data)) {
      if (typeof event.data.providerId === "string" && typeof event.data.modelId === "string") {
        runs.set(event.runId, {
          providerId: event.data.providerId,
          modelId: event.data.modelId,
        });
      }
      continue;
    }
    if (event.type === HarnessEventType.SUBAGENT_STARTED && isPlainObject(event.data)) {
      const providerId =
        typeof event.data.providerId === "string"
          ? event.data.providerId
          : event.runId
            ? runs.get(event.runId)?.providerId
            : undefined;
      if (
        typeof event.data.executionId === "string" &&
        providerId !== undefined &&
        typeof event.data.modelId === "string"
      ) {
        subagents.set(event.data.executionId, {
          providerId,
          modelId: event.data.modelId,
        });
      }
      continue;
    }
    if (event.timestamp < since || event.timestamp >= until) continue;

    const data = isPlainObject(event.data) ? event.data : null;
    const isSubagent =
      event.type === HarnessEventType.SUBAGENT_MESSAGE_COMPLETED ||
      event.type === HarnessEventType.SUBAGENT_CONTEXT_COMPACTED;
    const model = isSubagent
      ? typeof data?.executionId === "string"
        ? subagents.get(data.executionId)
        : undefined
      : event.runId
        ? runs.get(event.runId)
        : undefined;
    const usage =
      event.type === HarnessEventType.MESSAGE_COMPLETED && data?.role === "assistant"
        ? data.usage
        : event.type === HarnessEventType.SUBAGENT_MESSAGE_COMPLETED &&
            isPlainObject(data?.message) &&
            data.message.role === "assistant"
          ? data.message.usage
          : event.type === HarnessEventType.CONTEXT_COMPACTED ||
              event.type === HarnessEventType.SUBAGENT_CONTEXT_COMPACTED
            ? data?.compactionUsage
            : null;
    if (!model || !isPlainObject(usage)) continue;

    const date = localDate(event.timestamp);
    const key = JSON.stringify([date, model.providerId, model.modelId]);
    const current = totals.get(key) ?? {
      date,
      providerId: model.providerId,
      modelId: model.modelId,
      requests: 0,
      input: 0,
      output: 0,
      cacheRead: 0,
      cacheWrite: 0,
      reasoning: 0,
      totalTokens: 0,
      cost: 0,
    };
    const input = nonNegative(usage.input);
    const output = nonNegative(usage.output);
    const cacheRead = nonNegative(usage.cacheRead);
    const cacheWrite = nonNegative(usage.cacheWrite);
    current.requests += 1;
    current.input += input;
    current.output += output;
    current.cacheRead += cacheRead;
    current.cacheWrite += cacheWrite;
    current.reasoning += Math.min(output, nonNegative(usage.reasoning));
    current.totalTokens +=
      nonNegative(usage.totalTokens) || input + output + cacheRead + cacheWrite;
    if (isPlainObject(usage.cost)) {
      current.cost +=
        nonNegative(usage.cost.total) ||
        nonNegative(usage.cost.input) +
          nonNegative(usage.cost.output) +
          nonNegative(usage.cost.cacheRead) +
          nonNegative(usage.cost.cacheWrite);
    }
    totals.set(key, current);
  }
}
