import { existsSync, readFileSync, statSync } from "node:fs";
import { type Static, Type } from "typebox";
import { Value } from "typebox/value";
import { parse } from "yaml";
import { SkillType } from "../skills/types.js";
import type { PluginDefinition } from "./types.js";

const MAX_DOCUMENT_BYTES = 128 * 1024;
const MAX_LOGO_BYTES = 64 * 1024;
const NAME_PATTERN = "^[a-z0-9]+(?:-[a-z0-9]+)*$";
const FRONTMATTER_PATTERN = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/;
const PathOrUrlSchema = Type.Union([
  Type.String({ minLength: 1, pattern: "^/" }),
  Type.String({ format: "uri", minLength: 1 }),
]);

const SkillTypeSchema = Type.Union([Type.Literal(SkillType.NONE), Type.Literal(SkillType.OAUTH)]);

const PluginSkillSchema = Type.Object(
  {
    displayName: Type.String({ maxLength: 64, minLength: 1 }),
    icon: Type.Optional(
      Type.String({ maxLength: 128, pattern: "^[a-z0-9]+(?:-[a-z0-9]+)*\\.svg$" }),
    ),
    id: Type.String({ maxLength: 64, minLength: 1, pattern: NAME_PATTERN }),
  },
  { additionalProperties: false },
);

const PluginOAuthSchema = Type.Object(
  {
    authorizationParams: Type.Optional(
      Type.Record(Type.String({ maxLength: 64, minLength: 1 }), Type.String({ maxLength: 1024 }), {
        maxProperties: 16,
      }),
    ),
    authorizationPath: PathOrUrlSchema,
    callbackUrl: Type.Optional(
      Type.String({
        format: "uri",
        maxLength: 2048,
        pattern: "^https?://(?:127\\.0\\.0\\.1|localhost|\\[::1\\])(?::[0-9]+)?/[^?#\\s]*$",
      }),
    ),
    clientId: Type.String({ maxLength: 1024 }),
    clientSecret: Type.String({ maxLength: 4096 }),
    pkce: Type.Boolean(),
    profile: Type.Optional(
      Type.Object(
        {
          avatarUrlField: Type.Optional(Type.String({ minLength: 1 })),
          displayNameField: Type.Optional(Type.String({ minLength: 1 })),
          idField: Type.String({ minLength: 1 }),
          method: Type.Optional(Type.Union([Type.Literal("GET"), Type.Literal("POST")])),
          path: Type.Optional(Type.String({ minLength: 1, pattern: "^/" })),
          source: Type.Union([
            Type.Literal("id-token"),
            Type.Literal("token"),
            Type.Literal("userinfo"),
          ]),
          usernameField: Type.String({ minLength: 1 }),
        },
        { additionalProperties: false },
      ),
    ),
    scopes: Type.Array(Type.String({ minLength: 1 })),
    tokenAuth: Type.Union([Type.Literal("basic"), Type.Literal("body")]),
    tokenFormat: Type.Union([Type.Literal("form"), Type.Literal("json")]),
    tokenPath: PathOrUrlSchema,
  },
  { additionalProperties: false },
);

const PluginGatewaySchema = Type.Object(
  {
    allowedPaths: Type.Array(Type.String({ maxLength: 1024, minLength: 1 }), {
      maxItems: 32,
      minItems: 1,
    }),
    deniedQueryValues: Type.Optional(
      Type.Record(
        Type.String({ maxLength: 128, minLength: 1 }),
        Type.Array(Type.String({ maxLength: 1024 }), { maxItems: 16, minItems: 1 }),
        { maxProperties: 16 },
      ),
    ),
    headers: Type.Optional(
      Type.Record(
        Type.String({ maxLength: 128, minLength: 1, pattern: "^[A-Za-z0-9-]+$" }),
        Type.String({ maxLength: 1024 }),
        { maxProperties: 16 },
      ),
    ),
    queryJsonPostPaths: Type.Optional(
      Type.Array(Type.String({ maxLength: 1024, minLength: 1 }), {
        maxItems: 16,
        minItems: 1,
      }),
    ),
  },
  { additionalProperties: false },
);

