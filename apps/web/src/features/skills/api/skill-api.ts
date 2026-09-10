import { type Static, Type } from "typebox";
import { Value } from "typebox/value";
import { apiRequest } from "../../../api/request";

const SkillSchema = Type.Object({
  icon: Type.Union([
    Type.String({ maxLength: 400_000, pattern: "^data:image/svg\\+xml;base64," }),
    Type.Null(),
  ]),
  collectionId: Type.Union([Type.String({ minLength: 1 }), Type.Null()]),
  description: Type.String({ minLength: 1 }),
  directory: Type.Union([Type.String({ minLength: 1 }), Type.Null()]),
  id: Type.String({ minLength: 1 }),
  isEnabled: Type.Boolean(),
  name: Type.String({ minLength: 1 }),
  scope: Type.Union([Type.Literal("system"), Type.Literal("project"), Type.Literal("global")]),
  type: Type.Union([Type.Literal("none"), Type.Literal("oauth")]),
});
const SkillListSchema = Type.Array(SkillSchema);
const SkillContentSchema = Type.Object({
  content: Type.String({ minLength: 1 }),
});
const SkillInstallResultSchema = Type.Object({
  installedSkillNames: Type.Array(Type.String({ minLength: 1 }), { minItems: 1 }),
});

const SkillCollectionSchema = Type.Object({
  category: Type.Union([Type.Literal("developer"), Type.Literal("productivity")]),
  description: Type.String({ minLength: 1 }),
  id: Type.String({ minLength: 1 }),
  isInstalled: Type.Boolean(),
  logo: Type.Union([
    Type.String({ maxLength: 400_000, pattern: "^data:image/svg\\+xml;base64," }),
    Type.Null(),
  ]),
  name: Type.String({ minLength: 1 }),
  skills: Type.Array(
    Type.Object({
      description: Type.String({ minLength: 1 }),
      icon: Type.Union([
        Type.String({ maxLength: 400_000, pattern: "^data:image/svg\\+xml;base64," }),
        Type.Null(),
      ]),
      id: Type.String({ minLength: 1 }),
      isEnabled: Type.Boolean(),
      name: Type.String({ minLength: 1 }),
      type: Type.Union([Type.Literal("none"), Type.Literal("oauth")]),
    }),
  ),
  type: Type.Union([Type.Literal("none"), Type.Literal("oauth")]),
});
const SkillCollectionListSchema = Type.Array(SkillCollectionSchema);

const SkillConnectionStatusSchema = Type.Object({
  account: Type.Union([
    Type.Object({
      avatarUrl: Type.Union([Type.String({ format: "uri" }), Type.Null()]),
      displayName: Type.Union([Type.String({ minLength: 1 }), Type.Null()]),
      id: Type.String({ minLength: 1 }),
      username: Type.String({ minLength: 1 }),
    }),
    Type.Null(),
  ]),
  collectionId: Type.String({ minLength: 1 }),
  isConnected: Type.Boolean(),
});
const SkillOAuthStartSchema = Type.Object({
  authorizationUrl: Type.String({ format: "uri" }),
});

export type Skill = Static<typeof SkillSchema>;
export type SkillCollection = Static<typeof SkillCollectionSchema>;
export type SkillConnectionStatus = Static<typeof SkillConnectionStatusSchema>;

export interface InstallSkillInput {
  skillName?: string;
  source: string;
}

function skillPath(workspaceId: string, skill: Pick<Skill, "name" | "scope">) {
  return `/api/workspaces/${encodeURIComponent(workspaceId)}/skills/${skill.scope}/${encodeURIComponent(skill.name)}`;
}

export async function listSkills(
  workspaceId: string,
  signal?: AbortSignal,
): Promise<readonly Skill[]> {
  const body = (await (
    await apiRequest(
      `/api/workspaces/${encodeURIComponent(workspaceId)}/skills`,
      signal ? { signal } : undefined,
    )
  ).json()) as unknown;
  if (!Value.Check(SkillListSchema, body)) throw new Error("daemon 返回了无效的 Skill 目录");
  return body;
}

export async function listSkillCollections(
  signal?: AbortSignal,
): Promise<readonly SkillCollection[]> {
  const body = (await (
    await apiRequest("/api/skill-collections", signal ? { signal } : undefined)
  ).json()) as unknown;
  if (!Value.Check(SkillCollectionListSchema, body)) {
    throw new Error("daemon 返回了无效的 Skill 集合目录");
  }
  return body;
}

