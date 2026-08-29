import { type Static, Type } from "typebox";
import { Value } from "typebox/value";
import { apiRequest } from "../../../api/request";

const SkillSchema = Type.Object({
  description: Type.String({ minLength: 1 }),
  directory: Type.String({ minLength: 1 }),
  id: Type.String({ minLength: 1 }),
  isEnabled: Type.Boolean(),
  name: Type.String({ minLength: 1 }),
  scope: Type.Union([Type.Literal("project"), Type.Literal("global")]),
});
const SkillListSchema = Type.Array(SkillSchema);

export type Skill = Static<typeof SkillSchema>;

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
