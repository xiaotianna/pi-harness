import { type Static, Type } from "typebox";
import { Value } from "typebox/value";
import { apiRequest } from "../../../api/request";

const SkillSchema = Type.Object({
  description: Type.String({ minLength: 1 }),
  directory: Type.Union([Type.String({ minLength: 1 }), Type.Null()]),
  id: Type.String({ minLength: 1 }),
  isEnabled: Type.Boolean(),
  name: Type.String({ minLength: 1 }),
  scope: Type.Union([Type.Literal("system"), Type.Literal("project"), Type.Literal("global")]),
});
const SkillListSchema = Type.Array(SkillSchema);
const SkillContentSchema = Type.Object({
  content: Type.String({ minLength: 1 }),
});
const SkillInstallResultSchema = Type.Object({
  installedSkillNames: Type.Array(Type.String({ minLength: 1 }), { minItems: 1 }),
});

export type Skill = Static<typeof SkillSchema>;

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
