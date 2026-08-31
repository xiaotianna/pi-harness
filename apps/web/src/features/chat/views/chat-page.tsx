"use client";

import { ChatConversation, ChatMessage as ChatMessagePrimitive } from "@agile-avocation/ui-pro";
import { Skeleton } from "@heroui/react";
import type { ApprovalResponseDecision } from "@pi-harness/agent-runtime/harness-event";
import { HarnessEventType } from "@pi-harness/agent-runtime/harness-event";
import type { ThinkingLevel } from "@pi-harness/agent-runtime/thinking-level";
import type { RunUserInput } from "@pi-harness/agent-runtime/user-input";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useCallback, useLayoutEffect, useMemo, useRef } from "react";
import { AgentTraceView } from "../../trace";
import {
  abortSessionRun,
  followUpSessionRun,
  resolveToolApproval,
  type Session,
  type SessionSnapshot,
  startSessionRun,
  updateSessionModel,
} from "../api/session-api";
import { sessionQueryKeys, sessionSnapshotQueryOptions } from "../api/session-queries";
import { ChatComposer } from "../components/chat-composer";
import { ConversationTurnToc } from "../components/conversation-turn-toc";
import { ThreadMessageList, type ThreadMessageListHandle } from "../components/thread-message-list";
import { ToolApprovalCard } from "../components/tool-approval-card";
import { ChatPageView } from "../constants/chat-page-view";
import { ChatMessageType } from "../data/chat";
import { useSessionEvents } from "../hooks/use-session-events";
import { useChatPageViewStore } from "../state/chat-page-view-store";
import { findActiveRunId, sessionEventsToMessages } from "../utils/session-messages";
import { summarizeSessionUsage } from "../utils/session-usage";

const CHAT_VIEW_TRANSITION = {
  duration: 0.18,
  ease: [0.22, 1, 0.36, 1],
} as const;
const CHAT_AUTO_SCROLL_THRESHOLD_PX = 96;
const EMPTY_SESSION_EVENTS = [] as const;

export interface ChatPageProps {
  sessionId: string;
}

export function ChatPageSkeleton() {
  const shouldReduceMotion = useReducedMotion();

  return (
    <div
      aria-busy
      className={`relative flex h-[calc(100svh-var(--chat-navbar-height,64px))] flex-col overflow-hidden ${
        shouldReduceMotion ? "" : "skeleton--shimmer"
      }`}
      role="status"
    >
      <span className="sr-only">正在加载会话</span>
      <div className="min-h-0 flex-1 overflow-hidden">
        <div className="mx-auto flex w-full max-w-[714px] flex-col gap-2 px-4 pt-10 pb-12">
          <ChatMessagePrimitive.User>
            <ChatMessagePrimitive.Bubble className="w-[min(72%,26rem)]">
              <ChatMessagePrimitive.Content>
                <Skeleton animationType="none" aria-hidden className="h-4 w-full rounded-full" />
              </ChatMessagePrimitive.Content>
            </ChatMessagePrimitive.Bubble>
          </ChatMessagePrimitive.User>

          <div className="mt-6">
            <ChatMessagePrimitive.Assistant>
              <ChatMessagePrimitive.Body>
                <ChatMessagePrimitive.Content className="flex flex-col gap-3 py-1">
                  <Skeleton animationType="none" aria-hidden className="h-4 w-full rounded-full" />
                  <Skeleton animationType="none" aria-hidden className="h-4 w-[82%] rounded-full" />
                  <Skeleton animationType="none" aria-hidden className="h-4 w-[58%] rounded-full" />
                </ChatMessagePrimitive.Content>
              </ChatMessagePrimitive.Body>
            </ChatMessagePrimitive.Assistant>
          </div>
        </div>
      </div>

      <div className="relative z-10 shrink-0 bg-background px-4 pb-2">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 bottom-full h-16 bg-linear-to-b from-transparent to-background"
        />
        <div className="mx-auto w-full max-w-[714px]">
          <div className="flex min-h-[120px] flex-col justify-between rounded-[32px] bg-field p-4 shadow-field">
            <Skeleton animationType="none" aria-hidden className="h-4 w-44 rounded-full" />
            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-2">
                <Skeleton animationType="none" aria-hidden className="size-8 rounded-full" />
                <Skeleton
                  animationType="none"
                  aria-hidden
                  className="h-8 w-24 rounded-full sm:w-32"
                />
                <Skeleton
                  animationType="none"
                  aria-hidden
                  className="hidden h-8 w-36 rounded-full sm:block"
                />
              </div>
              <Skeleton animationType="none" aria-hidden className="size-8 shrink-0 rounded-full" />
            </div>
          </div>
          <Skeleton
            animationType="none"
            aria-hidden
            className="mx-auto mt-3 h-3 w-48 rounded-full"
          />
        </div>
      </div>
    </div>
  );
}

