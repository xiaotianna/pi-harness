import {
  ApprovalDecision,
  type HarnessEvent,
  HarnessEventType,
  isContextCompactedData,
  isMessageBranchStartedData,
  type RunContextData,
} from "@pi-harness/agent-runtime/harness-event";
import { BusySubmitBehavior, isHarnessUserMessage } from "@pi-harness/agent-runtime/user-input";
import { isPlainObject } from "es-toolkit";
import {
  AgentTraceLane,
  type AgentTraceRecord,
  AgentTraceRecordKind,
  type AgentTraceSession,
  AgentTraceStatus,
  type AgentTraceTokenUsage,
  type AgentTraceToolDefinition,
} from "../types/agent-trace";

const MAX_PREVIEW_LENGTH = 800;
const EMPTY_USAGE: AgentTraceTokenUsage = {
  cacheRead: 0,
  cacheWrite: 0,
  input: 0,
  output: 0,
  reasoning: 0,
  total: 0,
};

interface PendingEvent {
  event: HarnessEvent;
  turn: number;
}

function clip(value: string): string {
  const trimmed = value.trim();
  return trimmed.length <= MAX_PREVIEW_LENGTH
    ? trimmed
    : `${trimmed.slice(0, MAX_PREVIEW_LENGTH)}…`;
}

function readFullText(value: unknown): string {
  if (typeof value === "string") return value.trim();
  if (!Array.isArray(value)) return "";
  return value
    .flatMap((part) => {
      if (!isPlainObject(part)) return [];
      if (typeof part.text === "string") return [part.text];
      if (typeof part.thinking === "string") return [part.thinking];
      return [];
    })
    .join("\n")
    .trim();
}

function readUnknown(value: unknown): string {
  return clip(stringifyUnknown(value));
}

function stringifyUnknown(value: unknown): string {
  if (typeof value === "string") return value;
  try {
    return JSON.stringify(value) ?? "undefined";
  } catch {
    return "无法预览该值";
  }
}

function readToolDefinitions(value: unknown): AgentTraceToolDefinition[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((tool) =>
    isPlainObject(tool) && typeof tool.name === "string" && typeof tool.description === "string"
      ? [{ description: tool.description, name: tool.name, parameters: tool.parameters }]
      : [],
  );
}

function readRunContexts(value: unknown): RunContextData[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((context) =>
    isPlainObject(context) &&
    typeof context.content === "string" &&
    typeof context.label === "string" &&
    typeof context.type === "string"
      ? [{ content: context.content, label: context.label, type: context.type }]
      : [],
  );
}

function readNumber(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : 0;
}

function compareRecords(left: AgentTraceRecord, right: AgentTraceRecord): number {
  const leftSeq = typeof left.raw.seq === "number" ? left.raw.seq : Number.MAX_SAFE_INTEGER;
  const rightSeq = typeof right.raw.seq === "number" ? right.raw.seq : Number.MAX_SAFE_INTEGER;
  return left.startMs - right.startMs || leftSeq - rightSeq || left.id.localeCompare(right.id);
}

function readUsage(value: unknown): AgentTraceTokenUsage | undefined {
  if (!isPlainObject(value)) return undefined;
  const cacheRead = readNumber(value.cacheRead);
  const cacheWrite = readNumber(value.cacheWrite);
  const input = readNumber(value.input);
  const output = readNumber(value.output);
  const reasoning = Math.min(output, readNumber(value.reasoning));
  const usage = {
    cacheRead,
    cacheWrite,
    input,
    output,
    reasoning,
    total: readNumber(value.totalTokens) || input + output + cacheRead + cacheWrite,
  };
  return Object.values(usage).some((item) => item > 0) ? usage : undefined;
}

function addUsage(
  left: AgentTraceTokenUsage,
  right: AgentTraceTokenUsage | undefined,
): AgentTraceTokenUsage {
  if (!right) return left;
  return {
    cacheRead: left.cacheRead + right.cacheRead,
    cacheWrite: left.cacheWrite + right.cacheWrite,
    input: left.input + right.input,
    output: left.output + right.output,
    reasoning: left.reasoning + right.reasoning,
    total: left.total + right.total,
  };
}

function eventOffset(event: HarnessEvent, startedAt: number): number {
  return Math.max(0, event.timestamp - startedAt);
}

function eventDuration(start: HarnessEvent, end: HarnessEvent): number {
  return Math.max(0, end.timestamp - start.timestamp);
}

function readToolIdentity(value: unknown): { toolCallId: string; toolName: string } | null {
  return isPlainObject(value) &&
    typeof value.toolCallId === "string" &&
    typeof value.toolName === "string"
    ? { toolCallId: value.toolCallId, toolName: value.toolName }
    : null;
}

