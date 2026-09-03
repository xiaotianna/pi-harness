import { queryOptions } from "@tanstack/react-query";
import {
  getSessionSnapshot,
  getSessionTraceSnapshot,
  listQueuedSessionRunInputs,
  listSessions,
  searchSessions,
} from "./session-api";

export const sessionQueryKeys = {
  all: ["sessions"] as const,
  archivedList: () => [...sessionQueryKeys.all, "archived-list"] as const,
  detail: (sessionId: string) => [...sessionQueryKeys.all, "detail", sessionId] as const,
  list: () => [...sessionQueryKeys.all, "list"] as const,
  queuedInputs: (sessionId: string, runId: string) =>
    [...sessionQueryKeys.all, "queued-inputs", sessionId, runId] as const,
  search: (query: string) => [...sessionQueryKeys.all, "search", query] as const,
  trace: (sessionId: string) => [...sessionQueryKeys.all, "trace", sessionId] as const,
};

export const sessionListQueryOptions = () =>
  queryOptions({
    queryFn: ({ signal }) => listSessions(false, signal),
    queryKey: sessionQueryKeys.list(),
  });

export const archivedSessionListQueryOptions = () =>
  queryOptions({
    queryFn: ({ signal }) => listSessions(true, signal),
    queryKey: sessionQueryKeys.archivedList(),
  });

export const sessionSnapshotQueryOptions = (sessionId: string) =>
  queryOptions({
    queryFn: ({ signal }) => getSessionSnapshot(sessionId, signal),
    queryKey: sessionQueryKeys.detail(sessionId),
    staleTime: Number.POSITIVE_INFINITY,
  });

export const sessionTraceSnapshotQueryOptions = (sessionId: string) =>
  queryOptions({
    queryFn: ({ signal }) => getSessionTraceSnapshot(sessionId, signal),
    queryKey: sessionQueryKeys.trace(sessionId),
    staleTime: Number.POSITIVE_INFINITY,
  });

export const queuedSessionRunInputsQueryOptions = (sessionId: string, runId: string) =>
  queryOptions({
    queryFn: ({ signal }) => listQueuedSessionRunInputs(sessionId, runId, signal),
    queryKey: sessionQueryKeys.queuedInputs(sessionId, runId),
  });

export const sessionSearchQueryOptions = (query: string) =>
  queryOptions({
    queryFn: ({ signal }) => searchSessions(query, signal),
    queryKey: sessionQueryKeys.search(query),
  });
