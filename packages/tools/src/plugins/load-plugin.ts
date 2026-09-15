import { existsSync, readFileSync, statSync } from "node:fs";
import { extname } from "node:path";
import { fileURLToPath } from "node:url";
import { type Static, Type } from "typebox";
import { Value } from "typebox/value";
import { parse } from "yaml";
import { SkillType } from "../skills/types.js";
import { readSkillDocument } from "../utils/skill-document.js";
import type { PluginDefinition } from "./types.js";

const MAX_DOCUMENT_BYTES = 128 * 1024;
const MAX_ICON_BYTES = 64 * 1024;
const MAX_LOGO_BYTES = 1024 * 1024;
const NAME_PATTERN = "^[a-z0-9]+(?:-[a-z0-9]+)*$";
const LOGO_FILE_PATTERN = "^[a-z0-9]+(?:-[a-z0-9]+)*\\.(?:svg|png|jpe?g|webp|gif)$";
const ImageMimeType = {
  GIF: "image/gif",
  JPEG: "image/jpeg",
  PNG: "image/png",
  SVG: "image/svg+xml",
  WEBP: "image/webp",
} as const;
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

const PluginAppSchema = Type.Object(
  {
    credentialSource: Type.Optional(Type.Literal("plugin-oauth")),
    description: Type.String({ maxLength: 1024, minLength: 1 }),
    displayName: Type.String({ maxLength: 64, minLength: 1 }),
    icon: Type.Optional(
      Type.String({ maxLength: 128, pattern: "^[a-z0-9]+(?:-[a-z0-9]+)*\\.svg$" }),
    ),
    mcpServer: Type.Union([
      Type.Object(
        {
          args: Type.Optional(
            Type.Array(Type.String({ maxLength: 8_192, pattern: "^[^\\u0000]*$" }), {
              maxItems: 128,
            }),
          ),
          command: Type.String({ maxLength: 4_096, minLength: 1 }),
          type: Type.Literal("stdio"),
        },
        { additionalProperties: false },
      ),
      Type.Object(
        {
          type: Type.Union([Type.Literal("http"), Type.Literal("sse")]),
          url: Type.String({ format: "uri", maxLength: 2_048, minLength: 1 }),
        },
        { additionalProperties: false },
      ),
    ]),
  },
  { additionalProperties: false },
);

const PluginAppsSchema = Type.Object(
  {
    apps: Type.Record(
      Type.String({ maxLength: 64, minLength: 1, pattern: NAME_PATTERN }),
      PluginAppSchema,
      { maxProperties: 32 },
    ),
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
    logo: Type.Optional(Type.String({ maxLength: 128, pattern: LOGO_FILE_PATTERN })),
    oauth: Type.Optional(PluginOAuthSchema),
    skills: Type.Array(PluginSkillSchema),
    type: SkillTypeSchema,
  },
  { additionalProperties: false },
);

type PluginMetadata = Static<typeof PluginMetadataSchema>;

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

function readBoundedFile(url: URL, maxBytes: number): Buffer {
  let metadata: ReturnType<typeof statSync>;
  try {
    metadata = statSync(url);
  } catch {
    throw new Error(`PLUGIN_INVALID: ${url.pathname} 不存在或无法读取`);
  }
  if (!metadata.isFile() || metadata.size > maxBytes) {
    throw new Error(`PLUGIN_INVALID: ${url.pathname} 不是普通文件或超过大小限制`);
  }
  try {
    return readFileSync(url);
  } catch {
    throw new Error(`PLUGIN_INVALID: ${url.pathname} 无法读取`);
  }
}

function readBoundedText(url: URL, maxBytes: number): string {
  return readBoundedFile(url, maxBytes).toString("utf8");
}

