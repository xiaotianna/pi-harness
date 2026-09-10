import { type Static, Type } from "typebox";
import { McpAuthMode, McpServerIdSchema } from "../schemas/mcp.js";

const SecretSchema = Type.String({
  minLength: 1,
  maxLength: 16_384,
  pattern: "^[^\\u0000-\\u001f\\u007f]+$",
});
const EnvironmentSchema = Type.Record(
  Type.String({ pattern: "^[A-Za-z_][A-Za-z0-9_]{0,127}$" }),
  Type.String({ maxLength: 16_384, pattern: "^[^\\u0000]*$" }),
  { maxProperties: 64, additionalProperties: false },
);
const HeadersSchema = Type.Record(
  Type.String({ pattern: "^[!#$%&'*+.^_`|~0-9A-Za-z-]{1,128}$" }),
  Type.String({ minLength: 1, maxLength: 16_384, pattern: "^[^\\u0000\\r\\n]+$" }),
  { maxProperties: 32, additionalProperties: false },
);

const StaticCredentialSchema = Type.Object(
  {
    mode: Type.Literal(McpAuthMode.STATIC),
    headers: HeadersSchema,
    environment: EnvironmentSchema,
  },
  { additionalProperties: false },
);

const OAuthCredentialSchema = Type.Object(
  {
    mode: Type.Literal(McpAuthMode.OAUTH),
    issuer: Type.String({ minLength: 1, maxLength: 2_048 }),
    resource: Type.String({ minLength: 1, maxLength: 2_048 }),
    clientId: Type.String({ minLength: 1, maxLength: 2_048 }),
    clientSecret: Type.Optional(SecretSchema),
    accessToken: SecretSchema,
    refreshToken: Type.Optional(SecretSchema),
    expiresAt: Type.Optional(Type.Integer({ minimum: 0, maximum: Number.MAX_SAFE_INTEGER })),
    scope: Type.Optional(Type.String({ maxLength: 8_192 })),
  },
  { additionalProperties: false },
);

export const McpCredentialMaterialSchema = Type.Union([
  StaticCredentialSchema,
  OAuthCredentialSchema,
]);
export type McpCredentialMaterial = Static<typeof McpCredentialMaterialSchema>;

export const McpCredentialSchema = Type.Object(
  {
    serverId: McpServerIdSchema,
    identity: Type.String({ minLength: 1, maxLength: 512 }),
    revision: Type.Integer({ minimum: 1, maximum: Number.MAX_SAFE_INTEGER }),
    configRevision: Type.Integer({ minimum: 1, maximum: Number.MAX_SAFE_INTEGER }),
    material: McpCredentialMaterialSchema,
  },
  { additionalProperties: false },
);
export type McpCredential = Static<typeof McpCredentialSchema>;

export const McpCredentialFileSchema = Type.Object(
  { version: Type.Literal(1), credentials: Type.Array(McpCredentialSchema, { maxItems: 256 }) },
  { additionalProperties: false },
);
