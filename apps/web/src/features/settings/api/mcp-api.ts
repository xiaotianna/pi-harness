import {
  McpAuthMode,
  McpIsolationMode,
  McpTransport,
} from "@pi-harness/agent-runtime/mcp-contract";
import { type Static, Type } from "typebox";
import { Value } from "typebox/value";
import { apiRequest } from "../../../api/request";

const common = {
  requestTimeoutMs: Type.Integer({ minimum: 1000, maximum: 600000 }),
  compatibility: Type.Object({
    roots: Type.Boolean(),
    sampling: Type.Boolean(),
    logging: Type.Boolean(),
  }),
};
export const McpConfigSchema = Type.Union([
  Type.Object({
    ...common,
    transport: Type.Literal(McpTransport.STDIO),
    command: Type.String({ minLength: 1 }),
    args: Type.Array(Type.String()),
    isolation: Type.Union([
      Type.Literal(McpIsolationMode.ISOLATED),
      Type.Literal(McpIsolationMode.TRUSTED),
    ]),
  }),
  Type.Object({
    ...common,
    transport: Type.Union([
      Type.Literal(McpTransport.STREAMABLE_HTTP),
      Type.Literal(McpTransport.SSE),
    ]),
    url: Type.String({ minLength: 1 }),
    authMode: Type.Union([
      Type.Literal(McpAuthMode.NONE),
      Type.Literal(McpAuthMode.STATIC),
      Type.Literal(McpAuthMode.OAUTH),
    ]),
    allowedOrigins: Type.Array(Type.String()),
    allowPrivateNetwork: Type.Boolean(),
  }),
]);
const McpJsonServerSchema = Type.Union([
  Type.Object(
    {
      type: Type.Optional(Type.Literal(McpTransport.STDIO)),
      command: Type.String({ minLength: 1, maxLength: 4096 }),
      args: Type.Optional(Type.Array(Type.String({ maxLength: 8192 }), { maxItems: 128 })),
    },
    { additionalProperties: false },
  ),
  Type.Object(
    {
      type: Type.Union([
        Type.Literal(McpTransport.STREAMABLE_HTTP),
        Type.Literal(McpTransport.SSE),
      ]),
      url: Type.String({ minLength: 1, maxLength: 2048 }),
    },
    { additionalProperties: false },
  ),
]);
export const McpJsonSchema = Type.Object(
  {
    mcpServers: Type.Record(
      Type.String({
        minLength: 1,
        maxLength: 100,
        pattern: "^[^\\u0000-\\u001f\\u007f]+$",
      }),
      McpJsonServerSchema,
      { minProperties: 1, maxProperties: 32 },
    ),
  },
  { additionalProperties: false },
);
const McpServerSchema = Type.Object({
  id: Type.String(),
  name: Type.String(),
  config: McpConfigSchema,
  enabled: Type.Boolean(),
  revision: Type.Integer({ minimum: 1 }),
  hasCredential: Type.Boolean(),
  isTrusted: Type.Boolean(),
});
const McpServersSchema = Type.Array(McpServerSchema);
const CatalogItemSchema = Type.Object({ name: Type.String(), description: Type.String() });
const McpTestSchema = Type.Object({
  serverId: Type.String(),
  configRevision: Type.Integer(),
  serverName: Type.String(),
  serverVersion: Type.String(),
  durationMs: Type.Integer(),
  discoveredAt: Type.Integer(),
  tools: Type.Array(CatalogItemSchema),
  prompts: Type.Array(CatalogItemSchema),
  resourceCount: Type.Integer(),
  resourceTemplateCount: Type.Integer(),
});
export type McpConfig = Static<typeof McpConfigSchema>;
export type McpJson = Static<typeof McpJsonSchema>;
export type McpServer = Static<typeof McpServerSchema>;
export type McpTestResult = Static<typeof McpTestSchema>;
export interface McpServerInput {
  name: string;
  config: McpConfig;
}
export interface McpStaticCredential {
  mode: typeof McpAuthMode.STATIC;
  headers: Record<string, string>;
  environment: Record<string, string>;
}
const MCP_REQUEST_TIMEOUT_MS = 35_000;
function requestMcp(path: string, init?: RequestInit): Promise<Response> {
  return apiRequest(path, {
    ...init,
    signal: AbortSignal.any([
      AbortSignal.timeout(MCP_REQUEST_TIMEOUT_MS),
      ...(init?.signal ? [init.signal] : []),
    ]),
  });
}
const basePath = "/api/mcp-servers";
const serverPath = (id: string) => `${basePath}/${encodeURIComponent(id)}`;

export async function listMcpServers(signal: AbortSignal): Promise<McpServer[]> {
  const body: unknown = await (await requestMcp(basePath, { signal })).json();
  if (!Value.Check(McpServersSchema, body)) throw new Error("MCP 服务器列表格式无效");
  return body;
}
export async function saveMcpServer(
  input: McpServerInput,
  current?: McpServer,
): Promise<McpServer> {
  const body: unknown = await (
    await requestMcp(current ? serverPath(current.id) : basePath, {
      method: current ? "PUT" : "POST",
      body: JSON.stringify(
        current
          ? { ...input, expectedRevision: current.revision, enabled: current.enabled }
          : input,
      ),
    })
  ).json();
  if (!Value.Check(McpServerSchema, body)) throw new Error("MCP 服务器响应格式无效");
  return body;
}
export async function importMcpServers(config: McpJson): Promise<McpServer[]> {
  const body: unknown = await (
    await requestMcp(`${basePath}/import`, {
      method: "POST",
      body: JSON.stringify(config),
    })
  ).json();
  if (!Value.Check(McpServersSchema, body)) throw new Error("MCP 导入响应格式无效");
  return body;
}
export async function setMcpEnabled(server: McpServer, enabled: boolean): Promise<McpServer> {
  return saveMcpServer({ name: server.name, config: server.config }, { ...server, enabled });
}
export async function trustMcpServer(server: McpServer): Promise<void> {
  await requestMcp(`${serverPath(server.id)}/trust`, {
    method: "POST",
    body: JSON.stringify({ expectedRevision: server.revision }),
  });
}
export async function revokeMcpTrust(server: McpServer): Promise<void> {
  await requestMcp(`${serverPath(server.id)}/trust`, { method: "DELETE" });
}
export async function deleteMcpServer(server: McpServer): Promise<void> {
  await requestMcp(serverPath(server.id), {
    method: "DELETE",
    body: JSON.stringify({ expectedRevision: server.revision }),
  });
}
export async function putMcpCredential(
  server: McpServer,
  material: McpStaticCredential,
): Promise<void> {
  await requestMcp(`${serverPath(server.id)}/credentials`, {
    method: "PUT",
    body: JSON.stringify({ expectedRevision: server.revision, material }),
  });
}
export async function deleteMcpCredential(server: McpServer): Promise<void> {
  await requestMcp(`${serverPath(server.id)}/credentials`, {
    method: "DELETE",
    body: JSON.stringify({ expectedRevision: server.revision }),
  });
}
export async function testMcpServer(
  server: McpServer,
  signal: AbortSignal,
): Promise<McpTestResult> {
  const body: unknown = await (
    await requestMcp(`${serverPath(server.id)}/tests`, {
      method: "POST",
      body: JSON.stringify({ expectedRevision: server.revision }),
      signal,
    })
  ).json();
  if (!Value.Check(McpTestSchema, body)) throw new Error("MCP 连接测试响应格式无效");
  return body;
}
