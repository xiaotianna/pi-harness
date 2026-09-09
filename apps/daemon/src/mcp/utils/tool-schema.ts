import type { JsonSchemaType, JsonSchemaValidator } from "@modelcontextprotocol/client";
import { AjvJsonSchemaValidator } from "@modelcontextprotocol/client/validators/ajv";
import { isPlainObject } from "es-toolkit";
import type { TSchema } from "typebox";
import { Compile } from "typebox/compile";
import { McpError, McpErrorCode } from "../errors.js";

const MAX_SCHEMA_BYTES = 128 * 1024;
const MAX_SCHEMA_NODES = 2_048;
const MAX_SCHEMA_DEPTH = 24;

export interface McpToolSchema {
  original: JsonSchemaType;
  model: TSchema;
  validate: JsonSchemaValidator<Record<string, unknown>>;
}

/** 当前同步校验器只接受可证明为线性匹配的常用 pattern，其余明确拒绝，不能移除约束后继续调用。 */
function isBoundedPattern(pattern: string): boolean {
  if (pattern.length > 128) return false;
  if (/^[a-zA-Z0-9 _:/.-]+$/.test(pattern)) return true;
  return /^\^\[\^?[a-zA-Z0-9 _:/.,@+\\-]+\](?:[+*?]|\{\d{1,4}(?:,\d{0,4})?\})?\$$/.test(pattern);
}

export function normalizeMcpToolSchema(input: unknown): JsonSchemaType {
  if (!isPlainObject(input))
    throw new McpError(McpErrorCode.INVALID_CONFIG, "MCP 工具 schema 必须是对象");
  let visited = 0;
  const inspect = (node: unknown, depth: number): void => {
    visited += 1;
    if (depth > MAX_SCHEMA_DEPTH || visited > MAX_SCHEMA_NODES)
      throw new McpError(McpErrorCode.LIMIT_EXCEEDED, "MCP 工具 schema 复杂度超过限制");
    if (Array.isArray(node)) {
      for (const value of node) inspect(value, depth + 1);
      return;
    }
    if (!isPlainObject(node)) return;
    if (typeof node.pattern === "string" && !isBoundedPattern(node.pattern))
      throw new McpError(
        McpErrorCode.CAPABILITY_UNAVAILABLE,
        "MCP schema 的正则表达式超出安全同步校验范围",
      );
    if (
      isPlainObject(node.patternProperties) &&
      Object.keys(node.patternProperties).some((pattern) => !isBoundedPattern(pattern))
    )
      throw new McpError(
        McpErrorCode.CAPABILITY_UNAVAILABLE,
        "MCP schema 的属性匹配表达式超出安全范围",
      );
    if ("$dynamicRef" in node || "$recursiveRef" in node)
      throw new McpError(
        McpErrorCode.CAPABILITY_UNAVAILABLE,
        "MCP 动态递归 schema 暂不兼容模型工具定义",
      );
    if ("$ref" in node && (typeof node.$ref !== "string" || !node.$ref.startsWith("#/")))
      throw new McpError(
        McpErrorCode.CAPABILITY_UNAVAILABLE,
        "MCP 工具 schema 只能引用当前文档内的定义",
      );
    for (const value of Object.values(node)) inspect(value, depth + 1);
  };
  inspect(input, 0);
  if (Buffer.byteLength(JSON.stringify(input)) > MAX_SCHEMA_BYTES)
    throw new McpError(McpErrorCode.LIMIT_EXCEEDED, "MCP 工具 schema 超过 128 KiB");
  return structuredClone(input) as JsonSchemaType;
}

export function compileMcpToolSchema(input: unknown): McpToolSchema {
  const original = normalizeMcpToolSchema(input);
  if (original.type !== "object")
    throw new McpError(McpErrorCode.INVALID_CONFIG, "MCP 工具参数必须是 object schema");
  // TypeBox/Pi 与官方 AJV 都必须接受同一组约束；不使用 Type.Any 降级参数校验。
  try {
    const model = structuredClone(original) as TSchema;
    const validate = new AjvJsonSchemaValidator().getValidator<Record<string, unknown>>(original);
    Compile(model);
    return { original, model, validate };
  } catch {
    throw new McpError(
      McpErrorCode.CAPABILITY_UNAVAILABLE,
      "MCP schema 不兼容当前模型工具校验器，请调整定义后重试",
    );
  }
}
