import { queryOptions, skipToken } from "@tanstack/react-query";
import { getSkillContent, listSkills, type Skill } from "./skill-api";

export const skillQueryKeys = {
  all: ["skills"] as const,
  detail: (workspaceId: string, scope: Skill["scope"], name: string) =>
    [...skillQueryKeys.all, "detail", workspaceId, scope, name] as const,
  list: (workspaceId: string | null) => [...skillQueryKeys.all, "list", workspaceId] as const,
};

export const skillDetailQueryOptions = (
  workspaceId: string,
  skill: Pick<Skill, "name" | "scope">,
) =>
  queryOptions({
    queryFn: ({ signal }) => getSkillContent(workspaceId, skill, signal),
    queryKey: skillQueryKeys.detail(workspaceId, skill.scope, skill.name),
  });

export const skillListQueryOptions = (workspaceId?: string) =>
  queryOptions({
    queryFn: workspaceId ? ({ signal }) => listSkills(workspaceId, signal) : skipToken,
    queryKey: skillQueryKeys.list(workspaceId ?? null),
  });
