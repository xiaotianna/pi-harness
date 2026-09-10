import {
  McpAuthMode,
  McpAuthRequirement,
  McpTransport,
} from "@pi-harness/agent-runtime/mcp-contract";
import type { McpServer } from "../api/mcp-api";

export function needsMcpCredential(server: McpServer): boolean {
  return (
    server.config.transport !== McpTransport.STDIO &&
    !server.hasCredential &&
    (server.authRequirement === McpAuthRequirement.STATIC ||
      server.authRequirement === McpAuthRequirement.OAUTH)
  );
}

export function mcpAuthLabel(server: McpServer): string {
  if (server.config.transport === McpTransport.STDIO) {
    return server.hasCredential ? "已配置环境变量凭据" : "未配置环境变量凭据";
  }
  if (server.credentialMode === McpAuthMode.OAUTH) return "OAuth 已授权";
  if (server.credentialMode === McpAuthMode.STATIC) return "Token / API Key 已配置";
  if (server.authRequirement === McpAuthRequirement.OAUTH) return "需要 OAuth 授权";
  if (server.authRequirement === McpAuthRequirement.STATIC) return "需要 Token / API Key";
  if (server.authRequirement === McpAuthRequirement.NONE) return "无需鉴权";
  return "首次连接时自动检测";
}
