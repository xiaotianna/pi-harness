import { Skeleton } from "@heroui/react";
import { useQuery } from "@tanstack/react-query";
import { useReducedMotion } from "motion/react";
import { AgentTraceView } from "../../trace";
import { sessionTraceSnapshotQueryOptions } from "../api/session-queries";
import { useSessionEvents } from "../hooks/use-session-events";
import { selectSessionEvents } from "../utils/session-snapshot";

function ChatTraceSkeleton() {
  const shouldReduceMotion = useReducedMotion();

  return (
    <div
      aria-busy
      className={`relative flex h-full min-h-0 flex-col overflow-hidden bg-background px-4 md:pr-6 md:pl-10 ${
        shouldReduceMotion ? "" : "skeleton--shimmer"
      }`}
      role="status"
    >
      <span className="sr-only">正在加载轨迹</span>
      <div className="flex shrink-0 flex-col gap-2 border-b border-separator py-2 sm:flex-row sm:items-center sm:py-1">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <Skeleton animationType="none" aria-hidden className="h-3 w-14 rounded-full" />
          <Skeleton animationType="none" aria-hidden className="h-3 w-10 rounded-full" />
          <Skeleton animationType="none" aria-hidden className="h-3 w-16 rounded-full" />
          <Skeleton animationType="none" aria-hidden className="h-3 w-12 rounded-full" />
        </div>
        <Skeleton
          animationType="none"
          aria-hidden
          className="h-7 w-full rounded-lg sm:min-w-40 sm:max-w-56 sm:flex-1"
        />
      </div>

      <div className="grid h-[50px] shrink-0 grid-cols-[40px_minmax(0,1fr)] items-center border-b border-separator">
        <div className="grid h-9 grid-rows-3 gap-y-1.5 pr-2">
          {Array.from({ length: 3 }, (_, index) => (
            <Skeleton
              animationType="none"
              aria-hidden
              className="ml-auto h-2 w-5 rounded-full"
              key={index}
            />
          ))}
        </div>
        <div className="grid h-9 grid-rows-3 gap-y-1.5">
          {Array.from({ length: 3 }, (_, index) => (
            <Skeleton animationType="none" aria-hidden className="h-2 rounded-[1px]" key={index} />
          ))}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-hidden">
        {Array.from({ length: 10 }, (_, index) => (
          <div
            aria-hidden
            className="flex h-[30px] items-center border-b border-separator/70"
            key={index}
          >
            <span className="w-10 shrink-0" />
            <Skeleton animationType="none" className="h-4 w-20 shrink-0 rounded-full" />
            <Skeleton
              animationType="none"
              className={`ml-2 h-3 rounded-full ${index % 3 === 0 ? "w-56" : "w-40"}`}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

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
  if (!query.data) return <ChatTraceSkeleton />;
  return <AgentTraceView events={selectSessionEvents(query.data)} />;
}
