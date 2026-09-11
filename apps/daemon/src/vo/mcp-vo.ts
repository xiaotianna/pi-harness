import { type Static, Type } from "typebox";
import { McpCredentialSchema } from "../mcp/credential.js";
import {
  McpAuthMode,
  McpAuthRequirement,
  McpCatalogStatus,
  McpServerRecordSchema,
} from "../schemas/mcp.js";

export const McpServerVoSchema = Type.Object(
  {
    ...McpServerRecordSchema.properties,
    authRequirement: Type.Union([
      Type.Literal(McpAuthRequirement.UNKNOWN),
      Type.Literal(McpAuthRequirement.NONE),
      Type.Literal(McpAuthRequirement.STATIC),
      Type.Literal(McpAuthRequirement.OAUTH),
    ]),
    credentialMode: Type.Optional(
      Type.Union([Type.Literal(McpAuthMode.STATIC), Type.Literal(McpAuthMode.OAUTH)]),
    ),
    credentialRevision: Type.Optional(McpCredentialSchema.properties.revision),
    hasCredential: Type.Boolean(),
    isTrusted: Type.Boolean(),
    catalogStatus: Type.Union([
      Type.Literal(McpCatalogStatus.IDLE),
      Type.Literal(McpCatalogStatus.LOADING),
      Type.Literal(McpCatalogStatus.READY),
      Type.Literal(McpCatalogStatus.ERROR),
    ]),
    catalogUpdatedAt: Type.Optional(Type.Integer({ minimum: 0 })),
    catalogError: Type.Optional(Type.String({ maxLength: 4_096 })),
  },
  { additionalProperties: false },
);
export type McpServerVo = Static<typeof McpServerVoSchema>;
export const McpServerListVoSchema = Type.Array(McpServerVoSchema);

export const McpOAuthStartVoSchema = Type.Object(
  { authorizationUrl: Type.String({ minLength: 1, maxLength: 8_192 }) },
  { additionalProperties: false },
);
export type McpOAuthStartVo = Static<typeof McpOAuthStartVoSchema>;

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
    definitionFingerprint: Type.String({ minLength: 1, maxLength: 512 }),
    enabled: Type.Boolean(),
    inputSchema: Type.Unknown(),
    outputSchema: Type.Optional(Type.Unknown()),
    trustedReadOnly: Type.Boolean(),
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
export const McpCatalogVoSchema = Type.Union([McpDiagnosticsVoSchema, Type.Null()]);