const PluginMetadataSchema = Type.Object(
  {
    apiUrl: Type.String({ format: "uri", minLength: 1 }),
    category: Type.Union([Type.Literal("developer"), Type.Literal("productivity")]),
    description: Type.String({ maxLength: 1024, minLength: 1 }),
    displayName: Type.String({ maxLength: 64, minLength: 1 }),
    gateway: PluginGatewaySchema,
    id: Type.String({ maxLength: 64, minLength: 1, pattern: NAME_PATTERN }),
    oauth: Type.Optional(PluginOAuthSchema),
    skills: Type.Array(PluginSkillSchema, { minItems: 1 }),
    type: SkillTypeSchema,
  },
  { additionalProperties: false },
);

const SkillMetadataSchema = Type.Object(
  {
    description: Type.String({ maxLength: 1024, minLength: 1 }),
    name: Type.String({ maxLength: 64, minLength: 1 }),
  },
  { additionalProperties: false },
);

type PluginMetadata = Static<typeof PluginMetadataSchema>;
type SkillMetadata = Static<typeof SkillMetadataSchema>;
type MarkdownSchema = typeof PluginMetadataSchema | typeof SkillMetadataSchema;

const RESERVED_GATEWAY_HEADERS = new Set(["authorization", "content-type", "user-agent"]);
const RESERVED_OAUTH_PARAMS = new Set([
  "client_id",
  "code_challenge",
  "code_challenge_method",
  "redirect_uri",
  "response_type",
  "scope",
  "state",
]);

function readBoundedText(url: URL, maxBytes: number): string {
  const metadata = statSync(url);
  if (!metadata.isFile() || metadata.size > maxBytes) {
    throw new Error(`PLUGIN_INVALID: ${url.pathname} 不是普通文件或超过大小限制`);
  }
  return readFileSync(url, "utf8");
}

function readSvgDataUrl(url: URL, label: string): string {
  const svg = readBoundedText(url, MAX_LOGO_BYTES);
  if (!/^\s*<svg[\s>]/.test(svg)) {
    throw new Error(`PLUGIN_INVALID: ${label} 不是有效的 SVG`);
  }
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
}

function readMarkdown<T>(
  url: URL,
  schema: MarkdownSchema,
): {
  body: string;
  metadata: T;
} {
  const source = readBoundedText(url, MAX_DOCUMENT_BYTES);
  const match = FRONTMATTER_PATTERN.exec(source);
  if (!match) throw new Error(`PLUGIN_INVALID: ${url.pathname} 缺少 YAML frontmatter`);

  let metadata: unknown;
  try {
    metadata = parse(match[1] ?? "", { maxAliasCount: 0, uniqueKeys: true });
  } catch {
    throw new Error(`PLUGIN_INVALID: ${url.pathname} frontmatter 不是有效 YAML`);
  }
  if (!Value.Check(schema, metadata)) {
    throw new Error(`PLUGIN_INVALID: ${url.pathname} frontmatter 不符合结构规范`);
  }

  const body = source.slice(match[0].length).trim();
  if (!body) throw new Error(`PLUGIN_INVALID: ${url.pathname} 正文不能为空`);
  return { body, metadata: metadata as T };
}

function readYaml<T>(url: URL, schema: MarkdownSchema): T {
  let metadata: unknown;
  try {
    metadata = parse(readBoundedText(url, MAX_DOCUMENT_BYTES), {
      maxAliasCount: 0,
      uniqueKeys: true,
    });
  } catch {
    throw new Error(`PLUGIN_INVALID: ${url.pathname} 不是有效 YAML`);
  }
  if (!Value.Check(schema, metadata)) {
    throw new Error(`PLUGIN_INVALID: ${url.pathname} 不符合结构规范`);
  }
  return metadata as T;
}

