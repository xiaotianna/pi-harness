import { queryOptions } from "@tanstack/react-query";
import { listWorkspaceContextItems, listWorkspaces } from "./workspace-api";

export const workspaceQueryKeys = {
  all: ["workspaces"] as const,
  contextItems: (workspaceId: string) =>
    [...workspaceQueryKeys.all, "context-items", workspaceId] as const,
  list: () => [...workspaceQueryKeys.all, "list"] as const,
};

export const workspaceListQueryOptions = () =>
  queryOptions({
    queryFn: ({ signal }) => listWorkspaces(signal),
    queryKey: workspaceQueryKeys.list(),
  });

export const workspaceContextItemsQueryOptions = (workspaceId: string | undefined) =>
  queryOptions({
    enabled: workspaceId !== undefined,
    queryFn: ({ signal }) =>
      workspaceId ? listWorkspaceContextItems(workspaceId, signal) : Promise.resolve([]),
    queryKey: workspaceQueryKeys.contextItems(workspaceId ?? "none"),
    staleTime: 15_000,
  });