export function ChatPage({ sessionId }: ChatPageProps) {
  const queryClient = useQueryClient();
  const snapshotQuery = useQuery(sessionSnapshotQueryOptions(sessionId));
  const snapshot = snapshotQuery.data;
  const isSnapshotReady = snapshot !== undefined;
  useSessionEvents(sessionId, snapshot?.session.lastSeq ?? 0);
  const activeView = useChatPageViewStore((state) => state.activeView);
  const shouldReduceMotion = useReducedMotion();
  const transition = shouldReduceMotion ? { duration: 0 } : CHAT_VIEW_TRANSITION;
  const events = snapshot?.events ?? EMPTY_SESSION_EVENTS;
  const messages = useMemo(() => sessionEventsToMessages(events), [events]);
  const usage = useMemo(() => summarizeSessionUsage(events), [events]);
  const eventActiveRunId = useMemo(() => findActiveRunId(events), [events]);
  const pendingApprovalTool = useMemo(() => {
    for (let index = messages.length - 1; index >= 0; index -= 1) {
      const message = messages[index];
      const tool =
        message?.type === ChatMessageType.TOOL
          ? message.tool
          : message?.type === ChatMessageType.TOOL_GROUP
            ? message.tools.findLast((item) => item.approval !== undefined)
            : undefined;
      if (tool?.approval) return tool;
    }
    return undefined;
  }, [messages]);
  const pendingApproval = pendingApprovalTool?.approval;
  const conversationRef = useRef<HTMLDivElement>(null);
  const conversationContentRef = useRef<HTMLDivElement>(null);
  const messageListRef = useRef<ThreadMessageListHandle>(null);
  const shouldFollowConversationRef = useRef(true);
  const stopFollowingConversation = useCallback(() => {
    shouldFollowConversationRef.current = false;
  }, []);

  useLayoutEffect(() => {
    if (!isSnapshotReady || activeView !== ChatPageView.CONVERSATION) return;
    const conversation = conversationRef.current;
    const content = conversationContentRef.current;
    if (!conversation || !content) return;

    shouldFollowConversationRef.current = true;
    conversation.scrollTop = conversation.scrollHeight;

    const observer = new ResizeObserver(() => {
      if (shouldFollowConversationRef.current) {
        conversation.scrollTop = conversation.scrollHeight;
      }
    });
    observer.observe(content);
    return () => observer.disconnect();
  }, [activeView, isSnapshotReady, sessionId]);

  const startMutation = useMutation({
    mutationFn: (input: RunUserInput) => startSessionRun(sessionId, input),
  });
  const abortMutation = useMutation({
    mutationFn: (runId: string) => abortSessionRun(sessionId, runId),
  });
  const followUpMutation = useMutation({
    mutationFn: ({ input, runId }: { input: RunUserInput; runId: string }) =>
      followUpSessionRun(sessionId, runId, input),
  });
  const cacheSession = (session: Session) => {
    queryClient.setQueryData<SessionSnapshot>(sessionQueryKeys.detail(sessionId), (current) =>
      current ? { ...current, session } : current,
    );
    queryClient.setQueryData<readonly Session[]>(sessionQueryKeys.list(), (sessions) =>
      sessions?.map((item) => (item.id === session.id ? session : item)),
    );
  };
  const modelMutation = useMutation({
    mutationFn: ({
      modelId,
      providerId,
      thinkingLevel,
    }: {
      modelId: string;
      providerId: string;
      thinkingLevel: ThinkingLevel;
    }) => updateSessionModel(sessionId, providerId, modelId, thinkingLevel),
    onSuccess: cacheSession,
  });
  const approvalMutation = useMutation({
    mutationFn: ({
      approvalId,
      decision,
      runId,
    }: {
      approvalId: string;
      decision: ApprovalResponseDecision;
      runId: string;
    }) => resolveToolApproval(sessionId, runId, approvalId, decision),
  });

  const acceptedRunId = startMutation.data?.runId;
  const isAcceptedRunFinished = useMemo(
    () =>
      acceptedRunId !== undefined &&
      events.some(
        (event) =>
          event.runId === acceptedRunId &&
          (event.type === HarnessEventType.RUN_ABORTED ||
            event.type === HarnessEventType.RUN_COMPLETED ||
            event.type === HarnessEventType.RUN_FAILED),
      ),
    [acceptedRunId, events],
  );
  const acceptedRunIdWhileStarting = isAcceptedRunFinished ? null : (acceptedRunId ?? null);
  const activeRunId = eventActiveRunId ?? acceptedRunIdWhileStarting;
  const status =
    startMutation.isPending || (activeRunId && eventActiveRunId === null)
      ? "submitted"
      : eventActiveRunId === null
        ? "ready"
        : "streaming";

  if (snapshotQuery.isPending) {
    return <ChatPageSkeleton />;
  }

  if (!snapshot) return null;

  return (
    <div className="session-scrollbars flex h-[calc(100svh-var(--chat-navbar-height,64px))] flex-col overflow-hidden">
      <div className="relative min-h-0 flex-1 overflow-hidden">
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
              <ChatConversation
                ref={conversationRef}
                className="session-scrollbar h-full min-h-0"
                initial="instant"
                resize="instant"
                onScroll={(event) => {
                  const conversation = event.currentTarget;
                  shouldFollowConversationRef.current =
                    conversation.scrollHeight -
                      conversation.scrollTop -
                      conversation.clientHeight <=
                    CHAT_AUTO_SCROLL_THRESHOLD_PX;
                }}
              >
                <ChatConversation.Content ref={conversationContentRef} className="flex flex-col">
                  <ThreadMessageList
                    ref={messageListRef}
                    messages={messages}
                    onBeforeTurnNavigate={stopFollowingConversation}
                    scrollContainerRef={conversationRef}
                    workspaceId={snapshot.session.workspaceId}
                    workspaceRoot={snapshot.session.workspaceRoot}
                  />
                </ChatConversation.Content>
                <ChatConversation.ScrollButton aria-label="滚动到底部" />
                <ChatConversation.ScrollAnchor />
              </ChatConversation>
            ) : (
              <AgentTraceView />
            )}
          </motion.div>
        </AnimatePresence>
        {activeView === ChatPageView.CONVERSATION ? (
          <ConversationTurnToc
            messageListRef={messageListRef}
            messages={messages}
            scrollContainerRef={conversationRef}
          />
        ) : null}
      </div>

      <div className="relative z-10 shrink-0 bg-background px-4 pb-2">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 bottom-full h-16 bg-linear-to-b from-transparent to-background"
        />
        <div className="mx-auto w-full max-w-[714px]">
          <div className="relative">
            <div inert={pendingApproval !== undefined}>
              <ChatComposer
                className="w-full"
                conversationId={snapshot.session.id}
                events={events}
                modelId={snapshot.session.modelId}
                providerId={snapshot.session.providerId}
                status={status}
                thinkingLevel={snapshot.session.thinkingLevel}
                usage={usage}
                workspaceId={snapshot.session.workspaceId}
                onModelChange={(selection) =>
                  modelMutation.mutateAsync(selection).then(() => undefined)
                }
                onStopRun={() =>
                  activeRunId
                    ? abortMutation.mutateAsync(activeRunId)
                    : Promise.reject(new Error("活动 Run 不存在"))
                }
                onSubmitMessage={(input) =>
                  activeRunId
                    ? followUpMutation.mutateAsync({ input, runId: activeRunId })
                    : startMutation.mutateAsync(input).then(() => undefined)
                }
              />
            </div>
            <AnimatePresence initial={false}>
              {pendingApproval && pendingApprovalTool ? (
                <motion.div
                  animate={{ opacity: 1, y: 0 }}
                  className="absolute inset-x-0 bottom-0 z-20 min-h-full"
                  exit={{ opacity: 0, y: 4 }}
                  initial={{ opacity: 0, y: 4 }}
                  transition={transition}
                >
                  <ToolApprovalCard
                    key={pendingApproval.approvalId}
                    approval={pendingApproval}
                    toolName={pendingApprovalTool.toolName}
                    onResolve={(approval, decision) =>
                      approvalMutation.mutateAsync({
                        approvalId: approval.approvalId,
                        decision,
                        runId: approval.runId,
                      })
                    }
                  />
                </motion.div>
              ) : null}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}
