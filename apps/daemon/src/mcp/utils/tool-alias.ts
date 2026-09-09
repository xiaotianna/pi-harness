import { createHash } from "node:crypto";

/** 模型工具名称最多 64 字符；hash 使用完整服务 ID/上游名称，截断只影响可读前缀。 */
export function createMcpToolAlias(serverId: string, toolName: string): string {
  const readable =
    toolName
      .toLowerCase()
      .replace(/[^a-z0-9_]/g, "_")
      .slice(0, 27) || "tool";
  const digest = createHash("sha256")
    .update(JSON.stringify([serverId, toolName]))
    .digest("hex")
    .slice(0, 32);
  return `mcp_${readable}_${digest}`;
}
