import {
  McpAuthMode,
  McpJsonTransport,
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
  {
    id: McpTransport.STREAMABLE_HTTP,
    label: "Streamable HTTP",
    description: "推荐的远程连接方式，使用单一 MCP endpoint。",
  },
  {
    id: McpTransport.STDIO,
    label: "stdio",
    description: "在本机启动 MCP 服务器命令。",
  },
  {
    id: McpTransport.SSE,
    label: "SSE",
    description: "兼容仅支持 HTTP+SSE transport 的服务器。",
  },
];
export const MCP_AUTH_OPTIONS = [
  { id: McpAuthMode.NONE, label: "自动检测" },
  { id: McpAuthMode.STATIC, label: "Token / API Key" },
  { id: McpAuthMode.OAUTH, label: "OAuth" },
];
export interface McpFormDraft {
  name: string;
  transport: McpConfig["transport"];
  endpoint: string;
  args: string;
  environment: string;
  timeout: string;
  authMode: typeof McpAuthMode.NONE | typeof McpAuthMode.STATIC | typeof McpAuthMode.OAUTH;
  allowPrivateNetwork: boolean;
}
export const MCP_JSON_PLACEHOLDER = `{
  "mcpServers": {
    "everything": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-everything"],
      "env": { "DEBUG": "1" }
    }
  }
}`;
const writeLines = (values: readonly string[]) => values.join("\n");
const writeEnvironment = (environment: Readonly<Record<string, string>>) =>
  Object.entries(environment)
    .map(([name, value]) => `${name}=${value}`)
    .join("\n");
function readArgs(text: string): string[] {
  const args = text.split(/\r?\n/u).filter((line) => line.length > 0);
  if (args.length > 128 || args.some((arg) => arg.length > 8192 || arg.includes("\0"))) {
    throw new Error("命令参数最多 128 行，每行最多 8192 个字符");
  }
  return args;
}
function readEnvironment(text: string): Record<string, string> {
  const environment: Record<string, string> = {};
  const lines = text.split(/\r?\n/u).filter((line) => line.trim().length > 0);
  if (lines.length > 64) throw new Error("环境变量最多 64 行");
  for (const line of lines) {
    const separator = line.indexOf("=");
    const name = line.slice(0, separator).trim();
    const value = line.slice(separator + 1);
    if (separator < 1 || !/^[A-Za-z_][A-Za-z0-9_]{0,127}$/u.test(name)) {
      throw new Error(`环境变量“${line}”应使用 KEY=VALUE 格式`);
    }
    if (name in environment) throw new Error(`环境变量“${name}”重复`);
    if (value.length > 16384 || value.includes("\0")) {
      throw new Error(`环境变量“${name}”的值无效`);
    }
    environment[name] = value;
  }
  return environment;
}
export function createMcpFormDraft(
  server?: Pick<McpServerInput, "name" | "config" | "environment">,
): McpFormDraft {
  const config = server?.config;
  return {
    name: server?.name ?? "",
    transport: config?.transport ?? McpTransport.STREAMABLE_HTTP,
    endpoint: config ? (config.transport === McpTransport.STDIO ? config.command : config.url) : "",
    args: config?.transport === McpTransport.STDIO ? writeLines(config.args) : "",
    environment: writeEnvironment(server?.environment ?? {}),
    timeout: String((config?.requestTimeoutMs ?? 30000) / 1000),
    authMode:
      config && config.transport !== McpTransport.STDIO ? config.authMode : McpAuthMode.NONE,
    allowPrivateNetwork:
      config?.transport !== McpTransport.STDIO && (config?.allowPrivateNetwork ?? false),
  };
}
export function readMcpForm(draft: McpFormDraft, current?: McpServer): McpServerInput {
  const name = draft.name.trim();
  if (!name || name.length > 100) throw new Error("请输入 1–100 个字符的服务器 ID");
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
    const args = readArgs(draft.args);
    const environment = readEnvironment(draft.environment);
    return {
      name,
      config: {
        ...common,
        transport: draft.transport,
        command: endpoint,
        args,
      },
      ...(Object.keys(environment).length > 0 ? { environment } : {}),
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
      authMode: draft.authMode,
      allowedOrigins: old && old.transport !== McpTransport.STDIO ? old.allowedOrigins : [],
      allowPrivateNetwork: draft.allowPrivateNetwork,
    },
  };
}
export function readMcpJson(
  text: string,
  common: McpFormDraft,
  current?: McpServer,
): McpServerInput[] {
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
    if (isPlainObject(server) && "headers" in server) {
      throw new Error(`服务器“${name}”的凭据请保存配置后通过独立凭据入口设置`);
    }
  }
  if (!Value.Check(McpJsonSchema, value)) {
    throw new Error('mcpServers 配置无效；type 请使用 "http"、"stdio" 或 "sse"');
  }
  const servers = Object.entries(value.mcpServers);
  const existing = current && servers.length === 1 ? current : undefined;
  return servers.map(([name, server]) =>
    readMcpForm(
      {
        ...common,
        name,
        transport:
          "command" in server
            ? McpTransport.STDIO
            : server.type === McpJsonTransport.SSE
              ? McpTransport.SSE
              : McpTransport.STREAMABLE_HTTP,
        endpoint: "command" in server ? server.command : server.url,
        args: "command" in server ? writeLines(server.args ?? []) : "",
        environment: "command" in server ? writeEnvironment(server.env ?? {}) : "",
      },
      existing,
    ),
  );
}
export function writeMcpJson(draft: McpFormDraft): string {
  const args = readArgs(draft.args);
  const environment = readEnvironment(draft.environment);
  return JSON.stringify(
    {
      mcpServers: {
        [draft.name.trim() || "server"]:
          draft.transport === McpTransport.STDIO
            ? {
                type: McpJsonTransport.STDIO,
                command: draft.endpoint.trim(),
                args,
                ...(Object.keys(environment).length > 0 ? { env: environment } : {}),
              }
            : {
                type:
                  draft.transport === McpTransport.SSE
                    ? McpJsonTransport.SSE
                    : McpJsonTransport.HTTP,
                url: draft.endpoint.trim(),
              },
      },
    } satisfies McpJson,
    null,
    2,
  );
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
