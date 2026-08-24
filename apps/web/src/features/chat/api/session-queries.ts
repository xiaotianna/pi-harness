import { queryOptions } from "@tanstack/react-query";
import { getSessionSnapshot, listSessions } from "./session-api";

export const sessionQueryKeys = {
  all: ["sessions"] as const,
  detail: (sessionId: string) => [...sessionQueryKeys.all, "detail", sessionId] as const,
  list: () => [...sessionQueryKeys.all, "list"] as const,
};

export const sessionListQueryOptions = () =>
  queryOptions({
    queryFn: ({ signal }) => listSessions(signal),
    queryKey: sessionQueryKeys.list(),
  });

export const sessionSnapshotQueryOptions = (sessionId: string) =>
  queryOptions({
    queryFn: ({ signal }) => getSessionSnapshot(sessionId, signal),
    queryKey: sessionQueryKeys.detail(sessionId),
  });
