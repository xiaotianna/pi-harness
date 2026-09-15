import { SkillType } from "@pi-harness/tools";
import { type Static, Type } from "typebox";
import { McpAuthMode, McpAuthRequirement, McpCatalogStatus, McpTransport } from "../schemas/mcp.js";

const SkillTypeSchema = Type.Union([Type.Literal(SkillType.NONE), Type.Literal(SkillType.OAUTH)]);
const PluginImageDataUrlSchema = Type.String({
  maxLength: 1_400_000,
  pattern: "^data:image/(?:svg\\+xml|png|jpeg|webp|gif);base64,",
});

const SkillCollectionItemVoSchema = Type.Object({
  description: Type.String({ minLength: 1 }),
  icon: Type.Union([PluginImageDataUrlSchema, Type.Null()]),
  id: Type.String({ minLength: 1 }),
  isEnabled: Type.Boolean(),
  name: Type.String({ minLength: 1 }),
  type: SkillTypeSchema,
});

const PluginAppServerVoSchema = Type.Object({
  authRequirement: Type.Union([
    Type.Literal(McpAuthRequirement.UNKNOWN),
    Type.Literal(McpAuthRequirement.NONE),
    Type.Literal(McpAuthRequirement.STATIC),
    Type.Literal(McpAuthRequirement.OAUTH),
  ]),
  catalogStatus: Type.Union([
    Type.Literal(McpCatalogStatus.IDLE),
    Type.Literal(McpCatalogStatus.LOADING),
    Type.Literal(McpCatalogStatus.READY),
    Type.Literal(McpCatalogStatus.ERROR),
  ]),
  credentialMode: Type.Optional(
    Type.Union([Type.Literal(McpAuthMode.STATIC), Type.Literal(McpAuthMode.OAUTH)]),
  ),
  credentialRevision: Type.Optional(Type.Integer({ minimum: 1 })),
  hasCredential: Type.Boolean(),
  id: Type.String({ minLength: 1 }),
  isEnabled: Type.Boolean(),
  revision: Type.Integer({ minimum: 1 }),
  transport: Type.Union([
    Type.Literal(McpTransport.STDIO),
    Type.Literal(McpTransport.STREAMABLE_HTTP),
    Type.Literal(McpTransport.SSE),
  ]),
});

const PluginAppVoSchema = Type.Object({
  description: Type.String({ minLength: 1 }),
  icon: Type.Union([PluginImageDataUrlSchema, Type.Null()]),
  id: Type.String({ minLength: 1 }),
  name: Type.String({ minLength: 1 }),
  usesPluginOAuth: Type.Boolean(),
  server: Type.Union([PluginAppServerVoSchema, Type.Null()]),
});

export const SkillCollectionVoSchema = Type.Object({
  apps: Type.Array(PluginAppVoSchema),
  category: Type.Union([Type.Literal("developer"), Type.Literal("productivity")]),
  description: Type.String({ minLength: 1 }),
  id: Type.String({ minLength: 1 }),
  isInstalled: Type.Boolean(),
  logo: Type.Union([PluginImageDataUrlSchema, Type.Null()]),
  name: Type.String({ minLength: 1 }),
  skills: Type.Array(SkillCollectionItemVoSchema),
  type: SkillTypeSchema,
});

export const SkillCollectionListVoSchema = Type.Array(SkillCollectionVoSchema);
export type SkillCollectionVo = Static<typeof SkillCollectionVoSchema>;

export const SkillCollectionSkillContentVoSchema = Type.Object({
  content: Type.String({ minLength: 1 }),
});

export type SkillCollectionSkillContentVo = Static<typeof SkillCollectionSkillContentVoSchema>;

const SkillConnectionAccountVoSchema = Type.Object({
  avatarUrl: Type.Union([Type.String({ format: "uri" }), Type.Null()]),
  displayName: Type.Union([Type.String({ minLength: 1 }), Type.Null()]),
  id: Type.String({ minLength: 1 }),
  username: Type.String({ minLength: 1 }),
});

export const SkillConnectionStatusVoSchema = Type.Object({
  account: Type.Union([SkillConnectionAccountVoSchema, Type.Null()]),
  collectionId: Type.String({ minLength: 1 }),
  isConnected: Type.Boolean(),
});

export type SkillConnectionStatusVo = Static<typeof SkillConnectionStatusVoSchema>;

export const SkillOAuthStartVoSchema = Type.Object({
  authorizationUrl: Type.String({ format: "uri" }),
});

export type SkillOAuthStartVo = Static<typeof SkillOAuthStartVoSchema>;
