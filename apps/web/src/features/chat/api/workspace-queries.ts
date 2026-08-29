import { queryOptions } from "@tanstack/react-query";
import { listWorkspaces } from "./workspace-api";

export const workspaceQueryKeys = {
  all: ["workspaces"] as const,
  list: () => [...workspaceQueryKeys.all, "list"] as const,
};

export const workspaceListQueryOptions = () =>
  queryOptions({
    queryFn: ({ signal }) => listWorkspaces(signal),
    queryKey: workspaceQueryKeys.list(),
  });
