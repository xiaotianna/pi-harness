"use client";

import { ChatConversation, ChatLoader } from "@agile-avocation/ui-pro";
import type { ApprovalResponseDecision } from "@pi-harness/agent-runtime/harness-event";
import { HarnessEventType } from "@pi-harness/agent-runtime/harness-event";
import type { ThinkingLevel } from "@pi-harness/agent-runtime/thinking-level";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useLayoutEffect, useRef } from "react";
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
import { ThreadMessageList } from "../components/thread-message-list";
import { ToolApprovalCard } from "../components/tool-approval-card";
import { ChatPageView } from "../constants/chat-page-view";
import { ChatMessageType } from "../data/chat";
import { useSessionEvents } from "../hooks/use-session-events";
import { useChatPageViewStore } from "../state/chat-page-view-store";
import {
  findActiveRunId,
  readSessionStatus,
  sessionEventsToMessages,
} from "../utils/session-messages";
import { summarizeSessionUsage } from "../utils/session-usage";

const CHAT_VIEW_TRANSITION = {
  duration: 0.18,
  ease: [0.22, 1, 0.36, 1],
} as const;
const CHAT_AUTO_SCROLL_THRESHOLD_PX = 96;

export interface ChatPageProps {
  sessionId: string;
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
  const events = snapshot?.events ?? [];
  const messages = sessionEventsToMessages(events);
  const usage = summarizeSessionUsage(events);
  const pendingApprovalTool = messages
    .flatMap((message) =>
      message.type === ChatMessageType.TOOL
        ? [message.tool]
        : message.type === ChatMessageType.TOOL_GROUP
          ? message.tools
          : [],
    )
    .findLast((tool) => tool.approval !== undefined);
  const pendingApproval = pendingApprovalTool?.approval;
  const conversationRef = useRef<HTMLDivElement>(null);
  const conversationContentRef = useRef<HTMLDivElement>(null);
  const shouldFollowConversationRef = useRef(true);

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
    mutationFn: (prompt: string) => startSessionRun(sessionId, prompt),
  });
  const abortMutation = useMutation({
    mutationFn: (runId: string) => abortSessionRun(sessionId, runId),
  });
  const followUpMutation = useMutation({
    mutationFn: ({ prompt, runId }: { prompt: string; runId: string }) =>
      followUpSessionRun(sessionId, runId, prompt),
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

  if (snapshotQuery.isPending) {
    return (
      <div className="h-[calc(100svh-var(--chat-navbar-height,64px))] overflow-hidden px-4 pt-8">
        <ChatLoader.Skeleton className="mx-auto w-full max-w-[714px]" label="正在加载会话" />
      </div>
    );
  }

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
                    messages={messages}
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
          <ConversationTurnToc messages={messages} scrollContainerRef={conversationRef} />
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
                modelId={snapshot.session.modelId}
                providerId={snapshot.session.providerId}
                status={status}
                thinkingLevel={snapshot.session.thinkingLevel}
                usage={usage}
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
                    ? followUpMutation.mutateAsync({ prompt: input.prompt, runId: activeRunId })
                    : startMutation.mutateAsync(input.prompt).then(() => undefined)
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
