import { queryOptions } from "@tanstack/react-query";
import {
  getSessionEvent,
  getSessionRunFileChanges,
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
  fileChanges: (sessionId: string, runId: string, includeContent: boolean, version: number) =>
    [...sessionQueryKeys.all, "file-changes", sessionId, runId, includeContent, version] as const,
  event: (sessionId: string, eventSeq: number) =>
    [...sessionQueryKeys.all, "event", sessionId, eventSeq] as const,
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
    gcTime: 60_000,
    structuralSharing: false,
    queryFn: ({ signal }) => getSessionSnapshot(sessionId, signal),
    queryKey: sessionQueryKeys.detail(sessionId),
    staleTime: Number.POSITIVE_INFINITY,
  });

export const sessionTraceSnapshotQueryOptions = (sessionId: string) =>
  queryOptions({
    gcTime: 0,
    structuralSharing: false,
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

export const sessionFileChangesQueryOptions = (
  sessionId: string | undefined,
  runId: string,
  includeContent: boolean,
  version: number,
) =>
  queryOptions({
    queryKey: sessionQueryKeys.fileChanges(sessionId ?? "", runId, includeContent, version),
    enabled: sessionId !== undefined,
    gcTime: includeContent ? 0 : 60_000,
    staleTime: Infinity,
    queryFn: ({ signal }) => {
      if (!sessionId) throw new Error("无法确定文件所属会话");
      return getSessionRunFileChanges(sessionId, runId, includeContent, signal);
    },
  });

export const sessionEventQueryOptions = (source: { sessionId: string; seq: number } | undefined) =>
  queryOptions({
    queryKey: sessionQueryKeys.event(source?.sessionId ?? "", source?.seq ?? 0),
    enabled: source !== undefined,
    gcTime: 0,
    staleTime: Infinity,
    queryFn: ({ signal }) => {
      if (!source) throw new Error("无法确定工具结果所属会话");
      return getSessionEvent(source.sessionId, source.seq, signal);
    },
  });
