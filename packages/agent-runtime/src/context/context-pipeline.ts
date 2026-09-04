import { randomUUID } from "node:crypto";
import type { AgentMessage, AgentTool, StreamFn } from "@earendil-works/pi-agent-core";
import type { Api, Message, Model, Usage } from "@earendil-works/pi-ai";
import type { PlanUpdatedData, TodoUpdatedData } from "@pi-harness/tools";
import { isPlainObject } from "es-toolkit";
import {
  ContextCompactionReason as CompactionReason,
  ContextCompactionStrategy as CompactionStrategy,
  type ContextCheckpoint,
  type ContextCompactedData,
  type ContextCompactionReason,
  type ContextCompactionStrategy,
} from "../harness-event.js";
import { buildContextCompactionPrompt } from "../prompts/context-compaction-prompt.js";
import { isHarnessUserMessage } from "../user-input.js";
import { estimateContextUsage, estimateMessageTokens } from "../utils/context-usage.js";
import { limitUserInputContext } from "../utils/user-input.js";

const COMPACTION_TRIGGER_SHARE = 0.8;
const RECENT_CONTEXT_TARGET_SHARE = 0.16;
const MAX_CHECKPOINT_ITEMS = 24;
const MAX_CHECKPOINT_ITEM_CHARACTERS = 1_000;
const MAX_OBJECTIVE_CHARACTERS = 4_000;
const MAX_NEXT_ACTION_CHARACTERS = 2_000;
const MAX_TRANSCRIPT_BLOCK_CHARACTERS = 12_000;
const COMPACTION_MAX_OUTPUT_TOKENS = 2_048;
const COMPACTION_TIMEOUT_MS = 120_000;
const TOOL_RESULT_PRUNE_THRESHOLD_CHARACTERS = 8_192;
const TOOL_RESULT_PRUNE_HEAD_CHARACTERS = 4_096;
const TOOL_RESULT_PRUNE_TAIL_CHARACTERS = 1_024;

export const CONTEXT_WINDOW_EXCEEDED_ERROR_CODE = "CONTEXT_WINDOW_EXCEEDED";

export interface ContextProjectionInput {
  activeRunStartMessageIndex: number;
  checkpoint: ContextCompactedData | null;
  checkpointTailStartMessageIndex?: number;
  compactionReason?: ContextCompactionReason;
  messages: readonly AgentMessage[];
  model: Model<Api>;
  onCompactionStarted?: () => Promise<void>;
  plan: PlanUpdatedData | null;
  sessionId: string;
  signal?: AbortSignal;
  streamFn: StreamFn;
  systemPrompt: string;
  todos: TodoUpdatedData | null;
  tools: readonly AgentTool[];
}

function clip(value: string, maximumCharacters: number): string {
  const trimmed = value.trim();
  if (trimmed.length <= maximumCharacters) return trimmed;
  return `${trimmed.slice(0, Math.max(0, maximumCharacters - 13))}\n[已截断]`;
}

function safeStringify(value: unknown): string {
  try {
    return JSON.stringify(value) ?? "undefined";
  } catch {
    return "[无法序列化]";
  }
}

function pruneToolResultText(value: string): string {
  if (value.length <= TOOL_RESULT_PRUNE_THRESHOLD_CHARACTERS) return value;
  const marker = "\n\n[历史 Tool 输出已截断]\n\n";
  return `${value.slice(0, TOOL_RESULT_PRUNE_HEAD_CHARACTERS)}${marker}${value.slice(
    -TOOL_RESULT_PRUNE_TAIL_CHARACTERS,
  )}`;
}

function readTextContent(message: Message): string {
  if (typeof message.content === "string") return message.content;
  return message.content
    .flatMap((part) => {
      if (part.type === "text") return [part.text];
      if (part.type === "thinking" || part.type === "image") return [];
      return [`调用工具 ${part.name}：${safeStringify(part.arguments)}`];
    })
    .join("\n");
}

function isLlmMessage(message: AgentMessage): message is Message {
  return message.role === "user" || message.role === "assistant" || message.role === "toolResult";
}

function limitToolResults(messages: readonly AgentMessage[]): AgentMessage[] {
  return messages.map((message) => {
    if (!isLlmMessage(message) || message.role !== "toolResult") return message;
    return {
      ...message,
      content: message.content.map((part) =>
        part.type === "image" ? part : { ...part, text: pruneToolResultText(part.text) },
      ),
    };
  });
}

