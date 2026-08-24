"use client";

import { ChatConversation } from "@agile-avocation/ui-pro";
import { HarnessEventType } from "@pi-harness/agent-runtime/harness-event";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { AgentTraceView } from "../../trace";
import {
  abortSessionRun,
  type Session,
  type SessionSnapshot,
  startSessionRun,
  updateSessionModel,
} from "../api/session-api";
import { sessionQueryKeys, sessionSnapshotQueryOptions } from "../api/session-queries";
import { ChatComposer } from "../components/chat-composer";
import { ThreadMessageList } from "../components/thread-message-list";
import { ChatPageView } from "../constants/chat-page-view";
import { useSessionEvents } from "../hooks/use-session-events";
import { useChatPageViewStore } from "../state/chat-page-view-store";
import {
  findActiveRunId,
  readSessionStatus,
  sessionEventsToMessages,
} from "../utils/session-messages";

const CHAT_VIEW_TRANSITION = {
  duration: 0.18,
  ease: [0.22, 1, 0.36, 1],
} as const;

export interface ChatPageProps {
  sessionId: string;
}

export function ChatPage({ sessionId }: ChatPageProps) {
  const queryClient = useQueryClient();
  const snapshotQuery = useQuery(sessionSnapshotQueryOptions(sessionId));
  const snapshot = snapshotQuery.data;
  useSessionEvents(sessionId, snapshot?.session.lastSeq ?? 0);
  const activeView = useChatPageViewStore((state) => state.activeView);
  const shouldReduceMotion = useReducedMotion();
  const transition = shouldReduceMotion ? { duration: 0 } : CHAT_VIEW_TRANSITION;
  const events = snapshot?.events ?? [];
  const messages = sessionEventsToMessages(events);

  const startMutation = useMutation({
    mutationFn: (prompt: string) => startSessionRun(sessionId, prompt),
  });
  const abortMutation = useMutation({
    mutationFn: (runId: string) => abortSessionRun(sessionId, runId),
  });
  const modelMutation = useMutation({
    mutationFn: ({ modelId, providerId }: { modelId: string; providerId: string }) =>
      updateSessionModel(sessionId, providerId, modelId),
    onSuccess: (session) => {
      queryClient.setQueryData<SessionSnapshot>(sessionQueryKeys.detail(sessionId), (current) =>
        current ? { ...current, session } : current,
      );
      queryClient.setQueryData<readonly Session[]>(sessionQueryKeys.list(), (sessions) =>
        sessions?.map((item) => (item.id === session.id ? session : item)),
      );
    },
  });

  if (!snapshot) return null;

  const acceptedRunId = startMutation.data?.runId;
  const isAcceptedRunFinished =
    acceptedRunId !== undefined &&
    events.some(
      (event) =>
        event.runId === acceptedRunId &&
        (event.type === HarnessEventType.RUN_ABORTED ||
          event.type === HarnessEventType.RUN_COMPLETED ||
          event.type === HarnessEventType.RUN_FAILED),
    );
  const acceptedRunIdWhileStarting = isAcceptedRunFinished ? null : (acceptedRunId ?? null);
  const activeRunId = findActiveRunId(events) ?? acceptedRunIdWhileStarting;
  const status =
    startMutation.isPending || (activeRunId && readSessionStatus(events) === "ready")
      ? "submitted"
      : readSessionStatus(events);

  return (
    <div className="flex h-[calc(100svh-var(--chat-navbar-height,64px))] flex-col overflow-hidden">
      <div className="min-h-0 flex-1 overflow-hidden">
        <AnimatePresence initial={false} mode="wait">
          <motion.div
            animate={{ opacity: 1, y: 0 }}
            className="h-full"
            exit={{ opacity: 0, y: -4 }}
            initial={{ opacity: 0, y: 4 }}
            key={activeView}
            transition={transition}
          >
            {activeView === ChatPageView.CONVERSATION ? (
              <ChatConversation className="h-full min-h-0">
                <ChatConversation.Content className="flex flex-col">
                  <ThreadMessageList messages={messages} />
                </ChatConversation.Content>
                <ChatConversation.ScrollButton aria-label="滚动到底部" />
                <ChatConversation.ScrollAnchor />
              </ChatConversation>
            ) : (
              <AgentTraceView />
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="relative z-10 shrink-0 bg-background px-4 pb-2">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 bottom-full h-16 bg-linear-to-b from-transparent to-background"
        />
        <div className="mx-auto w-full max-w-[714px]">
          <ChatComposer
            className="w-full"
            conversationId={snapshot.session.id}
            modelId={snapshot.session.modelId}
            providerId={snapshot.session.providerId}
            status={status}
            onModelChange={(selection) =>
              modelMutation.mutateAsync(selection).then(() => undefined)
            }
            onStopRun={() =>
              activeRunId
                ? abortMutation.mutateAsync(activeRunId)
                : Promise.reject(new Error("活动 Run 不存在"))
            }
            onSubmitMessage={(input) =>
              startMutation.mutateAsync(input.prompt).then(() => undefined)
            }
          />
        </div>
      </div>
    </div>
  );
}