function validatePathPatterns(pluginId: string, patterns: readonly string[]): void {
  for (const pattern of patterns) {
    if (!pattern.startsWith("^") || !pattern.endsWith("$")) {
      throw new Error(`PLUGIN_INVALID: ${pluginId} 的网关路径规则必须完整锚定`);
    }
    try {
      new RegExp(pattern);
    } catch {
      throw new Error(`PLUGIN_INVALID: ${pluginId} 包含无效的网关路径规则`);
    }
  }
}

export function loadPlugin(pluginId: string): PluginDefinition {
  if (!new RegExp(NAME_PATTERN).test(pluginId)) {
    throw new Error(`PLUGIN_INVALID: ${pluginId} 不是有效的插件目录名`);
  }

  const root = new URL(`./${pluginId}/`, import.meta.url);
  const metadata = readYaml<PluginMetadata>(new URL("manifest.yaml", root), PluginMetadataSchema);
  if (metadata.id !== pluginId) {
    throw new Error(`PLUGIN_INVALID: ${pluginId} 的目录名必须与 manifest.id 一致`);
  }
  if ((metadata.type === SkillType.OAUTH) !== (metadata.oauth !== undefined)) {
    throw new Error(`PLUGIN_INVALID: ${pluginId} 的 OAuth 配置与 type 不一致`);
  }
  if (metadata.oauth?.profile?.source === "userinfo" && !metadata.oauth.profile.path) {
    throw new Error(`PLUGIN_INVALID: ${pluginId} 的 userinfo profile 缺少 path`);
  }
  if (
    metadata.oauth !== undefined &&
    (metadata.oauth.clientId.length === 0) !== (metadata.oauth.clientSecret.length === 0)
  ) {
    throw new Error(`PLUGIN_INVALID: ${pluginId} 的 clientId 和 clientSecret 必须同时配置`);
  }
  validatePathPatterns(pluginId, metadata.gateway.allowedPaths);
  validatePathPatterns(pluginId, metadata.gateway.queryJsonPostPaths ?? []);
  if (
    Object.keys(metadata.gateway.headers ?? {}).some((name) =>
      RESERVED_GATEWAY_HEADERS.has(name.toLowerCase()),
    )
  ) {
    throw new Error(`PLUGIN_INVALID: ${pluginId} 不得覆盖网关保留请求头`);
  }
  if (
    Object.keys(metadata.oauth?.authorizationParams ?? {}).some((name) =>
      RESERVED_OAUTH_PARAMS.has(name),
    )
  ) {
    throw new Error(`PLUGIN_INVALID: ${pluginId} 不得覆盖 OAuth 保留参数`);
  }
  if (new Set(metadata.skills.map(({ id }) => id)).size !== metadata.skills.length) {
    throw new Error(`PLUGIN_INVALID: ${pluginId} 包含重复的 Skill`);
  }

  const logoUrl = new URL("logo.svg", root);
  const logo = existsSync(logoUrl) ? readSvgDataUrl(logoUrl, `${pluginId}/logo.svg`) : undefined;

  return {
    apiUrl: metadata.apiUrl,
    category: metadata.category,
    description: metadata.description,
    gateway: metadata.gateway,
    id: pluginId,
    ...(logo === undefined ? {} : { logo }),
    name: metadata.displayName,
    ...(metadata.oauth === undefined ? {} : { oauth: metadata.oauth }),
    skills: metadata.skills.map(({ displayName, icon, id: skillId }) => {
      const { body, metadata: skill } = readMarkdown<SkillMetadata>(
        new URL(`skills/${skillId}/SKILL.md`, root),
        SkillMetadataSchema,
      );
      if (skill.name !== skillId) {
        throw new Error(`PLUGIN_INVALID: ${pluginId}/${skillId} 的目录名必须与 SKILL.md name 一致`);
      }
      return {
        description: skill.description,
        displayName,
        ...(icon === undefined
          ? {}
          : { icon: readSvgDataUrl(new URL(icon, root), `${pluginId}/${icon}`) }),
        id: skillId,
        instructions: body,
        name: skillId,
        type: metadata.type,
      };
    }),
    type: metadata.type,
  };
}
