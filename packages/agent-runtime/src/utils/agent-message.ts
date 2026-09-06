import { isPlainObject } from "es-toolkit";

const PLAN_EXECUTION_ACKNOWLEDGEMENT_MAX_LENGTH = 240;
const PLAN_CONFIRMATION_PATTERN = /确认|收到|approved|confirmed|got it/i;
const FUTURE_EXECUTION_PATTERN =
  /(?:将|会|现在(?:开始)?|继续).{0,80}(?:实施|执行|推进|修改|开始)|(?:i(?:'ll| will)|will|continue|begin|start).{0,80}(?:implement|execute|work|proceed)/is;

export function isInternalAgentMessage(value: unknown): boolean {
  // 兼容重构前已经写入 Session JSONL 的 internalMessageKind。
  return (
    isPlainObject(value) &&
    value.role === "user" &&
    (value.isInternal === true || typeof value.internalMessageKind === "string")
  );
}

export function isPlanExecutionAcknowledgement(value: unknown): boolean {
  if (!isPlainObject(value) || value.role !== "assistant" || !Array.isArray(value.content)) {
    return false;
  }
  if (value.content.some((part) => isPlainObject(part) && part.type === "toolCall")) return false;

  const text = value.content
    .flatMap((part) =>
      isPlainObject(part) && part.type === "text" && typeof part.text === "string"
        ? [part.text]
        : [],
    )
    .join("\n")
    .trim();
  return (
    text.length > 0 &&
    text.length <= PLAN_EXECUTION_ACKNOWLEDGEMENT_MAX_LENGTH &&
    PLAN_CONFIRMATION_PATTERN.test(text) &&
    FUTURE_EXECUTION_PATTERN.test(text)
  );
}