function formatTranscriptMessage(message: Message): string {
  const label =
    message.role === "user"
      ? "USER"
      : message.role === "assistant"
        ? "ASSISTANT"
        : `TOOL ${message.toolName}${message.isError ? " ERROR" : ""}`;
  return `${label}\n${clip(readTextContent(message), MAX_TRANSCRIPT_BLOCK_CHARACTERS)}`;
}

function readStringArray(value: unknown): string[] | null {
  if (!Array.isArray(value) || value.some((item) => typeof item !== "string")) return null;
  return value
    .slice(0, MAX_CHECKPOINT_ITEMS)
    .map((item) => clip(item, MAX_CHECKPOINT_ITEM_CHARACTERS))
    .filter(Boolean);
}

function parseCheckpoint(source: string): ContextCheckpoint | null {
  const start = source.indexOf("{");
  const end = source.lastIndexOf("}");
  if (start < 0 || end <= start) return null;

  let value: unknown;
  try {
    value = JSON.parse(source.slice(start, end + 1)) as unknown;
  } catch {
    return null;
  }
  if (!isPlainObject(value)) return null;

  const constraints = readStringArray(value.constraints);
  const decisions = readStringArray(value.decisions);
  const completed = readStringArray(value.completed);
  const pending = readStringArray(value.pending);
  const blockers = readStringArray(value.blockers);
  if (
    typeof value.objective !== "string" ||
    typeof value.nextAction !== "string" ||
    constraints === null ||
    decisions === null ||
    completed === null ||
    pending === null ||
    blockers === null
  ) {
    return null;
  }

  return {
    blockers,
    completed,
    constraints,
    decisions,
    nextAction: clip(value.nextAction, MAX_NEXT_ACTION_CHARACTERS),
    objective: clip(value.objective, MAX_OBJECTIVE_CHARACTERS),
    pending,
  };
}

function fallbackCheckpoint(
  previous: ContextCompactedData | null,
  messages: readonly Message[],
): ContextCheckpoint {
  const latestUserText = [...messages].reverse().find((message) => message.role === "user");
  const activity = clip(messages.map(formatTranscriptMessage).join("\n\n"), 8_000);
  const base = previous?.checkpoint;
  return {
    blockers: base?.blockers ?? [],
    completed: base?.completed ?? [],
    constraints: base?.constraints ?? [],
    decisions: base?.decisions ?? [],
    nextAction: base?.nextAction ?? "继续前先重新读取相关 workspace 文件并确认当前状态。",
    objective:
      base?.objective ||
      (latestUserText === undefined
        ? "继续当前 Session 中尚未完成的任务。"
        : clip(readTextContent(latestUserText), MAX_OBJECTIVE_CHARACTERS)),
    pending: [...(base?.pending ?? []), activity ? `最近压缩活动：\n${activity}` : ""]
      .filter(Boolean)
      .slice(-MAX_CHECKPOINT_ITEMS),
  };
}

// 压缩时真正向ai发起请求的地方
async function generateCheckpoint(
  input: ContextProjectionInput,
  cacheablePrefix: readonly Message[],
  sourceMessages: readonly Message[],
): Promise<{
  checkpoint: ContextCheckpoint;
  strategy: ContextCompactionStrategy;
  usage?: Usage;
}> {
  try {
    const stream = await input.streamFn(
      input.model,
      {
        messages: [
          ...cacheablePrefix,
          {
            content: buildContextCompactionPrompt(
              safeStringify({ plan: input.plan, todos: input.todos }),
            ),
            role: "user",
            timestamp: Date.now(),
          },
        ],
        systemPrompt: input.systemPrompt,
        tools: [...input.tools],
      },
      {
        cacheRetention: "long",
        maxTokens: COMPACTION_MAX_OUTPUT_TOKENS,
        sessionId: input.sessionId,
        ...(input.signal === undefined ? {} : { signal: input.signal }),
        timeoutMs: COMPACTION_TIMEOUT_MS,
      },
    );
    const response = await stream.result();
    if (response.stopReason === "error" || response.stopReason === "aborted") {
      return {
        checkpoint: fallbackCheckpoint(input.checkpoint, sourceMessages),
        strategy: CompactionStrategy.FALLBACK,
      };
    }
    const checkpoint = parseCheckpoint(readTextContent(response));
    return checkpoint === null
      ? {
          checkpoint: fallbackCheckpoint(input.checkpoint, sourceMessages),
          strategy: CompactionStrategy.FALLBACK,
          usage: response.usage,
        }
      : {
          checkpoint,
          strategy: CompactionStrategy.MODEL,
          usage: response.usage,
        };
  } catch {
    return {
      checkpoint: fallbackCheckpoint(input.checkpoint, sourceMessages),
      strategy: CompactionStrategy.FALLBACK,
    };
  }
}

