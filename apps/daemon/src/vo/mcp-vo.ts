import { type Static, Type } from "typebox";
import { McpServerRecordSchema } from "../schemas/mcp.js";

export const McpServerVoSchema = Type.Object(
  {
    ...McpServerRecordSchema.properties,
    hasCredential: Type.Boolean(),
    isTrusted: Type.Boolean(),
  },
  { additionalProperties: false },
);
export type McpServerVo = Static<typeof McpServerVoSchema>;
export const McpServerListVoSchema = Type.Array(McpServerVoSchema);

const McpCatalogItemVoSchema = Type.Object(
  {
    name: Type.String({ maxLength: 512 }),
    description: Type.String({ maxLength: 4_096 }),
  },
  { additionalProperties: false },
);

export const McpDiagnosticsVoSchema = Type.Object(
  {
    serverId: McpServerRecordSchema.properties.id,
    configRevision: McpServerRecordSchema.properties.revision,
    protocolEra: Type.Union([Type.Literal("modern"), Type.Literal("legacy")]),
    serverName: Type.String({ maxLength: 512 }),
    serverVersion: Type.String({ maxLength: 128 }),
    durationMs: Type.Integer({ minimum: 0 }),
    discoveredAt: Type.Integer({ minimum: 0 }),
    tools: Type.Array(McpCatalogItemVoSchema, { maxItems: 512 }),
    prompts: Type.Array(McpCatalogItemVoSchema, { maxItems: 512 }),
    resourceCount: Type.Integer({ minimum: 0, maximum: 512 }),
    resourceTemplateCount: Type.Integer({ minimum: 0, maximum: 512 }),
  },
  { additionalProperties: false },
);
export type McpDiagnosticsVo = Static<typeof McpDiagnosticsVoSchema>;
