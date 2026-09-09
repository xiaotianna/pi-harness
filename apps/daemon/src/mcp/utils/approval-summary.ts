import type { McpCredential } from "../credential.js";
import { redactMcpText } from "./credential-redaction.js";

export function createMcpApprovalSummary(
  toolName: string,
  args: unknown,
  credential?: McpCredential,
): string {
  const parameters = redactMcpText(JSON.stringify(args, null, 2), credential);
  const limit = 4_096;
  return `调用外部 MCP 工具 ${toolName}\n${parameters.slice(0, limit)}${parameters.length > limit ? "\n[参数摘要已截断，完整参数见会话中的工具详情]" : ""}`;
}