function resolveInputBudget(model: Model<Api>): number {
  const reserve = Math.min(
    model.maxTokens,
    Math.max(2_048, Math.floor(model.contextWindow * 0.1)),
    Math.floor(model.contextWindow * 0.25),
  );
  return Math.max(1_024, model.contextWindow - reserve);
}

function readAtomicGroupEnds(messages: readonly AgentMessage[], startIndex: number): number[] {
  const ends: number[] = [];
  let index = startIndex;
  while (index < messages.length) {
    const message = messages[index];
    if (message === undefined || !isLlmMessage(message) || message.role !== "assistant") {
      index += 1;
      ends.push(index);
      continue;
    }

    const toolCallIds = new Set(
      message.content.flatMap((part) => (part.type === "toolCall" ? [part.id] : [])),
    );
    index += 1;
    while (index < messages.length) {
      const candidate = messages[index];
      if (
        candidate === undefined ||
        !isLlmMessage(candidate) ||
        candidate.role !== "toolResult" ||
        !toolCallIds.has(candidate.toolCallId)
      ) {
        break;
      }
      index += 1;
    }
    ends.push(index);
  }
  return ends;
}

function chooseTailStart(
  messages: readonly AgentMessage[],
  minimumStart: number,
  targetTokens: number,
): number {
  const ends = readAtomicGroupEnds(messages, minimumStart);
  if (ends.length <= 1) return minimumStart;

  let tokens = 0;
  let tailStart = ends.at(-2) ?? minimumStart;
  for (let groupIndex = ends.length - 1; groupIndex >= 0; groupIndex -= 1) {
    const groupStart = groupIndex === 0 ? minimumStart : (ends[groupIndex - 1] ?? minimumStart);
    const groupEnd = ends[groupIndex] ?? messages.length;
    const groupTokens = messages
      .slice(groupStart, groupEnd)
      .reduce(
        (total, message) => total + (isLlmMessage(message) ? estimateMessageTokens(message) : 0),
        0,
      );
    if (tokens > 0 && tokens + groupTokens > targetTokens) break;
    tokens += groupTokens;
    tailStart = groupStart;
  }
  return tailStart;
}

function createCheckpointMessage(data: ContextCompactedData): Message {
  return {
    content: [
      {
        text: [
          "[Runtime 工作状态 checkpoint；这是历史事实的派生摘要，当前用户请求与 System Prompt 优先。]",
          safeStringify(data.checkpoint),
        ].join("\n"),
        type: "text",
      },
    ],
    role: "user",
    timestamp: 0,
  };
}

function createTaskContractMessage(message: AgentMessage | undefined): Message | null {
  if (message === undefined || !isLlmMessage(message) || message.role !== "user") return null;
  const text = isHarnessUserMessage(message) ? message.displayText : readTextContent(message);
  if (!text.trim()) return null;
  return {
    content: [
      {
        text: `[当前 Run 的原始任务契约]\n${clip(text, MAX_OBJECTIVE_CHARACTERS)}`,
        type: "text",
      },
    ],
    role: "user",
    timestamp: message.timestamp,
  };
}

function buildProjectedMessages(
  messages: readonly AgentMessage[],
  checkpoint: ContextCompactedData,
  tailStartMessageIndex: number,
  activeRunStartMessageIndex: number,
): AgentMessage[] {
  const projected: AgentMessage[] = [createCheckpointMessage(checkpoint)];
  if (activeRunStartMessageIndex < tailStartMessageIndex) {
    const taskContract = createTaskContractMessage(messages[activeRunStartMessageIndex]);
    if (taskContract !== null) projected.push(taskContract);
  }
  projected.push(...messages.slice(tailStartMessageIndex));
  return projected;
}

function estimateProjectedTokens(
  messages: readonly AgentMessage[],
  systemPrompt: string,
  tools: readonly AgentTool[],
): number {
  return estimateContextUsage({
    messages: messages.filter(isLlmMessage),
    systemPrompt,
    tools: [...tools],
  }).estimatedTotalTokens;
}

