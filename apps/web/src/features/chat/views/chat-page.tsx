"use client";

import { ChatConversation, ChatMessage as ChatMessagePrimitive } from "@agile-avocation/ui-pro";
import { Skeleton } from "@heroui/react";
import type { ApprovalResponseDecision } from "@pi-harness/agent-runtime/harness-event";
import {
  HarnessEventType,
  selectActiveSessionEvents,
} from "@pi-harness/agent-runtime/harness-event";
import type { ThinkingLevel } from "@pi-harness/agent-runtime/thinking-level";
import type { RunUserInput } from "@pi-harness/agent-runtime/user-input";
import { BusySubmitBehavior, type QueuedRunInput } from "@pi-harness/agent-runtime/user-input";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { AgentTraceView } from "../../trace";
import {
  abortSessionRun,
  followUpSessionRun,
  removeQueuedSessionRunInput,
  resolveToolApproval,
  retrySessionUserMessage,
  type Session,
  type SessionSnapshot,
  startSessionRun,
  steerQueuedSessionRunInput,
  steerSessionRun,
  updateQueuedSessionRunInput,
  updateSessionModel,
} from "../api/session-api";
import {
  queuedSessionRunInputsQueryOptions,
  sessionQueryKeys,
  sessionSnapshotQueryOptions,
} from "../api/session-queries";
import { ChatComposer } from "../components/chat-composer";
import { ConversationTurnToc } from "../components/conversation-turn-toc";
import { ThreadMessageList, type ThreadMessageListHandle } from "../components/thread-message-list";
import { ToolApprovalCard } from "../components/tool-approval-card";
import { WorkingStatePanel } from "../components/working-state-panel";
import { ChatPageView } from "../constants/chat-page-view";
import { ChatMessageType } from "../data/chat";
import { useSessionEvents } from "../hooks/use-session-events";
import { useChatPageViewStore } from "../state/chat-page-view-store";
import { useChatSearchTargetStore } from "../state/chat-search-target-store";
import { findActiveRunId, sessionEventsToMessages } from "../utils/session-messages";
import { summarizeSessionUsage } from "../utils/session-usage";
import { readSessionWorkingState } from "../utils/session-working-state";

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
      className={`relative z-30 flex h-[calc(100svh-var(--chat-navbar-height,64px))] flex-col overflow-hidden bg-background ${
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
  useSessionEvents(sessionId, snapshot?.session.lastSeq ?? 0, true);
  const activeView = useChatPageViewStore((state) => state.activeView);
  const clearSearchTarget = useChatSearchTargetStore((state) => state.clearTarget);
  const searchTarget = useChatSearchTargetStore((state) =>
    state.target?.sessionId === sessionId ? state.target : null,
  );
  const shouldReduceMotion = useReducedMotion();
  const transition = shouldReduceMotion ? { duration: 0 } : CHAT_VIEW_TRANSITION;
  const events = snapshot?.events ?? EMPTY_SESSION_EVENTS;
  const activeEvents = useMemo(() => selectActiveSessionEvents(events), [events]);
  const messages = useMemo(() => sessionEventsToMessages(events), [events]);
  const usage = useMemo(() => summarizeSessionUsage(activeEvents), [activeEvents]);
  const workingState = useMemo(() => readSessionWorkingState(activeEvents), [activeEvents]);
  const eventActiveRunId = useMemo(() => findActiveRunId(activeEvents), [activeEvents]);
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
  const [conversationElement, setConversationElement] = useState<HTMLDivElement | null>(null);
  const conversationContentRef = useRef<HTMLDivElement>(null);
  const messageListRef = useRef<ThreadMessageListHandle>(null);
  const shouldFollowConversationRef = useRef(true);
  const [positionedSessionId, setPositionedSessionId] = useState<string | null>(null);
  const [acceptedRunId, setAcceptedRunId] = useState<string | null>(null);
  const isPageReady =
    activeView !== ChatPageView.CONVERSATION ||
    searchTarget !== null ||
    positionedSessionId === sessionId;
  const stopFollowingConversation = useCallback(() => {
    shouldFollowConversationRef.current = false;
  }, []);
  const handleConversationRef = useCallback((element: HTMLDivElement | null) => {
    conversationRef.current = element;
    setConversationElement(element);
  }, []);

  useLayoutEffect(() => {
    if (!isSnapshotReady || activeView !== ChatPageView.CONVERSATION) return;
    const conversation = conversationElement;
    const content = conversationContentRef.current;
    if (!conversation || !content) return;

    shouldFollowConversationRef.current = true;
    let frameId = 0;
    let observer: ResizeObserver | undefined;
    const positionAtEnd = () => {
      if (!shouldFollowConversationRef.current) return;
      messageListRef.current?.scrollToEnd();
      conversation.scrollTop = conversation.scrollHeight;
      window.cancelAnimationFrame(frameId);
      frameId = window.requestAnimationFrame(() => {
        messageListRef.current?.scrollToEnd();
        conversation.scrollTop = conversation.scrollHeight;
        const isAtBottom =
          conversation.scrollHeight - conversation.scrollTop - conversation.clientHeight <= 1;
        if (isAtBottom) {
          setPositionedSessionId(sessionId);
          observer?.disconnect();
        }
      });
    };

    positionAtEnd();
    observer = new ResizeObserver(positionAtEnd);
    observer.observe(content);
    return () => {
      observer?.disconnect();
      window.cancelAnimationFrame(frameId);
    };
  }, [activeView, conversationElement, isSnapshotReady, sessionId]);

  const startMutation = useMutation({
    mutationFn: (input: RunUserInput) => startSessionRun(sessionId, input),
    onError: () => {
      void queryClient.invalidateQueries({ queryKey: sessionQueryKeys.list() });
    },
    onMutate: () => {
      setAcceptedRunId(null);
      queryClient.setQueryData<readonly Session[]>(sessionQueryKeys.list(), (sessions) =>
        sessions?.map((session) =>
          session.id === sessionId ? { ...session, isRunning: true } : session,
        ),
      );
    },
    onSuccess: (accepted) => setAcceptedRunId(accepted.runId),
  });
  const abortMutation = useMutation({
    mutationFn: (runId: string) => abortSessionRun(sessionId, runId),
  });
  const retryMutation = useMutation({
    mutationFn: ({ messageEventId, prompt }: { messageEventId: string; prompt: string }) =>
      retrySessionUserMessage(sessionId, messageEventId, prompt),
    onError: () => {
      void queryClient.invalidateQueries({ queryKey: sessionQueryKeys.list() });
    },
    onMutate: () => {
      setAcceptedRunId(null);
      queryClient.setQueryData<readonly Session[]>(sessionQueryKeys.list(), (sessions) =>
        sessions?.map((session) =>
          session.id === sessionId ? { ...session, isRunning: true } : session,
        ),
      );
    },
    onSuccess: (accepted) => setAcceptedRunId(accepted.runId),
  });
  const followUpMutation = useMutation({
    mutationFn: ({ input, runId }: { input: RunUserInput; runId: string }) =>
      followUpSessionRun(sessionId, runId, input),
    onSuccess: (_, { runId }) =>
      queryClient.invalidateQueries({
        queryKey: sessionQueryKeys.queuedInputs(sessionId, runId),
      }),
  });
  const steerMutation = useMutation({
    mutationFn: ({ input, runId }: { input: RunUserInput; runId: string }) =>
      steerSessionRun(sessionId, runId, input),
  });
  const updateQueuedInputMutation = useMutation({
    mutationFn: ({
      prompt,
      queuedInputId,
      runId,
    }: {
      prompt: string;
      queuedInputId: string;
      runId: string;
    }) => updateQueuedSessionRunInput(sessionId, runId, queuedInputId, prompt),
    onSuccess: (updated, { runId }) => {
      queryClient.setQueryData<readonly QueuedRunInput[]>(
        sessionQueryKeys.queuedInputs(sessionId, runId),
        (items) => items?.map((item) => (item.id === updated.id ? updated : item)),
      );
    },
  });
  const removeQueuedInputMutation = useMutation({
    mutationFn: ({ queuedInputId, runId }: { queuedInputId: string; runId: string }) =>
      removeQueuedSessionRunInput(sessionId, runId, queuedInputId),
    onSuccess: (_, { queuedInputId, runId }) => {
      queryClient.setQueryData<readonly QueuedRunInput[]>(
        sessionQueryKeys.queuedInputs(sessionId, runId),
        (items) => items?.filter((item) => item.id !== queuedInputId),
      );
    },
  });
  const steerQueuedInputMutation = useMutation({
    mutationFn: ({ queuedInputId, runId }: { queuedInputId: string; runId: string }) =>
      steerQueuedSessionRunInput(sessionId, runId, queuedInputId),
    onSuccess: (_, { queuedInputId, runId }) => {
      queryClient.setQueryData<readonly QueuedRunInput[]>(
        sessionQueryKeys.queuedInputs(sessionId, runId),
        (items) => items?.filter((item) => item.id !== queuedInputId),
      );
    },
  });
  const cacheSession = (session: Session) => {
    queryClient.setQueryData<SessionSnapshot>(sessionQueryKeys.detail(sessionId), (current) =>
      current ? { ...current, session } : current,
    );
    queryClient.setQueryData<readonly Session[]>(sessionQueryKeys.list(), (sessions) =>
      sessions?.map((item) =>
        item.id === session.id
          ? { ...session, ...(item.isRunning === undefined ? {} : { isRunning: item.isRunning }) }
          : item,
      ),
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
  const acceptedRunIdWhileStarting = isAcceptedRunFinished ? null : acceptedRunId;
  const activeRunId = eventActiveRunId ?? acceptedRunIdWhileStarting;
  const queuedInputsQuery = useQuery({
    ...queuedSessionRunInputsQueryOptions(sessionId, activeRunId ?? "inactive"),
    enabled: activeRunId !== null,
  });
  const status =
    startMutation.isPending || retryMutation.isPending || (activeRunId && eventActiveRunId === null)
      ? "submitted"
      : eventActiveRunId === null
        ? "ready"
        : "streaming";
  const isSessionRunning = status !== "ready";

  useEffect(() => {
    if (!isSnapshotReady) return;
    queryClient.setQueryData<readonly Session[]>(sessionQueryKeys.list(), (sessions) =>
      sessions?.map((session) =>
        session.id === sessionId && session.isRunning !== isSessionRunning
          ? { ...session, isRunning: isSessionRunning }
          : session,
      ),
    );
  }, [isSessionRunning, isSnapshotReady, queryClient, sessionId]);

  if (snapshotQuery.isPending) {
    return <ChatPageSkeleton />;
  }

  if (!snapshot) return null;

  return (
    <div className="session-scrollbars relative h-[calc(100svh-var(--chat-navbar-height,64px))] overflow-hidden">
      <div aria-hidden={!isPageReady} className="flex h-full flex-col" inert={!isPageReady}>
        <div className="@container/conversation relative min-h-0 flex-1 overflow-hidden">
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
                  ref={handleConversationRef}
                  className="session-scrollbar h-full min-h-0"
                  initial="instant"
                  resize="instant"
                  onPointerDown={(event) => {
                    if (event.target === event.currentTarget) stopFollowingConversation();
                  }}
                  onScroll={(event) => {
                    const conversation = event.currentTarget;
                    const isNearBottom =
                      conversation.scrollHeight -
                        conversation.scrollTop -
                        conversation.clientHeight <=
                      CHAT_AUTO_SCROLL_THRESHOLD_PX;
                    if (isNearBottom) shouldFollowConversationRef.current = true;
                  }}
                  onTouchMove={stopFollowingConversation}
                  onWheel={(event) => {
                    if (event.deltaY < 0) stopFollowingConversation();
                  }}
                >
                  <div ref={conversationContentRef} className="mx-auto flex w-full flex-col">
                    <ThreadMessageList
                      ref={messageListRef}
                      messages={messages}
                      onBeforeMessageEdit={stopFollowingConversation}
                      onBeforeTurnNavigate={stopFollowingConversation}
                      onSearchTargetComplete={clearSearchTarget}
                      scrollContainerRef={conversationRef}
                      workspaceId={snapshot.session.workspaceId}
                      workspaceRoot={snapshot.session.workspaceRoot}
                      {...(isSessionRunning
                        ? {}
                        : {
                            onRetryUserMessage: (messageEventId: string, prompt: string) =>
                              retryMutation
                                .mutateAsync({ messageEventId, prompt })
                                .then(() => undefined),
                          })}
                      {...(searchTarget ? { searchTarget } : {})}
                    />
                  </div>
                  <ChatConversation.ScrollButton aria-label="滚动到底部" />
                  <ChatConversation.ScrollAnchor />
                </ChatConversation>
              ) : (
                <AgentTraceView events={events} />
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
            <WorkingStatePanel
              plan={workingState.plan}
              todoRevision={workingState.todoRevision}
              todos={workingState.todos}
            />
            <div className="relative z-10">
              <div inert={pendingApproval !== undefined}>
                <ChatComposer
                  className="w-full"
                  conversationId={snapshot.session.id}
                  events={events}
                  modelId={snapshot.session.modelId}
                  providerId={snapshot.session.providerId}
                  queuedInputs={queuedInputsQuery.data ?? []}
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
                  onRemoveQueuedInput={(queuedInputId) =>
                    activeRunId
                      ? removeQueuedInputMutation.mutateAsync({ queuedInputId, runId: activeRunId })
                      : Promise.reject(new Error("活动 Run 不存在"))
                  }
                  onSteerQueuedInput={(queuedInputId) =>
                    activeRunId
                      ? steerQueuedInputMutation.mutateAsync({ queuedInputId, runId: activeRunId })
                      : Promise.reject(new Error("活动 Run 不存在"))
                  }
                  onSubmitMessage={({ busySubmitBehavior, ...input }) => {
                    if (!activeRunId) {
                      return startMutation.mutateAsync(input).then(() => undefined);
                    }
                    return busySubmitBehavior === BusySubmitBehavior.STEER
                      ? steerMutation.mutateAsync({ input, runId: activeRunId })
                      : followUpMutation
                          .mutateAsync({ input, runId: activeRunId })
                          .then(() => undefined);
                  }}
                  onUpdateQueuedInput={(queuedInputId, prompt) =>
                    activeRunId
                      ? updateQueuedInputMutation
                          .mutateAsync({
                            prompt,
                            queuedInputId,
                            runId: activeRunId,
                          })
                          .then(() => undefined)
                      : Promise.reject(new Error("活动 Run 不存在"))
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
      {isPageReady ? null : (
        <div className="absolute inset-0 z-30 bg-background">
          <ChatPageSkeleton />
        </div>
      )}
    </div>
  );
}