function findAssistantRecordId(
  records: readonly AgentTraceRecord[],
  toolCallId: string,
): string | undefined {
  return records.findLast((record) => {
    if (record.kind !== AgentTraceRecordKind.ASSISTANT || !isPlainObject(record.raw.response)) {
      return false;
    }
    const content = record.raw.response.content;
    return (
      Array.isArray(content) &&
      content.some(
        (block) => isPlainObject(block) && block.type === "toolCall" && block.id === toolCallId,
      )
    );
  })?.id;
}

function readApprovalIdentity(
  value: unknown,
): { approvalId: string; toolCallId: string; toolName: string } | null {
  return isPlainObject(value) &&
    typeof value.approvalId === "string" &&
    typeof value.toolCallId === "string" &&
    typeof value.toolName === "string"
    ? { approvalId: value.approvalId, toolCallId: value.toolCallId, toolName: value.toolName }
    : null;
}

function readRunStatus(event: HarnessEvent | undefined): AgentTraceSession["status"] {
  if (!event) return AgentTraceStatus.RUNNING;
  if (event.type === HarnessEventType.RUN_ABORTED) return AgentTraceStatus.ABORTED;
  if (event.type === HarnessEventType.RUN_FAILED) return AgentTraceStatus.FAILED;
  return AgentTraceStatus.COMPLETED;
}

function readPendingStatus(event: HarnessEvent | undefined): AgentTraceRecord["status"] {
  const status = readRunStatus(event);
  return status === AgentTraceStatus.COMPLETED ? AgentTraceStatus.FAILED : status;
}

function readRunErrorCode(event: HarnessEvent | undefined): string | undefined {
  return event && isPlainObject(event.data) && typeof event.data.code === "string"
    ? event.data.code
    : undefined;
}