function readImageDataUrl(url: URL, label: string, maxBytes: number): string {
  const image = readBoundedFile(url, maxBytes);
  const extension = extname(fileURLToPath(url)).slice(1).toLowerCase();
  const mimeType =
    extension === "svg"
      ? ImageMimeType.SVG
      : extension === "png"
        ? ImageMimeType.PNG
        : extension === "jpg" || extension === "jpeg"
          ? ImageMimeType.JPEG
          : extension === "webp"
            ? ImageMimeType.WEBP
            : extension === "gif"
              ? ImageMimeType.GIF
              : null;
  const isValid =
    (mimeType === ImageMimeType.SVG && /^\s*<svg[\s>]/.test(image.toString("utf8"))) ||
    (mimeType === ImageMimeType.PNG &&
      image.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) ||
    (mimeType === ImageMimeType.JPEG &&
      image[0] === 0xff &&
      image[1] === 0xd8 &&
      image[2] === 0xff) ||
    (mimeType === ImageMimeType.WEBP &&
      image.subarray(0, 4).toString("ascii") === "RIFF" &&
      image.subarray(8, 12).toString("ascii") === "WEBP") ||
    (mimeType === ImageMimeType.GIF && /^GIF8[79]a$/.test(image.subarray(0, 6).toString("ascii")));
  if (!mimeType || !isValid) {
    throw new Error(`PLUGIN_INVALID: ${label} 不是支持的图片`);
  }
  return `data:${mimeType};base64,${image.toString("base64")}`;
}

function readSvgDataUrl(url: URL, label: string): string {
  return readImageDataUrl(url, label, MAX_ICON_BYTES);
}

function readYaml<T>(url: URL, schema: typeof PluginMetadataSchema): T {
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

function readJson<T>(url: URL, schema: typeof PluginAppsSchema): T {
  let metadata: unknown;
  try {
    metadata = JSON.parse(readBoundedText(url, MAX_DOCUMENT_BYTES));
  } catch {
    throw new Error(`PLUGIN_INVALID: ${url.pathname} 不是有效 JSON`);
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

  const logoFile = metadata.logo ?? "logo.svg";
  const logoUrl = new URL(logoFile, root);
  const logo =
    metadata.logo !== undefined || existsSync(logoUrl)
      ? readImageDataUrl(logoUrl, `${pluginId}/${logoFile}`, MAX_LOGO_BYTES)
      : undefined;
  const appsUrl = new URL(".app.json", root);
  const apps = existsSync(appsUrl)
    ? readJson<Static<typeof PluginAppsSchema>>(appsUrl, PluginAppsSchema).apps
    : {};
  for (const appId of Object.keys(apps)) {
    if (`__pi_plugin_app__:${pluginId}:${appId}`.length > 100) {
      throw new Error(`PLUGIN_INVALID: ${pluginId}/${appId} 的 App ID 过长`);
    }
    const app = apps[appId];
    if (app?.credentialSource === "plugin-oauth") {
      if (metadata.type !== SkillType.OAUTH || app.mcpServer.type === "stdio") {
        throw new Error(`PLUGIN_INVALID: ${pluginId}/${appId} 不能使用插件 OAuth 凭据`);
      }
    }
  }

  return {
    apiUrl: metadata.apiUrl,
    apps: Object.entries(apps).map(([appId, app]) => ({
      ...(app.credentialSource === undefined ? {} : { credentialSource: app.credentialSource }),
      description: app.description,
      displayName: app.displayName,
      ...(app.icon === undefined
        ? {}
        : { icon: readSvgDataUrl(new URL(app.icon, root), `${pluginId}/${app.icon}`) }),
      id: appId,
      server:
        app.mcpServer.type === "stdio"
          ? {
              args: app.mcpServer.args ?? [],
              command: app.mcpServer.command,
              type: app.mcpServer.type,
            }
          : app.mcpServer,
    })),
    category: metadata.category,
    description: metadata.description,
    gateway: metadata.gateway,
    id: pluginId,
    ...(logo === undefined ? {} : { logo }),
    name: metadata.displayName,
    ...(metadata.oauth === undefined ? {} : { oauth: metadata.oauth }),
    skills: metadata.skills.map(({ displayName, icon, id: skillId }) => {
      const directory = fileURLToPath(new URL(`skills/${skillId}/`, root));
      const { instructions, frontmatter: skill } = readSkillDocument(
        readBoundedText(new URL(`skills/${skillId}/SKILL.md`, root), MAX_DOCUMENT_BYTES),
        skillId,
      );
      return {
        directory,
        frontmatter: skill,
        description: skill.description,
        displayName,
        ...(icon === undefined
          ? {}
          : { icon: readSvgDataUrl(new URL(icon, root), `${pluginId}/${icon}`) }),
        id: skillId,
        instructions,
        name: skillId,
        type: metadata.type,
      };
    }),
    type: metadata.type,
  };
}
