import {
  McpAuthMode,
  McpIsolationMode,
  McpTransport,
} from "@pi-harness/agent-runtime/mcp-contract";
import { isPlainObject } from "es-toolkit";
import { Value } from "typebox/value";
import {
  type McpConfig,
  type McpJson,
  McpJsonSchema,
  type McpServer,
  type McpServerInput,
  type McpStaticCredential,
} from "../api/mcp-api";

export const MCP_TRANSPORT_OPTIONS = [
  { id: McpTransport.STREAMABLE_HTTP, label: "Streamable HTTP" },
  { id: McpTransport.STDIO, label: "本地命令（stdio）" },
  { id: McpTransport.SSE, label: "旧版 SSE" },
];
export interface McpFormDraft {
  name: string;
  transport: McpConfig["transport"];
  endpoint: string;
  args: string;
  timeout: string;
  hasStaticAuth: boolean;
  allowPrivateNetwork: boolean;
}
export const MCP_JSON_PLACEHOLDER = `{
  "mcpServers": {
    "time": {
      "type": "streamable_http",
      "url": "https://example.com/mcp"
    }
  }
}`;
export function createMcpFormDraft(server?: McpServer): McpFormDraft {
  const config = server?.config;
  return {
    name: server?.name ?? "",
    transport: config?.transport ?? McpTransport.STREAMABLE_HTTP,
    endpoint: config ? (config.transport === McpTransport.STDIO ? config.command : config.url) : "",
    args: config?.transport === McpTransport.STDIO ? JSON.stringify(config.args, null, 2) : "[]",
    timeout: String((config?.requestTimeoutMs ?? 30000) / 1000),
    hasStaticAuth:
      config?.transport !== McpTransport.STDIO && config?.authMode === McpAuthMode.STATIC,
    allowPrivateNetwork:
      config?.transport !== McpTransport.STDIO && (config?.allowPrivateNetwork ?? false),
  };
}
export function readMcpForm(draft: McpFormDraft, current?: McpServer): McpServerInput {
  const name = draft.name.trim();
  if (!name || name.length > 100) throw new Error("请输入 1–100 个字符的服务器名称");
  const requestTimeoutMs = Number(draft.timeout) * 1000;
  if (!Number.isInteger(requestTimeoutMs) || requestTimeoutMs < 1000 || requestTimeoutMs > 600000)
    throw new Error("超时应为 1–600 秒");
  const common = {
    requestTimeoutMs,
    compatibility: current?.config.compatibility ?? {
      roots: false,
      sampling: false,
      logging: false,
    },
  };
  const endpoint = draft.endpoint.trim();
  if (!endpoint) throw new Error("请填写服务器地址或命令");
  if (draft.transport === McpTransport.STDIO) {
    let args: unknown;
    try {
      args = JSON.parse(draft.args);
    } catch {
      throw new Error('命令参数必须是 JSON 数组，例如 ["--port", "3000"]');
    }
    if (
      !Array.isArray(args) ||
      args.length > 128 ||
      !args.every(
        (arg): arg is string =>
          typeof arg === "string" && arg.length <= 8192 && !arg.includes("\0"),
      )
    )
      throw new Error("命令参数必须是字符串数组，最多 128 项");
    return {
      name,
      config: {
        ...common,
        transport: draft.transport,
        command: endpoint,
        args,
        isolation:
          current?.config.transport === McpTransport.STDIO
            ? current.config.isolation
            : McpIsolationMode.TRUSTED,
      },
    };
  }
  let url: URL;
  try {
    url = new URL(endpoint);
  } catch {
    throw new Error("请输入完整的 HTTP(S) 地址");
  }
  if (
    !["https:", "http:"].includes(url.protocol) ||
    url.username ||
    url.password ||
    url.hash ||
    url.search
  )
    throw new Error("地址必须使用 HTTP(S)，且不能含账号、密码、查询参数或片段");
  const old = current?.config;
  return {
    name,
    config: {
      ...common,
      transport: draft.transport,
      url: url.href,
      authMode:
        old && old.transport !== McpTransport.STDIO && old.authMode === McpAuthMode.OAUTH
          ? McpAuthMode.OAUTH
          : draft.hasStaticAuth
            ? McpAuthMode.STATIC
            : McpAuthMode.NONE,
      allowedOrigins: old && old.transport !== McpTransport.STDIO ? old.allowedOrigins : [],
      allowPrivateNetwork: draft.allowPrivateNetwork,
    },
  };
}
export function readMcpJson(text: string): McpJson {
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    throw new Error("请输入有效的 JSON 配置");
  }
  if (!isPlainObject(value) || !isPlainObject(value.mcpServers)) {
    throw new Error("JSON 顶层必须包含 mcpServers 对象");
  }
  for (const [name, server] of Object.entries(value.mcpServers)) {
    if (isPlainObject(server) && ("headers" in server || "env" in server)) {
      throw new Error(`服务器“${name}”的凭据请保存配置后通过独立凭据入口设置`);
    }
  }
  if (!Value.Check(McpJsonSchema, value)) {
    throw new Error("mcpServers 配置无效；请检查名称、type、url，或 stdio 的 command 与 args");
  }
  return value;
}
export function readMcpCredential(text: string, server: McpServer): McpStaticCredential {
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    throw new Error("凭据必须是 JSON 对象");
  }
  if (!isPlainObject(value) || Object.values(value).some((item) => typeof item !== "string"))
    throw new Error("每个凭据值必须是字符串");
  const record = value as Record<string, string>;
  return {
    mode: McpAuthMode.STATIC,
    headers: server.config.transport === McpTransport.STDIO ? {} : record,
    environment: server.config.transport === McpTransport.STDIO ? record : {},
  };
}
