import { Spinner } from "@heroui/react";
import { useQuery } from "@tanstack/react-query";
import { AgentTraceView } from "../../trace";
import { sessionTraceSnapshotQueryOptions } from "../api/session-queries";
import { useSessionEvents } from "../hooks/use-session-events";
import { selectSessionEvents } from "../utils/session-snapshot";

export function ChatTraceView({ sessionId }: { sessionId: string }) {
  const query = useQuery(sessionTraceSnapshotQueryOptions(sessionId));
  useSessionEvents(
    sessionId,
    query.data?.session.lastSeq ?? 0,
    true,
    true,
    query.data !== undefined,
  );
  if (query.isError) throw query.error;
  if (!query.data) return <Spinner aria-label="正在加载 Trace" />;
  return <AgentTraceView events={selectSessionEvents(query.data)} />;
}
