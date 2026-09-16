import { createHash } from "node:crypto";

/** 服务器名称唯一且重装后可复用；模型工具名不依赖每次创建的随机 ID。 */
export function createMcpToolAlias(serverName: string, toolName: string): string {
  const readable =
    toolName
      .toLowerCase()
      .replace(/[^a-z0-9_]/g, "_")
      .slice(0, 27) || "tool";
  const digest = createHash("sha256")
    .update(JSON.stringify([serverName, toolName]))
    .digest("hex")
    .slice(0, 32);
  return `mcp_${readable}_${digest}`;
}
