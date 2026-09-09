import { createHash } from "node:crypto";
import { isPlainObject } from "es-toolkit";

/** 参数指纹保持数组顺序，对所有层级的对象键排序；拒绝非 JSON 值和异常复杂度。 */
export function createToolFingerprint(value: unknown): string {
  let nodes = 0;
  const active = new Set<object>();
  const normalize = (item: unknown, depth: number): unknown => {
    nodes += 1;
    if (depth > 64 || nodes > 100_000)
      throw new Error("TOOL_ARGUMENTS_TOO_COMPLEX: 工具参数超过复杂度上限");
    if (item === null || typeof item === "string" || typeof item === "boolean") return item;
    if (typeof item === "number" && Number.isFinite(item)) return item;
    if (!Array.isArray(item) && !isPlainObject(item))
      throw new Error("TOOL_ARGUMENTS_INVALID: 工具参数必须是 JSON 值");
    if (active.has(item)) throw new Error("TOOL_ARGUMENTS_INVALID: 工具参数包含循环引用");
    active.add(item);
    const result = Array.isArray(item)
      ? item.map((child) => normalize(child, depth + 1))
      : Object.fromEntries(
          Object.entries(item)
            .sort(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0))
            .map(([key, child]) => [key, normalize(child, depth + 1)]),
        );
    active.delete(item);
    return result;
  };
  const json = JSON.stringify(normalize(value, 0));
  if (Buffer.byteLength(json) > 4 * 1024 * 1024)
    throw new Error("TOOL_ARGUMENTS_TOO_LARGE: 工具参数超过大小上限");
  return createHash("sha256").update(json).digest("hex");
}
