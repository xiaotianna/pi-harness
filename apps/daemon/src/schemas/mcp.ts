import {
  McpAuthMode,
  McpAuthRequirement,
  McpConnectionStatus,
  McpJsonTransport,
  McpTransport,
} from "@pi-harness/agent-runtime/mcp-contract";
import { type Static, Type } from "typebox";

export { McpAuthMode, McpAuthRequirement, McpConnectionStatus, McpJsonTransport, McpTransport };

export type McpServerId = string;

export const MCP_SERVER_NAME_MAX_LENGTH = 100;

export const McpServerIdSchema = Type.String({
  pattern: "^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$",
});

export const McpServerNameSchema = Type.String({
  minLength: 1,
  maxLength: MCP_SERVER_NAME_MAX_LENGTH,
  pattern: "^[^\\u0000-\\u001f\\u007f]+$",
});

const McpCompatibilitySchema = Type.Object(
  {
    roots: Type.Boolean(),
    sampling: Type.Boolean(),
    logging: Type.Boolean(),
  },
  { additionalProperties: false },
);

const commonFields = {
  requestTimeoutMs: Type.Integer({ minimum: 1_000, maximum: 600_000 }),
  compatibility: McpCompatibilitySchema,
};

const StdioConfigSchema = Type.Object(
  {
    ...commonFields,
    transport: Type.Literal(McpTransport.STDIO),
    command: Type.String({ minLength: 1, maxLength: 4_096, pattern: "^[^\\u0000\\r\\n]+$" }),
    args: Type.Array(Type.String({ maxLength: 8_192, pattern: "^[^\\u0000]*$" }), {
      maxItems: 128,
    }),
  },
  { additionalProperties: false },
);

const HttpConfigSchema = Type.Object(
  {
    ...commonFields,
    transport: Type.Union([
      Type.Literal(McpTransport.STREAMABLE_HTTP),
      Type.Literal(McpTransport.SSE),
    ]),
    url: Type.String({ minLength: 1, maxLength: 2_048 }),
    authMode: Type.Union([
      Type.Literal(McpAuthMode.NONE),
      Type.Literal(McpAuthMode.STATIC),
      Type.Literal(McpAuthMode.OAUTH),
    ]),
    // MCP transport 的额外 origin 必须显式列出；OAuth discovery 使用独立受限 fetch。
    allowedOrigins: Type.Array(Type.String({ minLength: 1, maxLength: 2_048 }), {
      maxItems: 16,
      uniqueItems: true,
    }),
    allowPrivateNetwork: Type.Boolean(),
  },
  { additionalProperties: false },
);

export const McpServerConfigSchema = Type.Union([StdioConfigSchema, HttpConfigSchema]);
export type McpServerConfig = Static<typeof McpServerConfigSchema>;

export const McpServerRecordSchema = Type.Object(
  {
    id: McpServerIdSchema,
    name: McpServerNameSchema,
    config: McpServerConfigSchema,
    enabled: Type.Boolean(),
    revision: Type.Integer({ minimum: 1, maximum: Number.MAX_SAFE_INTEGER }),
    createdAt: Type.Integer({ minimum: 0, maximum: Number.MAX_SAFE_INTEGER }),
    updatedAt: Type.Integer({ minimum: 0, maximum: Number.MAX_SAFE_INTEGER }),
  },
  { additionalProperties: false },
);

export type McpServerRecord = Static<typeof McpServerRecordSchema>;
