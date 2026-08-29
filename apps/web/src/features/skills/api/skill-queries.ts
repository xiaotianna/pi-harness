import { queryOptions, skipToken } from "@tanstack/react-query";
import { listSkills } from "./skill-api";

export const skillQueryKeys = {
  all: ["skills"] as const,
  list: (workspaceId: string | null) => [...skillQueryKeys.all, "list", workspaceId] as const,
};

export const skillListQueryOptions = (workspaceId?: string) =>
  queryOptions({
    queryFn: workspaceId ? ({ signal }) => listSkills(workspaceId, signal) : skipToken,
    queryKey: skillQueryKeys.list(workspaceId ?? null),
  });
