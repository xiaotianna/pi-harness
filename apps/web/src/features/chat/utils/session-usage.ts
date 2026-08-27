import { type HarnessEvent, HarnessEventType } from "@pi-harness/agent-runtime/harness-event";
import { isPlainObject } from "es-toolkit";

export interface TokenCost {
  cacheRead: number;
  cacheWrite: number;
  input: number;
  output: number;
  total: number;
}

export interface TokenUsage {
  cacheRead: number;
  cacheWrite: number;
  cost: TokenCost;
  input: number;
  output: number;
  reasoning: number;
  totalTokens: number;
}

export interface RunUsageSummary {
  requestCount: number;
  usage: TokenUsage;
}

export interface ContextUsageSnapshot {
  conversationTokens: number;
  requestIndex: number;
  systemPromptTokens: number;
  toolTokens: number;
}

export interface SessionUsageSummary {
  contextSnapshot: ContextUsageSnapshot | null;
  contextTokens: number | null;
  interruptedRequestCount: number;
  latestRun: RunUsageSummary | null;
  requestCount: number;
  runCount: number;
  usage: TokenUsage;
}

interface AssistantRequestUsage {
  isContextUsageReliable: boolean;
  usage: TokenUsage;
}

interface ContextUsageSnapshotState extends ContextUsageSnapshot {
  estimatedTotalTokens: number;
  runId: string | null;
}

function createEmptyUsage(): TokenUsage {
  return {
    cacheRead: 0,
    cacheWrite: 0,
    cost: { cacheRead: 0, cacheWrite: 0, input: 0, output: 0, total: 0 },
    input: 0,
    output: 0,
    reasoning: 0,
    totalTokens: 0,
  };
}

function readNonNegativeNumber(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : 0;
}

function readContextUsageSnapshot(event: HarnessEvent): ContextUsageSnapshotState | null {
  if (event.type !== HarnessEventType.CONTEXT_USAGE_SNAPSHOT || !isPlainObject(event.data)) {
    return null;
  }

  const values = [
    event.data.conversationTokens,
    event.data.estimatedTotalTokens,
    event.data.systemPromptTokens,
    event.data.toolTokens,
  ];
  if (
    !values.every((value) => typeof value === "number" && Number.isInteger(value) && value >= 0) ||
    typeof event.data.requestIndex !== "number" ||
    !Number.isInteger(event.data.requestIndex) ||
    event.data.requestIndex < 1
  ) {
    return null;
  }

  return {
    conversationTokens: event.data.conversationTokens as number,
    estimatedTotalTokens: event.data.estimatedTotalTokens as number,
    requestIndex: event.data.requestIndex,
    runId: event.runId ?? null,
    systemPromptTokens: event.data.systemPromptTokens as number,
    toolTokens: event.data.toolTokens as number,
  };
}

function readAssistantRequestUsage(event: HarnessEvent): AssistantRequestUsage | null {
  if (
    event.type !== HarnessEventType.MESSAGE_COMPLETED ||
    !isPlainObject(event.data) ||
    event.data.role !== "assistant" ||
    !isPlainObject(event.data.usage)
  ) {
    return null;
  }

  const input = readNonNegativeNumber(event.data.usage.input);
  const output = readNonNegativeNumber(event.data.usage.output);
  const cacheRead = readNonNegativeNumber(event.data.usage.cacheRead);
  const cacheWrite = readNonNegativeNumber(event.data.usage.cacheWrite);
  const reportedTotal = readNonNegativeNumber(event.data.usage.totalTokens);
  const cost = isPlainObject(event.data.usage.cost) ? event.data.usage.cost : {};
  const inputCost = readNonNegativeNumber(cost.input);
  const outputCost = readNonNegativeNumber(cost.output);
  const cacheReadCost = readNonNegativeNumber(cost.cacheRead);
  const cacheWriteCost = readNonNegativeNumber(cost.cacheWrite);
  const reportedCostTotal = readNonNegativeNumber(cost.total);

  return {
    isContextUsageReliable:
      event.data.stopReason !== "aborted" && event.data.stopReason !== "error",
    usage: {
      cacheRead,
      cacheWrite,
      cost: {
        cacheRead: cacheReadCost,
        cacheWrite: cacheWriteCost,
        input: inputCost,
        output: outputCost,
        total: reportedCostTotal || inputCost + outputCost + cacheReadCost + cacheWriteCost,
      },
      input,
      output,
      reasoning: readNonNegativeNumber(event.data.usage.reasoning),
      totalTokens: reportedTotal || input + output + cacheRead + cacheWrite,
    },
  };
}

function addUsage(total: TokenUsage, current: TokenUsage): TokenUsage {
  return {
    cacheRead: total.cacheRead + current.cacheRead,
    cacheWrite: total.cacheWrite + current.cacheWrite,
    cost: {
      cacheRead: total.cost.cacheRead + current.cost.cacheRead,
      cacheWrite: total.cost.cacheWrite + current.cost.cacheWrite,
      input: total.cost.input + current.cost.input,
      output: total.cost.output + current.cost.output,
      total: total.cost.total + current.cost.total,
    },
    input: total.input + current.input,
    output: total.output + current.output,
    reasoning: total.reasoning + current.reasoning,
    totalTokens: total.totalTokens + current.totalTokens,
  };
}

export function summarizeSessionUsage(events: readonly HarnessEvent[]): SessionUsageSummary {
  let contextSnapshotState: ContextUsageSnapshotState | null = null;
  let contextTokens: number | null = null;
  let interruptedRequestCount = 0;
  let latestRunId: string | null = null;
  let requestCount = 0;
  let usage = createEmptyUsage();
  const runUsageById = new Map<string, RunUsageSummary>();

  for (const event of events) {
    const nextContextSnapshot = readContextUsageSnapshot(event);
    if (nextContextSnapshot !== null) {
      contextSnapshotState = nextContextSnapshot;
      contextTokens = nextContextSnapshot.estimatedTotalTokens;
      continue;
    }

    const request = readAssistantRequestUsage(event);
    if (request === null) continue;

    requestCount += 1;
    usage = addUsage(usage, request.usage);
    if (!request.isContextUsageReliable) interruptedRequestCount += 1;

    const reportedInputTokens =
      request.usage.input + request.usage.cacheRead + request.usage.cacheWrite;
    if (
      reportedInputTokens > 0 &&
      contextSnapshotState !== null &&
      contextSnapshotState.runId === (event.runId ?? null)
    ) {
      contextTokens = reportedInputTokens;
    } else if (
      contextSnapshotState === null &&
      request.isContextUsageReliable &&
      reportedInputTokens > 0
    ) {
      contextTokens = reportedInputTokens;
    }

    if (event.runId !== undefined) {
      const currentRun = runUsageById.get(event.runId) ?? {
        requestCount: 0,
        usage: createEmptyUsage(),
      };
      runUsageById.set(event.runId, {
        requestCount: currentRun.requestCount + 1,
        usage: addUsage(currentRun.usage, request.usage),
      });
      latestRunId = event.runId;
    }
  }

  return {
    contextSnapshot:
      contextSnapshotState === null
        ? null
        : {
            conversationTokens: contextSnapshotState.conversationTokens,
            requestIndex: contextSnapshotState.requestIndex,
            systemPromptTokens: contextSnapshotState.systemPromptTokens,
            toolTokens: contextSnapshotState.toolTokens,
          },
    contextTokens,
    interruptedRequestCount,
    latestRun: latestRunId === null ? null : (runUsageById.get(latestRunId) ?? null),
    requestCount,
    runCount: runUsageById.size,
    usage,
  };
}