function createTrace(
  runEvents: readonly HarnessEvent[],
  now: number,
  toolDefinitions: AgentTraceToolDefinition[],
): AgentTraceSession | null {
  const started = runEvents.find((event) => event.type === HarnessEventType.RUN_STARTED);
  if (!started?.runId) return null;

  const terminal = runEvents.findLast(
    (event) =>
      event.type === HarnessEventType.RUN_COMPLETED ||
      event.type === HarnessEventType.RUN_FAILED ||
      event.type === HarnessEventType.RUN_ABORTED,
  );
  const runData = isPlainObject(started.data) ? started.data : {};
  const endedAt = terminal?.timestamp ?? now;
  const records: AgentTraceRecord[] = [];
  const userStarts: PendingEvent[] = [];
  const modelStarts: PendingEvent[] = [];
  const modelMessageStarts: HarnessEvent[] = [];
  const compactionStarts: PendingEvent[] = [];
  const toolStarts = new Map<string, PendingEvent>();
  const toolUpdates = new Map<string, HarnessEvent>();
  const approvalStarts = new Map<string, PendingEvent>();
  const approvalRequestsByToolCallId = new Map<string, HarnessEvent>();
  const approvalResolutionsByToolCallId = new Map<string, HarnessEvent>();
  let currentTurn = 0;
  let userMessageCount = 0;

  for (const event of runEvents) {
    if (event.type === HarnessEventType.CONTEXT_USAGE_SNAPSHOT) {
      const requestIndex =
        isPlainObject(event.data) && Number.isInteger(event.data.requestIndex)
          ? event.data.requestIndex
          : currentTurn + 1;
      currentTurn = Math.max(1, requestIndex);
      modelStarts.push({ event, turn: currentTurn });
      continue;
    }

    if (event.type === HarnessEventType.MESSAGE_STARTED) {
      if (isHarnessUserMessage(event.data)) {
        userStarts.push({ event, turn: Math.max(1, currentTurn + 1) });
      } else if (isPlainObject(event.data) && event.data.role === "assistant") {
        modelMessageStarts.push(event);
      }
      continue;
    }

    if (event.type === HarnessEventType.MESSAGE_COMPLETED && isPlainObject(event.data)) {
      if (event.data.role === "user") {
        if (!isHarnessUserMessage(event.data)) continue;
        const pending = userStarts.shift() ?? {
          event,
          turn: Math.max(1, currentTurn + 1),
        };
        const message = event.data.displayText.trim();
        const preview = clip(message);
        const label =
          event.data.busySubmitBehavior === BusySubmitBehavior.QUEUE
            ? "追加消息"
            : event.data.busySubmitBehavior === BusySubmitBehavior.STEER
              ? "调整方向"
              : userMessageCount > 0
                ? event.data.queuedInputId
                  ? "追加消息"
                  : "调整方向"
                : "用户输入";
        userMessageCount += 1;
        records.push({
          durationMs: eventDuration(pending.event, event),
          id: pending.event.id,
          kind: AgentTraceRecordKind.USER,
          label,
          lane: AgentTraceLane.INPUT,
          preview: preview || "用户提交了输入",
          raw: {
            attachments: (event.data.attachments ?? []).map(({ mimeType, name, size }) => ({
              mimeType,
              name,
              size,
            })),
            busySubmitBehavior: event.data.busySubmitBehavior,
            content: event.data.content,
            contextReferences: event.data.contextReferences ?? [],
            eventId: event.id,
            message,
            seq: event.seq,
            source: { kind: "user" },
          },
          source: "message.started → message.completed",
          startMs: eventOffset(pending.event, started.timestamp),
          status: AgentTraceStatus.COMPLETED,
          summary: "用户消息已进入当前 Run。",
          turn: pending.turn,
        });
        continue;
      }

      if (event.data.role === "assistant") {
        const pending = modelStarts.shift() ?? { event, turn: Math.max(1, currentTurn) };
        const messageStarted = modelMessageStarts.shift();
        const content = readFullText(event.data.content);
        const preview = clip(content);
        const stopReason =
          typeof event.data.stopReason === "string" ? event.data.stopReason : "stop";
        const status =
          stopReason === "aborted"
            ? AgentTraceStatus.ABORTED
            : stopReason === "error"
              ? AgentTraceStatus.FAILED
              : AgentTraceStatus.COMPLETED;
        const tokenUsage = readUsage(event.data.usage);
        const toolCallCount = Array.isArray(event.data.content)
          ? event.data.content.filter((block) => isPlainObject(block) && block.type === "toolCall")
              .length
          : 0;
        records.push({
          durationMs: eventDuration(pending.event, event),
          ...(status === AgentTraceStatus.FAILED
            ? { errorCode: "MODEL_FAILED" }
            : status === AgentTraceStatus.ABORTED
              ? { errorCode: "RUN_ABORTED" }
              : {}),
          id: pending.event.id,
          kind: AgentTraceRecordKind.ASSISTANT,
          label: `模型请求 ${pending.turn}`,
          lane: AgentTraceLane.MODEL,
          preview: preview || "模型未返回可见文本",
          raw: {
            context: pending.event.data,
            eventId: event.id,
            options: {
              maxTokens: runData.maxTokens,
              model: event.data.model ?? runData.modelId,
              provider: event.data.provider ?? runData.providerId,
              thinkingLevel: runData.thinkingLevel,
            },
            requestStartedAt: pending.event.timestamp,
            responseStartedAt: messageStarted?.timestamp,
            response: event.data,
            seq: event.seq,
            toolCallCount,
          },
          source: "context.usage_snapshot → message.completed",
          startMs: eventOffset(pending.event, started.timestamp),
          status,
          summary:
            status === AgentTraceStatus.COMPLETED
              ? "模型请求已完成。"
              : status === AgentTraceStatus.ABORTED
                ? "模型请求已中止。"
                : "模型请求失败。",
          ...(tokenUsage ? { tokenUsage } : {}),
          turn: pending.turn,
        });
      }
      continue;
    }

    if (event.type === HarnessEventType.TOOL_STARTED) {
      const identity = readToolIdentity(event.data);
      if (identity) toolStarts.set(identity.toolCallId, { event, turn: Math.max(1, currentTurn) });
      continue;
    }

    if (event.type === HarnessEventType.TOOL_UPDATED) {
      const identity = readToolIdentity(event.data);
      if (identity) toolUpdates.set(identity.toolCallId, event);
      continue;
    }

    if (
      event.type === HarnessEventType.TOOL_COMPLETED ||
      event.type === HarnessEventType.TOOL_FAILED
    ) {
      const identity = readToolIdentity(event.data);
      if (!identity) continue;
      const pending = toolStarts.get(identity.toolCallId) ?? {
        event,
        turn: Math.max(1, currentTurn),
      };
      const result = isPlainObject(event.data) ? stringifyUnknown(event.data.result) : "";
      const isFailed = event.type === HarnessEventType.TOOL_FAILED;
      const parentAssistantRecordId = findAssistantRecordId(records, identity.toolCallId);
      const toolDefinition = toolDefinitions.find(({ name }) => name === identity.toolName);
      const approvalResolution = approvalResolutionsByToolCallId.get(identity.toolCallId);
      const approvalDecision =
        approvalResolution && isPlainObject(approvalResolution.data)
          ? approvalResolution.data.decision
          : undefined;
      const isApprovalBlocked =
        approvalDecision === ApprovalDecision.REJECTED ||
        approvalDecision === ApprovalDecision.EXPIRED;
      const executionStartedAt = isApprovalBlocked
        ? null
        : approvalDecision === ApprovalDecision.APPROVED
          ? (approvalResolution?.timestamp ?? pending.event.timestamp)
          : pending.event.timestamp;
      const timelineStartedAt =
        executionStartedAt ?? approvalResolution?.timestamp ?? pending.event.timestamp;
      records.push({
        durationMs:
          executionStartedAt === null ? 0 : Math.max(0, event.timestamp - executionStartedAt),
        ...(isFailed ? { errorCode: "TOOL_FAILED" } : {}),
        id: pending.event.id,
        kind: AgentTraceRecordKind.TOOL,
        label: identity.toolName,
        lane: AgentTraceLane.TOOLS,
        preview: clip(result) || `${identity.toolName} 未返回结果`,
        raw: {
          arguments: isPlainObject(pending.event.data)
            ? stringifyUnknown(pending.event.data.arguments)
            : "",
          eventId: event.id,
          lifecycleStartedAt: pending.event.timestamp,
          result,
          seq: event.seq,
          ...(executionStartedAt === null ? {} : { startedAt: executionStartedAt }),
          ...(approvalResolution
            ? { approvalDecision, approvalResolvedAt: approvalResolution.timestamp }
            : {}),
          toolCallId: identity.toolCallId,
          toolName: identity.toolName,
          ...(parentAssistantRecordId ? { parentAssistantRecordId } : {}),
          ...(toolDefinition ? { toolDefinition } : {}),
        },
        source: approvalResolution
          ? `approval.resolved → ${event.type}`
          : `tool.started → ${event.type}`,
        startMs: Math.max(0, timelineStartedAt - started.timestamp),
        status: isFailed ? AgentTraceStatus.FAILED : AgentTraceStatus.COMPLETED,
        summary: isApprovalBlocked
          ? "工具调用未获批准，未执行。"
          : isFailed
            ? "工具执行失败。"
            : "工具执行成功。",
        turn: pending.turn,
      });
      toolStarts.delete(identity.toolCallId);
      toolUpdates.delete(identity.toolCallId);
      approvalResolutionsByToolCallId.delete(identity.toolCallId);
      continue;
    }

    if (event.type === HarnessEventType.APPROVAL_REQUESTED) {
      const identity = readApprovalIdentity(event.data);
      if (identity) {
        approvalStarts.set(identity.approvalId, { event, turn: Math.max(1, currentTurn) });
        approvalRequestsByToolCallId.set(identity.toolCallId, event);
      }
      continue;
    }

    if (event.type === HarnessEventType.APPROVAL_RESOLVED) {
      const identity = readApprovalIdentity(event.data);
      if (!identity) continue;
      const request = approvalStarts.get(identity.approvalId);
      const pending = request ?? {
        event,
        turn: Math.max(1, currentTurn),
      };
      const decision = isPlainObject(event.data) ? event.data.decision : undefined;
      approvalRequestsByToolCallId.delete(identity.toolCallId);
      approvalResolutionsByToolCallId.set(identity.toolCallId, event);
      const isExpired = decision === ApprovalDecision.EXPIRED;
      const preview =
        decision === ApprovalDecision.APPROVED
          ? "用户已批准"
          : decision === ApprovalDecision.REJECTED
            ? "用户已拒绝"
            : "审批已超时";
      records.push({
        durationMs: eventDuration(pending.event, event),
        ...(isExpired ? { errorCode: "APPROVAL_EXPIRED" } : {}),
        id: pending.event.id,
        kind: AgentTraceRecordKind.APPROVAL,
        label: `审批 · ${identity.toolName}`,
        lane: AgentTraceLane.INPUT,
        preview,
        raw: {
          approvalId: identity.approvalId,
          decision,
          resolution: event.data,
          resolutionEventId: event.id,
          resolutionSeq: event.seq,
          resolvedAt: event.timestamp,
          ...(request
            ? {
                request: request.event.data,
                requestedAt: request.event.timestamp,
                requestEventId: request.event.id,
                requestSeq: request.event.seq,
              }
            : {}),
          seq: request?.event.seq ?? event.seq,
          toolCallId: identity.toolCallId,
          toolName: identity.toolName,
        },
        source: request ? "approval.requested → approval.resolved" : "approval.resolved",
        startMs: eventOffset(pending.event, started.timestamp),
        status: isExpired ? AgentTraceStatus.FAILED : AgentTraceStatus.COMPLETED,
        summary: `${identity.toolName} 的审批${preview}。`,
        turn: pending.turn,
      });
      approvalStarts.delete(identity.approvalId);
      continue;
    }

    if (event.type === HarnessEventType.CONTEXT_COMPACTION_STARTED) {
      compactionStarts.push({ event, turn: Math.max(1, currentTurn + 1) });
      continue;
    }

    if (event.type === HarnessEventType.CONTEXT_COMPACTED) {
      const pending = compactionStarts.shift() ?? {
        event,
        turn: Math.max(1, currentTurn || 1),
      };
      const data = isContextCompactedData(event.data) ? event.data : null;
      const tokenUsage = readUsage(data?.compactionUsage);
      const preview = data
        ? `${data.beforeTokens.toLocaleString()} → ${data.afterTokens.toLocaleString()} tokens`
        : "上下文压缩已完成";
      records.push({
        durationMs: eventDuration(pending.event, event),
        id: pending.event.id,
        kind: AgentTraceRecordKind.CONTEXT,
        label: "上下文压缩",
        lane: AgentTraceLane.MODEL,
        preview,
        raw: data
          ? {
              afterTokens: data.afterTokens,
              beforeTokens: data.beforeTokens,
              checkpoint: data.checkpoint,
              compactedMessageCount: data.compactedMessageCount,
              compactionReason: data.compactionReason,
              compactionStrategy: data.compactionStrategy,
              eventId: event.id,
              seq: event.seq,
            }
          : { eventId: event.id, seq: event.seq },
        source: "context.compaction_started → context.compacted",
        startMs: eventOffset(pending.event, started.timestamp),
        status: AgentTraceStatus.COMPLETED,
        summary: data ? `已压缩 ${data.compactedMessageCount} 条历史消息。` : "上下文压缩已完成。",
        ...(tokenUsage ? { tokenUsage } : {}),
        turn: pending.turn,
      });
    }
  }

  const pendingStatus = readPendingStatus(terminal);
  const pendingErrorCode = terminal
    ? (readRunErrorCode(terminal) ?? "TRACE_INCOMPLETE")
    : undefined;
  for (const pending of modelStarts) {
    const messageStarted = modelMessageStarts.shift();
    records.push({
      durationMs: Math.max(0, endedAt - pending.event.timestamp),
      ...(pendingErrorCode ? { errorCode: pendingErrorCode } : {}),
      id: pending.event.id,
      kind: AgentTraceRecordKind.ASSISTANT,
      label: `模型请求 ${pending.turn}`,
      lane: AgentTraceLane.MODEL,
      preview: "模型正在响应",
      raw: {
        context: pending.event.data,
        eventId: pending.event.id,
        options: {
          maxTokens: runData.maxTokens,
          model: runData.modelId,
          provider: runData.providerId,
          thinkingLevel: runData.thinkingLevel,
        },
        requestStartedAt: pending.event.timestamp,
        responseStartedAt: messageStarted?.timestamp,
        seq: pending.event.seq,
        toolCallCount: 0,
      },
      source: "context.usage_snapshot",
      startMs: eventOffset(pending.event, started.timestamp),
      status: terminal ? pendingStatus : AgentTraceStatus.RUNNING,
      summary: terminal ? "模型请求缺少完成事件。" : "模型请求正在执行。",
      turn: pending.turn,
    });
  }
  for (const [toolCallId, pending] of toolStarts) {
    const identity = readToolIdentity(pending.event.data);
    if (!identity) continue;
    const update = toolUpdates.get(toolCallId);
    const approvalRequest = approvalRequestsByToolCallId.get(toolCallId);
    const preview = approvalRequest
      ? "等待用户审批"
      : update && isPlainObject(update.data)
        ? readUnknown(update.data.partialResult)
        : "工具正在执行";
    const parentAssistantRecordId = findAssistantRecordId(records, toolCallId);
    const toolDefinition = toolDefinitions.find(({ name }) => name === identity.toolName);
    records.push({
      durationMs: approvalRequest ? 0 : Math.max(0, endedAt - pending.event.timestamp),
      ...(pendingErrorCode ? { errorCode: pendingErrorCode } : {}),
      id: pending.event.id,
      kind: AgentTraceRecordKind.TOOL,
      label: identity.toolName,
      lane: AgentTraceLane.TOOLS,
      preview,
      raw: {
        arguments: isPlainObject(pending.event.data)
          ? stringifyUnknown(pending.event.data.arguments)
          : "",
        lifecycleStartedAt: pending.event.timestamp,
        ...(approvalRequest ? {} : { startedAt: pending.event.timestamp }),
        toolCallId,
        toolName: identity.toolName,
        ...(parentAssistantRecordId ? { parentAssistantRecordId } : {}),
        ...(toolDefinition ? { toolDefinition } : {}),
      },
      source: "tool.started",
      startMs: eventOffset(pending.event, started.timestamp),
      status: terminal ? pendingStatus : AgentTraceStatus.RUNNING,
      summary: approvalRequest
        ? "工具正在等待审批。"
        : terminal
          ? "工具调用缺少完成事件。"
          : "工具正在执行。",
      turn: pending.turn,
    });
  }
  for (const [approvalId, pending] of approvalStarts) {
    const identity = readApprovalIdentity(pending.event.data);
    if (!identity) continue;
    records.push({
      durationMs: Math.max(0, endedAt - pending.event.timestamp),
      ...(pendingErrorCode ? { errorCode: pendingErrorCode } : {}),
      id: pending.event.id,
      kind: AgentTraceRecordKind.APPROVAL,
      label: `审批 · ${identity.toolName}`,
      lane: AgentTraceLane.INPUT,
      preview: "等待用户审批",
      raw: {
        approvalId,
        request: pending.event.data,
        requestedAt: pending.event.timestamp,
        requestEventId: pending.event.id,
        requestSeq: pending.event.seq,
        seq: pending.event.seq,
        toolCallId: identity.toolCallId,
        toolName: identity.toolName,
      },
      source: "approval.requested",
      startMs: eventOffset(pending.event, started.timestamp),
      status: terminal ? pendingStatus : AgentTraceStatus.RUNNING,
      summary: terminal ? "审批缺少完成事件。" : "正在等待用户审批。",
      turn: pending.turn,
    });
  }
  for (const pending of compactionStarts) {
    records.push({
      durationMs: Math.max(0, endedAt - pending.event.timestamp),
      ...(pendingErrorCode ? { errorCode: pendingErrorCode } : {}),
      id: pending.event.id,
      kind: AgentTraceRecordKind.CONTEXT,
      label: "上下文压缩",
      lane: AgentTraceLane.MODEL,
      preview: "正在压缩上下文",
      raw: { eventId: pending.event.id, seq: pending.event.seq },
      source: "context.compaction_started",
      startMs: eventOffset(pending.event, started.timestamp),
      status: terminal ? pendingStatus : AgentTraceStatus.RUNNING,
      summary: terminal ? "上下文压缩缺少完成事件。" : "上下文正在压缩。",
      turn: pending.turn,
    });
  }

  records.sort(compareRecords);
  const tokenUsage = records.reduce(
    (total, record) => addUsage(total, record.tokenUsage),
    EMPTY_USAGE,
  );
  const runErrorCode = readRunErrorCode(terminal);

  return {
    durationMs: Math.max(1, endedAt - started.timestamp),
    ...(runErrorCode ? { errorCode: runErrorCode } : {}),
    model: typeof runData.modelId === "string" ? runData.modelId : "未知模型",
    records,
    startedAt: started.timestamp,
    status: readRunStatus(terminal),
    tokenUsage,
    traceId: started.runId,
  };
}

