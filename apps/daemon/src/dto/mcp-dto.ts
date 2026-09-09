import { type Static, Type } from "typebox";
import { McpCredentialMaterialSchema } from "../mcp/credential.js";
import {
  McpServerConfigSchema,
  McpServerIdSchema,
  McpServerNameSchema,
  McpTransport,
} from "../schemas/mcp.js";

export const McpServerParamsDtoSchema = Type.Object(
  { serverId: McpServerIdSchema },
  { additionalProperties: false },
);
export type McpServerParamsDto = Static<typeof McpServerParamsDtoSchema>;

export const CreateMcpServerDtoSchema = Type.Object(
  {
    name: McpServerNameSchema,
    config: McpServerConfigSchema,
  },
  { additionalProperties: false },
);
export type CreateMcpServerDto = Static<typeof CreateMcpServerDtoSchema>;

export const UpdateMcpServerDtoSchema = Type.Object(
  {
    expectedRevision: Type.Integer({ minimum: 1, maximum: Number.MAX_SAFE_INTEGER - 1 }),
    name: McpServerNameSchema,
    config: McpServerConfigSchema,
    enabled: Type.Boolean(),
  },
  { additionalProperties: false },
);
export type UpdateMcpServerDto = Static<typeof UpdateMcpServerDtoSchema>;

export const McpRevisionDtoSchema = Type.Object(
  { expectedRevision: Type.Integer({ minimum: 1, maximum: Number.MAX_SAFE_INTEGER - 1 }) },
  { additionalProperties: false },
);
export type McpRevisionDto = Static<typeof McpRevisionDtoSchema>;

export const PutMcpCredentialDtoSchema = Type.Object(
  {
    ...McpRevisionDtoSchema.properties,
    material: McpCredentialMaterialSchema,
  },
  { additionalProperties: false },
);
export type PutMcpCredentialDto = Static<typeof PutMcpCredentialDtoSchema>;

export const TestMcpConnectionDtoSchema = Type.Object(
  {
    ...McpRevisionDtoSchema.properties,
  },
  { additionalProperties: false },
);
export type TestMcpConnectionDto = Static<typeof TestMcpConnectionDtoSchema>;

const McpJsonServerSchema = Type.Union([
  Type.Object(
    {
      type: Type.Optional(Type.Literal(McpTransport.STDIO)),
      command: Type.String({ minLength: 1, maxLength: 4_096 }),
      args: Type.Optional(
        Type.Array(Type.String({ maxLength: 8_192, pattern: "^[^\\u0000]*$" }), {
          maxItems: 128,
        }),
      ),
    },
    { additionalProperties: false },
  ),
  Type.Object(
    {
      type: Type.Union([
        Type.Literal(McpTransport.STREAMABLE_HTTP),
        Type.Literal(McpTransport.SSE),
      ]),
      url: Type.String({ minLength: 1, maxLength: 2_048 }),
    },
    { additionalProperties: false },
  ),
]);

export const McpJsonDtoSchema = Type.Object(
  {
    mcpServers: Type.Record(McpServerNameSchema, McpJsonServerSchema, {
      minProperties: 1,
      maxProperties: 32,
    }),
  },
  { additionalProperties: false },
);
export type McpJsonDto = Static<typeof McpJsonDtoSchema>;

const LegacyImportMcpServersDtoSchema = Type.Object(
  {
    version: Type.Literal(1),
    servers: Type.Array(CreateMcpServerDtoSchema, { minItems: 1, maxItems: 32 }),
  },
  { additionalProperties: false },
);

export const ImportMcpServersDtoSchema = Type.Union([
  McpJsonDtoSchema,
  LegacyImportMcpServersDtoSchema,
]);
export type ImportMcpServersDto = Static<typeof ImportMcpServersDtoSchema>;
