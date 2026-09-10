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
    title: Type.Optional(Type.String({ maxLength: 512 })),
    description: Type.String({ maxLength: 4_096 }),
    raw: Type.Unknown(),
  },
  { additionalProperties: false },
);

const McpToolVoSchema = Type.Object(
  {
    ...McpCatalogItemVoSchema.properties,
    inputSchema: Type.Unknown(),
    outputSchema: Type.Optional(Type.Unknown()),
  },
  { additionalProperties: false },
);

const McpResourceVoSchema = Type.Object(
  {
    ...McpCatalogItemVoSchema.properties,
    uri: Type.String({ maxLength: 8_192 }),
    mimeType: Type.Optional(Type.String({ maxLength: 512 })),
    size: Type.Optional(Type.Integer({ minimum: 0 })),
  },
  { additionalProperties: false },
);

const McpResourceTemplateVoSchema = Type.Object(
  {
    ...McpCatalogItemVoSchema.properties,
    uriTemplate: Type.String({ maxLength: 8_192 }),
    mimeType: Type.Optional(Type.String({ maxLength: 512 })),
  },
  { additionalProperties: false },
);

const McpPromptArgumentVoSchema = Type.Object(
  {
    name: Type.String({ maxLength: 512 }),
    description: Type.String({ maxLength: 4_096 }),
    required: Type.Boolean(),
  },
  { additionalProperties: false },
);

const McpPromptVoSchema = Type.Object(
  {
    ...McpCatalogItemVoSchema.properties,
    arguments: Type.Array(McpPromptArgumentVoSchema, { maxItems: 512 }),
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
    serverInfo: Type.Unknown(),
    instructions: Type.Optional(Type.String({ maxLength: 65_536 })),
    capabilities: Type.Unknown(),
    durationMs: Type.Integer({ minimum: 0 }),
    discoveredAt: Type.Integer({ minimum: 0 }),
    tools: Type.Array(McpToolVoSchema, { maxItems: 512 }),
    resources: Type.Array(McpResourceVoSchema, { maxItems: 512 }),
    resourceTemplates: Type.Array(McpResourceTemplateVoSchema, { maxItems: 512 }),
    prompts: Type.Array(McpPromptVoSchema, { maxItems: 512 }),
  },
  { additionalProperties: false },
);
export type McpDiagnosticsVo = Static<typeof McpDiagnosticsVoSchema>;
