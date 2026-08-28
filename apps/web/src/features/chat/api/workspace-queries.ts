import { queryOptions, skipToken } from "@tanstack/react-query";
import { listWorkspaceSkills, listWorkspaces } from "./workspace-api";

export const workspaceQueryKeys = {
  all: ["workspaces"] as const,
  list: () => [...workspaceQueryKeys.all, "list"] as const,
  skills: (workspaceId: string | null) =>
    [...workspaceQueryKeys.all, "skills", workspaceId] as const,
};

export const workspaceListQueryOptions = () =>
  queryOptions({
    queryFn: ({ signal }) => listWorkspaces(signal),
    queryKey: workspaceQueryKeys.list(),
  });

export const workspaceSkillListQueryOptions = (workspaceId?: string) =>
  queryOptions({
    queryFn: workspaceId ? ({ signal }) => listWorkspaceSkills(workspaceId, signal) : skipToken,
    queryKey: workspaceQueryKeys.skills(workspaceId ?? null),
  });
