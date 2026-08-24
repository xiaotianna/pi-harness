import { isPlainObject } from "es-toolkit";

export function isInternalAgentMessage(value: unknown): boolean {
  // 兼容重构前已经写入 Session JSONL 的 internalMessageKind。
  return (
    isPlainObject(value) &&
    value.role === "user" &&
    (value.isInternal === true || typeof value.internalMessageKind === "string")
  );
}
