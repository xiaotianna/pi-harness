import type { CallToolResult } from "@modelcontextprotocol/client";
import type { McpCredential } from "../credential.js";
import { redactMcpText } from "./credential-redaction.js";

type McpAgentContent =
  | { data: string; mimeType: string; type: "image" }
  | { text: string; type: "text" };

const MAX_TEXT_LENGTH = 64_000;
const MAX_IMAGE_DATA_LENGTH = 20_000_000;

/** Keep MCP output bounded while preserving image blocks required by visual tools. */
export function readMcpToolContent(
  result: CallToolResult,
  credential?: McpCredential,
): McpAgentContent[] {
  const content: McpAgentContent[] = [];
  let remainingTextLength = MAX_TEXT_LENGTH;
  const appendText = (value: string) => {
    if (remainingTextLength <= 0) return;
    const text = redactMcpText(value, credential);
    if (text.length <= remainingTextLength) {
      content.push({ text, type: "text" });
      remainingTextLength -= text.length;
      return;
    }
    content.push({ text: `${text.slice(0, remainingTextLength)}\n[MCP 输出已截断]`, type: "text" });
    remainingTextLength = 0;
  };

  for (const block of result.content ?? []) {
    switch (block.type) {
      case "text":
        appendText(block.text);
        break;
      case "image":
        if (block.data.length <= MAX_IMAGE_DATA_LENGTH) {
          content.push({ data: block.data, mimeType: block.mimeType, type: "image" });
        } else {
          appendText("[MCP 返回的图片超过大小限制]");
        }
        break;
      case "resource":
        appendText(
          "text" in block.resource ? block.resource.text : "[MCP 返回二进制资源，当前未展开]",
        );
        break;
      case "resource_link":
        appendText(`资源引用：${block.name} (${block.uri})`);
        break;
      default:
        appendText(`[MCP 返回 ${block.type} 内容，当前未展开]`);
    }
  }
  if (result.structuredContent !== undefined) appendText(JSON.stringify(result.structuredContent));
  return content.length > 0 ? content : [{ text: "MCP 工具已完成，未返回内容", type: "text" }];
}
