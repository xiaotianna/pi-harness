import { queryOptions } from "@tanstack/react-query";
import {
  listWorkspaceContextItems,
  listWorkspaceFiles,
  listWorkspaces,
  readWorkspaceFile,
} from "./workspace-api";

export const workspaceQueryKeys = {
  all: ["workspaces"] as const,
  contextItems: (workspaceId: string) =>
    [...workspaceQueryKeys.all, "context-items", workspaceId] as const,
  file: (workspaceId: string, path: string) =>
    [...workspaceQueryKeys.all, "files", workspaceId, path] as const,
  files: (workspaceId: string) => [...workspaceQueryKeys.all, "files", workspaceId] as const,
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

export const workspaceFilesQueryOptions = (workspaceId: string) =>
  queryOptions({
    queryFn: ({ signal }) => listWorkspaceFiles(workspaceId, signal),
    queryKey: workspaceQueryKeys.files(workspaceId),
  });

export const workspaceFileQueryOptions = (workspaceId: string, path: string | null) =>
  queryOptions({
    enabled: path !== null,
    queryFn: ({ signal }) =>
      path ? readWorkspaceFile(workspaceId, path, signal) : Promise.reject(new Error("未选择文件")),
    queryKey: workspaceQueryKeys.file(workspaceId, path ?? "none"),
  });
