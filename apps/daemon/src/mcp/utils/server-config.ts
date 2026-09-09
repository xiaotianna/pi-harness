import { Value } from "typebox/value";
import {
  type McpServerConfig,
  McpServerConfigSchema,
  McpServerNameSchema,
  McpTransport,
} from "../../schemas/mcp.js";
import { McpError, McpErrorCode } from "../errors.js";

function normalizeEndpoint(value: string): URL {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new McpError(McpErrorCode.INVALID_CONFIG, "MCP 服务地址无效");
  }
  if (
    !["http:", "https:"].includes(url.protocol) ||
    url.username ||
    url.password ||
    url.hash ||
    url.search
  ) {
    throw new McpError(
      McpErrorCode.INVALID_CONFIG,
      "MCP 地址必须是 HTTP(S)，不能包含凭据、查询参数或片段；认证材料请通过凭据接口保存",
    );
  }
  return url;
}

export function normalizeMcpConfig(input: unknown): McpServerConfig {
  if (!Value.Check(McpServerConfigSchema, input)) {
    throw new McpError(McpErrorCode.INVALID_CONFIG, "MCP 配置结构无效");
  }
  const config = structuredClone(input);
  if (config.transport === McpTransport.STDIO) {
    if (!config.command.trim()) {
      throw new McpError(McpErrorCode.INVALID_CONFIG, "MCP 启动命令不能为空");
    }
    return config;
  }
  const endpoint = normalizeEndpoint(config.url);
  const allowedOrigins = config.allowedOrigins.map((value) => {
    const origin = normalizeEndpoint(value);
    if (origin.pathname !== "/") {
      throw new McpError(McpErrorCode.INVALID_CONFIG, "MCP 额外允许地址必须是 origin");
    }
    return origin.origin;
  });
  const origins = new Set(allowedOrigins);
  origins.delete(endpoint.origin);
  return { ...config, url: endpoint.href, allowedOrigins: [...origins].sort() };
}

export function normalizeMcpName(value: string): string {
  const name = value.trim();
  if (!Value.Check(McpServerNameSchema, name)) {
    throw new McpError(McpErrorCode.INVALID_CONFIG, "MCP 名称须为 1–100 个字符且不含控制字符");
  }
  return name;
}
