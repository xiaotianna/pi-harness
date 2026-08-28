import type { Context, Message } from "@earendil-works/pi-ai";

const APPROXIMATE_CHARS_PER_TOKEN = 4;
const APPROXIMATE_IMAGE_TOKENS = 1_200;

export interface ContextUsageEstimate {
  conversationTokens: number;
  estimatedTotalTokens: number;
  systemPromptTokens: number;
  toolTokens: number;
}

function estimateTextTokens(text: string): number {
  return Math.ceil(text.length / APPROXIMATE_CHARS_PER_TOKEN);
}

function safeStringify(value: unknown): string {
  try {
    return JSON.stringify(value) ?? "undefined";
  } catch {
    return "[unserializable]";
  }
}

function estimateContentTokens(content: Message["content"]): number {
  if (typeof content === "string") return estimateTextTokens(content);

  let tokens = 0;
  for (const block of content) {
    if (block.type === "image") {
      tokens += APPROXIMATE_IMAGE_TOKENS;
    } else if (block.type === "text") {
      tokens += estimateTextTokens(block.text);
    }
  }
  return tokens;
}

function estimateMessageTokens(message: Message): number {
  if (message.role === "user" || message.role === "toolResult") {
    return estimateContentTokens(message.content);
  }

  let tokens = 0;
  for (const block of message.content) {
    if (block.type === "text") {
      tokens += estimateTextTokens(block.text);
    } else if (block.type === "thinking") {
      tokens += estimateTextTokens(block.thinking);
    } else {
      tokens += estimateTextTokens(block.name) + estimateTextTokens(safeStringify(block.arguments));
    }
  }
  return tokens;
}

function estimateConversationTokens(messages: readonly Message[], prefixTokens: number): number {
  let latestReliableUsage: { index: number; tokens: number } | null = null;
  let latestPrefixTimestamp = Number.NEGATIVE_INFINITY;

  for (const [index, message] of messages.entries()) {
    if (
      message.role === "assistant" &&
      message.timestamp >= latestPrefixTimestamp &&
      message.stopReason !== "aborted" &&
      message.stopReason !== "error"
    ) {
      const tokens =
        message.usage.totalTokens ||
        message.usage.input +
          message.usage.output +
          message.usage.cacheRead +
          message.usage.cacheWrite;
      if (tokens > 0) latestReliableUsage = { index, tokens };
    }
    latestPrefixTimestamp = Math.max(latestPrefixTimestamp, message.timestamp);
  }

  if (latestReliableUsage === null) {
    return messages.reduce((total, message) => total + estimateMessageTokens(message), 0);
  }

  const trailingTokens = messages
    .slice(latestReliableUsage.index + 1)
    .reduce((total, message) => total + estimateMessageTokens(message), 0);
  return Math.max(0, latestReliableUsage.tokens - prefixTokens) + trailingTokens;
}

/**
 * 统计本次请求携带的完整 Session Context；messages 已包含按顺序累积的工具调用与结果。
 * 这里只记录数量，不重复持久化 System Prompt、消息正文或工具参数 Schema。
 */
export function estimateContextUsage(context: Context): ContextUsageEstimate {
  const systemPromptTokens = estimateTextTokens(context.systemPrompt ?? "");
  const toolTokens = context.tools?.length
    ? estimateTextTokens(
        safeStringify(
          context.tools.map((tool) => ({
            constrainedSampling: tool.constrainedSampling,
            description: tool.description,
            name: tool.name,
            parameters: tool.parameters,
          })),
        ),
      )
    : 0;
  const conversationTokens = estimateConversationTokens(
    context.messages,
    systemPromptTokens + toolTokens,
  );

  return {
    conversationTokens,
    estimatedTotalTokens: systemPromptTokens + toolTokens + conversationTokens,
    systemPromptTokens,
    toolTokens,
  };
}