export function sessionEventsToAgentTraces(
  events: readonly HarnessEvent[],
  now = Date.now(),
): AgentTraceSession[] {
  const byRunId = new Map<string, HarnessEvent[]>();
  const toolDefinitionsByRunId = new Map<string, AgentTraceToolDefinition[]>();
  let currentToolDefinitions: AgentTraceToolDefinition[] = [];
  for (const event of events) {
    if (!event.runId) continue;
    const runEvents = byRunId.get(event.runId) ?? [];
    runEvents.push(event);
    byRunId.set(event.runId, runEvents);
    if (event.type === HarnessEventType.RUN_STARTED && isPlainObject(event.data)) {
      if (Array.isArray(event.data.tools)) {
        currentToolDefinitions = readToolDefinitions(event.data.tools);
      }
      toolDefinitionsByRunId.set(event.runId, currentToolDefinitions);
    }
  }

  const runTraces = Array.from(byRunId.values())
    .flatMap((runEvents) => {
      const runId = runEvents[0]?.runId;
      const trace = createTrace(
        runEvents,
        now,
        runId === undefined ? [] : (toolDefinitionsByRunId.get(runId) ?? []),
      );
      return trace ? [trace] : [];
    })
    .sort((left, right) => left.startedAt - right.startedAt);
  const firstTrace = runTraces[0];
  const latestTrace = runTraces.at(-1);
  if (!firstTrace || !latestTrace) return [];

  const startedAt = firstTrace.startedAt;
  const records: AgentTraceRecord[] = [];
  let timelineOffset = 0;
  let hasRecordedContextSnapshot = false;
  let recordedContexts = new Map<string, RunContextData>();
  let recordedSystem: string | null = null;
  let systemRecordCount = 0;

  for (const trace of runTraces) {
    const runEvents = byRunId.get(trace.traceId) ?? [];
    const runStarted = runEvents.find((event) => event.type === HarnessEventType.RUN_STARTED);
    const runOffset = timelineOffset;
    if (runStarted) {
      const data = isPlainObject(runStarted.data) ? runStarted.data : {};
      const systemPrompt = typeof data.systemPrompt === "string" ? data.systemPrompt : "";
      const contexts = readRunContexts(data.contexts);
      const tools = readToolDefinitions(data.tools);
      const systemSnapshot =
        typeof data.systemPrompt === "string" && Array.isArray(data.tools)
          ? JSON.stringify([systemPrompt, tools])
          : null;
      if (systemSnapshot !== null && systemSnapshot !== recordedSystem) {
        const isInitial = systemRecordCount === 0;
        records.push({
          durationMs: 0,
          id: runStarted.id,
          kind: AgentTraceRecordKind.SYSTEM,
          label: isInitial ? "Initial System Prompt" : "System Prompt Updated",
          lane: AgentTraceLane.INPUT,
          preview: `${tools.length} 个工具 · ${typeof data.modelId === "string" ? data.modelId : "未知模型"}`,
          raw: {
            eventId: runStarted.id,
            modelId: data.modelId,
            providerId: data.providerId,
            runId: trace.traceId,
            seq: runStarted.seq,
            systemPrompt,
            tools,
          },
          source: HarnessEventType.RUN_STARTED,
          startMs: runOffset,
          status: AgentTraceStatus.COMPLETED,
          summary: isInitial
            ? `Session 首次记录系统提示词和 ${tools.length} 个工具定义。`
            : `系统提示词或工具定义已更新，当前包含 ${tools.length} 个工具。`,
          systemPrompt: { content: systemPrompt, tools },
          turn: 0,
        });
        recordedSystem = systemSnapshot;
        systemRecordCount += 1;
      }
      if (Array.isArray(data.contexts)) {
        const isDelta = Array.isArray(data.removedContextTypes);
        const removedContextTypes = isDelta
          ? data.removedContextTypes.filter(
              (type: unknown): type is string => typeof type === "string",
            )
          : [...recordedContexts.keys()].filter(
              (type) => !contexts.some((context) => context.type === type),
            );
        const changedContexts = contexts.filter(
          (context) =>
            JSON.stringify(recordedContexts.get(context.type)) !== JSON.stringify(context),
        );
        const nextContexts = isDelta
          ? new Map(recordedContexts)
          : new Map<string, RunContextData>();
        for (const type of removedContextTypes) nextContexts.delete(type);
        for (const context of contexts) nextContexts.set(context.type, context);

        for (const [index, context] of changedContexts.entries()) {
          records.push({
            durationMs: 0,
            id: `${runStarted.id}:context:${context.type}:${index}`,
            kind: AgentTraceRecordKind.CONTEXT,
            label: context.label,
            lane: AgentTraceLane.INPUT,
            preview: clip(context.content),
            raw: {
              context: context.content,
              contextType: context.type,
              eventId: runStarted.id,
              runId: trace.traceId,
              seq: runStarted.seq,
            },
            source: HarnessEventType.RUN_STARTED,
            startMs: runOffset,
            status: AgentTraceStatus.COMPLETED,
            summary: !hasRecordedContextSnapshot
              ? `Session 首次记录的 ${context.label} Context。`
              : `${context.label} Context 已更新。`,
            turn: 0,
          });
        }
        for (const type of removedContextTypes) {
          const previous = recordedContexts.get(type);
          if (previous === undefined) continue;
          records.push({
            durationMs: 0,
            id: `${runStarted.id}:context:${type}:removed`,
            kind: AgentTraceRecordKind.CONTEXT,
            label: previous.label,
            lane: AgentTraceLane.INPUT,
            preview: "该 Context 已移除",
            raw: {
              context: previous.content,
              contextChange: "removed",
              contextType: type,
              eventId: runStarted.id,
              runId: trace.traceId,
              seq: runStarted.seq,
            },
            source: HarnessEventType.RUN_STARTED,
            startMs: runOffset,
            status: AgentTraceStatus.COMPLETED,
            summary: `${previous.label} Context 已移除。`,
            turn: 0,
          });
        }
        recordedContexts = nextContexts;
        hasRecordedContextSnapshot = true;
      }
    }

    const runTerminal = runEvents.findLast(
      (event) =>
        event.type === HarnessEventType.RUN_COMPLETED ||
        event.type === HarnessEventType.RUN_FAILED ||
        event.type === HarnessEventType.RUN_ABORTED,
    );
    if (runTerminal) {
      const data = isPlainObject(runTerminal.data) ? runTerminal.data : {};
      const label =
        runTerminal.type === HarnessEventType.RUN_FAILED
          ? "回复生成失败"
          : runTerminal.type === HarnessEventType.RUN_ABORTED
            ? "回复已中止"
            : "运行完成";
      const errorCode = readRunErrorCode(runTerminal);
      records.push({
        durationMs: 0,
        ...(errorCode ? { errorCode } : {}),
        id: runTerminal.id,
        kind: AgentTraceRecordKind.RUN,
        label,
        lane: AgentTraceLane.MODEL,
        preview: typeof data.message === "string" ? clip(data.message) : label,
        raw: {
          code: data.code,
          eventId: runTerminal.id,
          message: data.message,
          runId: trace.traceId,
          seq: runTerminal.seq,
        },
        source: runTerminal.type,
        startMs: runOffset + trace.durationMs,
        status: trace.status,
        summary: label,
        turn: 0,
      });
    }

    records.push(
      ...trace.records.map((record) => ({
        ...record,
        raw: { ...record.raw, runId: trace.traceId },
        startMs: record.startMs + runOffset,
      })),
    );
    timelineOffset += trace.durationMs;
  }

  for (const event of events) {
    if (
      event.type !== HarnessEventType.MESSAGE_BRANCH_STARTED ||
      !isMessageBranchStartedData(event.data)
    ) {
      continue;
    }
    const sourceEventId = event.data.sourceEventId;
    const source = events.find((item) => item.id === sourceEventId);
    records.push({
      durationMs: 0,
      id: event.id,
      kind: AgentTraceRecordKind.USER,
      label: "编辑消息",
      lane: AgentTraceLane.INPUT,
      preview: isHarnessUserMessage(source?.data)
        ? clip(source.data.displayText)
        : "从已发送消息创建新分支",
      raw: {
        eventId: event.id,
        seq: event.seq,
        sourceEventId,
      },
      source: HarnessEventType.MESSAGE_BRANCH_STARTED,
      startMs: runTraces.reduce(
        (offset, trace) => offset + (trace.startedAt < event.timestamp ? trace.durationMs : 0),
        0,
      ),
      status: AgentTraceStatus.COMPLETED,
      summary: "用户编辑了已发送的消息，并从这里继续会话。",
      turn: 0,
    });
  }

  records.sort(compareRecords);
  let currentTurn = 0;
  let currentRequest = 0;
  let cumulativeRequestUsage = EMPTY_USAGE;
  let activeRunId: string | null = null;
  let hasActiveRunTurn = false;
  let pendingRunContexts: AgentTraceRecord[] = [];
  for (const record of records) {
    const runId = typeof record.raw.runId === "string" ? record.raw.runId : null;
    if (runId !== null && runId !== activeRunId) {
      activeRunId = runId;
      hasActiveRunTurn = false;
      pendingRunContexts = [];
    }
    if (record.source === HarnessEventType.RUN_STARTED) {
      if (record.kind === AgentTraceRecordKind.CONTEXT) pendingRunContexts.push(record);
      record.turn = 0;
      continue;
    }
    const isUserMessage =
      record.kind === AgentTraceRecordKind.USER &&
      record.source === "message.started → message.completed";
    if (isUserMessage) {
      currentTurn += 1;
      hasActiveRunTurn = true;
      for (const context of pendingRunContexts) context.turn = currentTurn;
      pendingRunContexts = [];
    }
    record.turn =
      record.source === HarnessEventType.MESSAGE_BRANCH_STARTED || !hasActiveRunTurn
        ? 0
        : currentTurn;
    if (record.kind === AgentTraceRecordKind.ASSISTANT) {
      record.request = ++currentRequest;
      cumulativeRequestUsage = addUsage(cumulativeRequestUsage, record.tokenUsage);
      record.cumulativeTokenUsage = { ...cumulativeRequestUsage };
    }
  }
  const tokenUsage = runTraces.reduce(
    (total, trace) => addUsage(total, trace.tokenUsage),
    EMPTY_USAGE,
  );
  const models = Array.from(new Set(runTraces.map((trace) => trace.model)));
  const durationMs = Math.max(1, timelineOffset);

  return [
    {
      durationMs,
      ...(latestTrace.errorCode ? { errorCode: latestTrace.errorCode } : {}),
      model: models.join(" → "),
      records,
      startedAt,
      status: latestTrace.status,
      tokenUsage,
      traceId: events[0]?.sessionId ?? firstTrace.traceId,
    },
  ];
}
