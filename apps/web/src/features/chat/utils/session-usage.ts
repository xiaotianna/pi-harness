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

export interface ContextRuntimeSummary {
  activeCheckpoint: {
    afterTokens: number;
    beforeTokens: number;
    nextAction: string;
    objective: string;
    reason: string;
    strategy: string;
  } | null;
  compactionCount: number;
  plan: { completed: number; inProgress: string | null; total: number } | null;
  restoreCount: number;
  todos: { blocked: number; completed: number; inProgress: number; total: number } | null;
}

export interface ContextUsageSnapshot {
  conversationTokens: number;
  requestIndex: number;
  systemPromptTokens: number;
  toolTokens: number;
}

export interface SessionUsageSummary {
  compactionRequestCount: number;
  contextSnapshot: ContextUsageSnapshot | null;
  contextRuntime: ContextRuntimeSummary;
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

  return {
    isContextUsageReliable:
      event.data.stopReason !== "aborted" && event.data.stopReason !== "error",
    usage: readTokenUsage(event.data.usage),
  };
}

function readTokenUsage(value: Record<string, unknown>): TokenUsage {
  const input = readNonNegativeNumber(value.input);
  const output = readNonNegativeNumber(value.output);
  const cacheRead = readNonNegativeNumber(value.cacheRead);
  const cacheWrite = readNonNegativeNumber(value.cacheWrite);
  const reasoning = Math.min(output, readNonNegativeNumber(value.reasoning));
  const reportedTotal = readNonNegativeNumber(value.totalTokens);
  const cost = isPlainObject(value.cost) ? value.cost : {};
  const inputCost = readNonNegativeNumber(cost.input);
  const outputCost = readNonNegativeNumber(cost.output);
  const cacheReadCost = readNonNegativeNumber(cost.cacheRead);
  const cacheWriteCost = readNonNegativeNumber(cost.cacheWrite);
  const reportedCostTotal = readNonNegativeNumber(cost.total);

  return {
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
    reasoning,
    totalTokens: reportedTotal || input + output + cacheRead + cacheWrite,
  };
}

function readCompactionUsage(event: HarnessEvent): TokenUsage | null {
  if (
    event.type !== HarnessEventType.CONTEXT_COMPACTED ||
    !isPlainObject(event.data) ||
    !isPlainObject(event.data.compactionUsage)
  ) {
    return null;
  }
  return readTokenUsage(event.data.compactionUsage);
}

function readActiveCheckpoint(data: unknown): ContextRuntimeSummary["activeCheckpoint"] {
  if (!isPlainObject(data) || !isPlainObject(data.checkpoint)) return null;
  const { checkpoint } = data;
  if (
    typeof data.afterTokens !== "number" ||
    typeof data.beforeTokens !== "number" ||
    typeof checkpoint.objective !== "string" ||
    typeof checkpoint.nextAction !== "string"
  ) {
    return null;
  }
  return {
    afterTokens: data.afterTokens,
    beforeTokens: data.beforeTokens,
    nextAction: checkpoint.nextAction,
    objective: checkpoint.objective,
    reason: typeof data.compactionReason === "string" ? data.compactionReason : "threshold",
    strategy: typeof data.compactionStrategy === "string" ? data.compactionStrategy : "model",
  };
}

function readPlan(data: unknown): ContextRuntimeSummary["plan"] {
  if (!isPlainObject(data) || !Array.isArray(data.plan)) return null;
  const steps = data.plan.filter(isPlainObject);
  return {
    completed: steps.filter((step) => step.status === "completed").length,
    inProgress:
      steps.find((step) => step.status === "in_progress" && typeof step.step === "string")?.step ??
      null,
    total: steps.length,
  };
}

function readTodos(data: unknown): ContextRuntimeSummary["todos"] {
  if (!isPlainObject(data) || !Array.isArray(data.todos)) return null;
  const todos = data.todos.filter(isPlainObject);
  return {
    blocked: todos.filter((todo) => todo.status === "blocked").length,
    completed: todos.filter((todo) => todo.status === "completed").length,
    inProgress: todos.filter((todo) => todo.status === "in_progress").length,
    total: todos.length,
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
  let activeCheckpoint: ContextRuntimeSummary["activeCheckpoint"] = null;
  let compactionCount = 0;
  let compactionRequestCount = 0;
  let contextSnapshotState: ContextUsageSnapshotState | null = null;
  let contextTokens: number | null = null;
  let interruptedRequestCount = 0;
  let latestRunId: string | null = null;
  let requestCount = 0;
  let restoreCount = 0;
  let usage = createEmptyUsage();
  let plan: ContextRuntimeSummary["plan"] = null;
  let todos: ContextRuntimeSummary["todos"] = null;
  const checkpointByEventSeq = new Map<number, ContextRuntimeSummary["activeCheckpoint"]>();
  const runUsageById = new Map<string, RunUsageSummary>();

  for (const event of events) {
    if (event.type === HarnessEventType.CONTEXT_COMPACTED) {
      compactionCount += 1;
      activeCheckpoint = readActiveCheckpoint(event.data);
      checkpointByEventSeq.set(event.seq, activeCheckpoint);
      const compactionUsage = readCompactionUsage(event);
      if (compactionUsage !== null) {
        compactionRequestCount += 1;
        requestCount += 1;
        usage = addUsage(usage, compactionUsage);
        if (event.runId !== undefined) {
          const currentRun = runUsageById.get(event.runId) ?? {
            requestCount: 0,
            usage: createEmptyUsage(),
          };
          runUsageById.set(event.runId, {
            requestCount: currentRun.requestCount + 1,
            usage: addUsage(currentRun.usage, compactionUsage),
          });
          latestRunId = event.runId;
        }
      }
    } else if (
      event.type === HarnessEventType.CONTEXT_CHECKPOINT_RESTORED &&
      isPlainObject(event.data) &&
      typeof event.data.sourceEventSeq === "number"
    ) {
      restoreCount += 1;
      activeCheckpoint = checkpointByEventSeq.get(event.data.sourceEventSeq) ?? activeCheckpoint;
    } else if (event.type === HarnessEventType.CONTEXT_WORKING_STATE_RESET) {
      plan = null;
      todos = null;
    } else if (event.type === HarnessEventType.PLAN_UPDATED) {
      plan = readPlan(event.data);
    } else if (event.type === HarnessEventType.TODO_UPDATED) {
      todos = readTodos(event.data);
    }

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
      request.isContextUsageReliable &&
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
    compactionRequestCount,
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
    contextRuntime: {
      activeCheckpoint,
      compactionCount,
      plan,
      restoreCount,
      todos,
    },
    interruptedRequestCount,
    latestRun: latestRunId === null ? null : (runUsageById.get(latestRunId) ?? null),
    requestCount,
    runCount: runUsageById.size,
    usage,
  };
}
