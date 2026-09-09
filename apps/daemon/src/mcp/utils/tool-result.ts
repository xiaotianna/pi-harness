import type { CallToolResult } from "@modelcontextprotocol/client";
import type { McpCredential } from "../credential.js";
import { redactMcpText } from "./credential-redaction.js";

/** Only return bounded text; never leak transport metadata or embed remote binary data in JSONL. */
export function readMcpToolResult(result: CallToolResult, credential?: McpCredential): string {
  const parts: string[] = [];
  for (const block of result.content ?? []) {
    switch (block.type) {
      case "text":
        parts.push(block.text);
        break;
      case "resource":
        parts.push(
          "text" in block.resource ? block.resource.text : "[MCP 返回二进制资源，当前未展开]",
        );
        break;
      case "resource_link":
        parts.push(`资源引用：${block.name} (${block.uri})`);
        break;
      default:
        parts.push(`[MCP 返回 ${block.type} 内容，当前未展开]`);
    }
  }
  if (result.structuredContent !== undefined) parts.push(JSON.stringify(result.structuredContent));
  const text = redactMcpText(parts.join("\n"), credential);
  const limit = 64_000;
  return text.length > limit ? `${text.slice(0, limit)}\n[MCP 输出已截断]` : text;
}