export interface ContextProjectionResult {
  // 本次生成了新的checkpoint
  compacted?: ContextCompactedData;
  // 即使压缩后仍超过模型预算
  error?: string;
  // 本次发送给主模型的消息
  messages: AgentMessage[];
}

/**
 * 真正的 Token 计算、裁剪和压缩的部分，返回最终的message和生成的checkpoint
 *
 * 1、projectContext 主要是获取到所有的messages、系统prompt、tools
 * 2、然后通过计算模型输入预算，注入当前 checkpoint，计算当前 Token
 * 3、判断：
 *    - 未达到阈值：直接返回（结束）
 *    - 达到阈值：选择需要保留的最近消息
 *      4、调用压缩模型生成 checkpoint
 *      5、用新 checkpoint 重新生成消息，这些消息只用于这一轮模型请求
 *        包含：新 checkpoint + 当前run的原始任务 + 最近完整消息
 *
 * checkpoint 通常是 AI 对旧上下文生成的结构化总结，包含：当前目标、约束、决策、已完成、待完成、阻塞、下一步
 * 它用于替代旧消息进入后续模型上下文，但不会删除原始消息。
 * 如果 AI 总结失败，Runtime 会生成一个本地 fallback checkpoint。
 */
export async function projectContext(
  input: ContextProjectionInput,
): Promise<ContextProjectionResult> {
  const limited = limitToolResults(
    limitUserInputContext(input.messages, input.model.contextWindow),
  );
  const inputBudget = resolveInputBudget(input.model);
  const triggerTokens = Math.floor(inputBudget * COMPACTION_TRIGGER_SHARE);
  const tailStartMessageIndex =
    input.checkpointTailStartMessageIndex ?? input.checkpoint?.sourceMessageCount ?? 0;
  const current =
    input.checkpoint === null
      ? limited
      : buildProjectedMessages(
          limited,
          input.checkpoint,
          tailStartMessageIndex,
          input.activeRunStartMessageIndex,
        );
  const beforeTokens = estimateProjectedTokens(current, input.systemPrompt, input.tools);
  if (beforeTokens <= triggerTokens) return { messages: current };

  const minimumStart = tailStartMessageIndex;
  const tailStart = chooseTailStart(
    limited,
    minimumStart,
    Math.floor(inputBudget * RECENT_CONTEXT_TARGET_SHARE),
  );
  if (tailStart <= minimumStart) {
    return beforeTokens > inputBudget
      ? {
          error: `当前任务和最近消息约占 ${beforeTokens} tokens，超过模型可用输入预算 ${inputBudget} tokens`,
          messages: current,
        }
      : { messages: current };
  }

  await input.onCompactionStarted?.();
  const sourceMessages = limited.slice(minimumStart, tailStart).filter(isLlmMessage);
  const cacheablePrefix =
    input.checkpoint === null
      ? limited.slice(0, tailStart).filter(isLlmMessage)
      : buildProjectedMessages(
          limited.slice(0, tailStart),
          input.checkpoint,
          minimumStart,
          input.activeRunStartMessageIndex,
        ).filter(isLlmMessage);
  const generated = await generateCheckpoint(input, cacheablePrefix, sourceMessages);
  if (input.signal?.aborted) return { messages: current };
  const compacted: ContextCompactedData = {
    afterTokens: 0,
    beforeTokens,
    checkpoint: generated.checkpoint,
    compactionId: randomUUID(),
    compactionReason: input.compactionReason ?? CompactionReason.THRESHOLD,
    compactionStrategy: generated.strategy,
    compactedMessageCount: tailStart - minimumStart,
    ...(generated.usage === undefined ? {} : { compactionUsage: generated.usage }),
    coveredMessageRange: { end: tailStart, start: minimumStart },
    ...(input.checkpoint?.compactionId === undefined
      ? {}
      : { previousCompactionId: input.checkpoint.compactionId }),
    sourceMessageCount: tailStart,
  };
  const projected = buildProjectedMessages(
    limited,
    compacted,
    compacted.sourceMessageCount,
    input.activeRunStartMessageIndex,
  );
  compacted.afterTokens = estimateProjectedTokens(projected, input.systemPrompt, input.tools);
  return {
    compacted,
    ...(compacted.afterTokens > inputBudget
      ? {
          error: `压缩后上下文约占 ${compacted.afterTokens} tokens，超过模型可用输入预算 ${inputBudget} tokens`,
        }
      : {}),
    messages: projected,
  };
}