export async function getSkillConnectionStatus(
  collectionId: string,
  signal?: AbortSignal,
): Promise<SkillConnectionStatus> {
  const body = (await (
    await apiRequest(
      `/api/skill-connections/${encodeURIComponent(collectionId)}`,
      signal ? { signal } : undefined,
    )
  ).json()) as unknown;
  if (!Value.Check(SkillConnectionStatusSchema, body)) {
    throw new Error("daemon 返回了无效的 Skill 连接状态");
  }
  return body;
}

export function getSkillOAuthLaunchUrl(collectionId: string, name: string): string {
  return `/skill-oauth/${encodeURIComponent(collectionId)}/launch?name=${encodeURIComponent(name)}`;
}

export async function startSkillOAuth(collectionId: string): Promise<string> {
  const body = (await (
    await apiRequest(`/api/skill-connections/${encodeURIComponent(collectionId)}/oauth`, {
      method: "POST",
    })
  ).json()) as unknown;
  if (!Value.Check(SkillOAuthStartSchema, body)) {
    throw new Error("daemon 返回了无效的 OAuth 授权地址");
  }
  return body.authorizationUrl;
}

export async function disconnectSkill(collectionId: string): Promise<void> {
  await apiRequest(`/api/skill-connections/${encodeURIComponent(collectionId)}`, {
    method: "DELETE",
  });
}

export async function installSkillCollection(collectionId: string): Promise<void> {
  await apiRequest(`/api/skill-collections/${encodeURIComponent(collectionId)}`, {
    method: "POST",
  });
}

export async function uninstallSkillCollection(collectionId: string): Promise<void> {
  await apiRequest(`/api/skill-collections/${encodeURIComponent(collectionId)}`, {
    method: "DELETE",
  });
}

export async function getSkillCollectionSkillContent(
  collectionId: string,
  skillId: string,
  signal?: AbortSignal,
): Promise<string> {
  const body = (await (
    await apiRequest(
      `/api/skill-collections/${encodeURIComponent(collectionId)}/skills/${encodeURIComponent(skillId)}`,
      signal ? { signal } : undefined,
    )
  ).json()) as unknown;
  if (!Value.Check(SkillContentSchema, body)) throw new Error("daemon 返回了无效的 Skill 内容");
  return body.content;
}

export async function updateSkillCollectionSkill(
  collectionId: string,
  skillId: string,
  isEnabled: boolean,
): Promise<void> {
  await apiRequest(
    `/api/skill-collections/${encodeURIComponent(collectionId)}/skills/${encodeURIComponent(skillId)}`,
    { body: JSON.stringify({ isEnabled }), method: "PATCH" },
  );
}

export async function installSkill(
  workspaceId: string,
  input: InstallSkillInput,
): Promise<readonly string[]> {
  const body = (await (
    await apiRequest(`/api/workspaces/${encodeURIComponent(workspaceId)}/skills/install`, {
      body: JSON.stringify(input),
      method: "POST",
    })
  ).json()) as unknown;
  if (!Value.Check(SkillInstallResultSchema, body)) {
    throw new Error("daemon 返回了无效的 Skill 安装结果");
  }
  return body.installedSkillNames;
}

export async function getSkillContent(
  workspaceId: string,
  skill: Pick<Skill, "name" | "scope">,
  signal?: AbortSignal,
): Promise<string> {
  const body = (await (
    await apiRequest(skillPath(workspaceId, skill), signal ? { signal } : undefined)
  ).json()) as unknown;
  if (!Value.Check(SkillContentSchema, body)) throw new Error("daemon 返回了无效的 Skill 内容");
  return body.content;
}

export async function updateSkill(
  workspaceId: string,
  skill: Pick<Skill, "name" | "scope">,
  isEnabled: boolean,
): Promise<void> {
  await apiRequest(skillPath(workspaceId, skill), {
    body: JSON.stringify({ isEnabled }),
    method: "PATCH",
  });
}

export async function openSkillDirectory(
  workspaceId: string,
  skill: Pick<Skill, "name" | "scope">,
): Promise<void> {
  await apiRequest(`${skillPath(workspaceId, skill)}/open`, { method: "POST" });
}

export async function openSkillRootDirectory(
  workspaceId: string,
  directory: string,
): Promise<void> {
  await apiRequest(`/api/workspaces/${encodeURIComponent(workspaceId)}/open`, {
    body: JSON.stringify({ path: directory }),
    method: "POST",
  });
}

export async function removeSkill(
  workspaceId: string,
  skill: Pick<Skill, "name" | "scope">,
): Promise<void> {
  await apiRequest(skillPath(workspaceId, skill), { method: "DELETE" });
}
