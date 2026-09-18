"use client";

import { ArrowLeft, ChevronDown, ChevronRight, Xmark as X } from "@gravity-ui/icons";
import { Button, Disclosure, ScrollShadow, Spinner, Tooltip, toast } from "@heroui/react";
import {
  type HarnessEvent,
  HarnessEventType,
  isSubAgentStartedData,
  isSubAgentTerminalData,
  MessageDeltaKind,
  type SubAgentStartedData,
  SubAgentStatus,
  selectActiveSessionEvents,
} from "@pi-harness/agent-runtime/harness-event";
import { useInfiniteQuery, useQuery, useQueryClient } from "@tanstack/react-query";
import { isPlainObject } from "es-toolkit";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { AssistantMarkdown } from "../../../components/ai/assistant-markdown";
import { ThinkingIndicator } from "../../../components/ai/thinking-indicator";
import {
  abortSubAgent,
  getSubAgentEvents,
  parseSessionEvent,
  sessionEventsUrl,
} from "../api/session-api";
import { sessionQueryKeys, sessionSnapshotQueryOptions } from "../api/session-queries";
import { CHAT_AUTO_SCROLL_THRESHOLD_PX } from "../constants/chat-scroll";
import { type ChatMessageTool, ChatToolState } from "../data/chat";
import { useWorkspaceInspectorStore } from "../state/workspace-inspector-store";
import { readToolResult } from "../utils/session-messages";
import { SUB_AGENT_STATUS_LABEL, subAgentStatusFromTerminal } from "../utils/sub-agent-status";
import { buildSubAgentTree, type SubAgentTreeNode } from "../utils/sub-agent-tree";
import { SubAgentAvatar } from "./sub-agent-avatar";
import { ToolCall } from "./thread-message/tool-call";

function readText(content: unknown): string {
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return "";
  return content
    .flatMap((part) =>
      isPlainObject(part) && part.type === "text" && typeof part.text === "string"
        ? [part.text]
        : [],
    )
    .join("\n");
}

function useLiveSubAgentEvents(sessionId: string, executionId: string, initialSeq: number | null) {
  const [events, setEvents] = useState<readonly HarnessEvent[]>([]);
  const [isDisconnected, setIsDisconnected] = useState(false);
  useEffect(() => {
    if (initialSeq === null) return;
    let afterSeq = initialSeq;
    let source: EventSource | null = null;
    let reconnectTimer: number | undefined;
    let closed = false;
    const receive = (message: MessageEvent<string>) => {
      try {
        const event = parseSessionEvent(message.data);
        if (event.seq <= afterSeq || event.sessionId !== sessionId) return;
        afterSeq = event.seq;
        if (isPlainObject(event.data) && event.data.executionId === executionId) {
          setEvents((current) => {
            if (
              event.type === HarnessEventType.SUBAGENT_MESSAGE_DELTA &&
              isPlainObject(event.data) &&
              event.data.kind === MessageDeltaKind.TEXT &&
              typeof event.data.delta === "string"
            ) {
              const data = event.data;
              const index = current.findLastIndex(
                (item) =>
                  item.type === HarnessEventType.SUBAGENT_MESSAGE_DELTA &&
                  isPlainObject(item.data) &&
                  item.data.kind === MessageDeltaKind.TEXT &&
                  item.data.contentIndex === data.contentIndex,
              );
              if (index >= 0) {
                const previous = current[index];
                if (
                  previous &&
                  isPlainObject(previous.data) &&
                  typeof previous.data.delta === "string"
                ) {
                  const next = [...current];
                  next[index] = {
                    ...event,
                    data: { ...data, delta: previous.data.delta + data.delta },
                  };
                  return next;
                }
              }
              return [...current, event];
            }
            if (event.type === HarnessEventType.SUBAGENT_MESSAGE_COMPLETED) {
              return [
                ...current.filter((item) => item.type !== HarnessEventType.SUBAGENT_MESSAGE_DELTA),
                event,
              ];
            }
            return [...current, event];
          });
        }
      } catch {
        setIsDisconnected(true);
      }
    };
    const connect = () => {
      if (closed) return;
      source = new EventSource(sessionEventsUrl(sessionId, afterSeq, true));
      for (const type of Object.values(HarnessEventType))
        source.addEventListener(type, receive as EventListener);
      source.onopen = () => setIsDisconnected(false);
      source.onerror = () => {
        source?.close();
        setIsDisconnected(true);
        reconnectTimer = window.setTimeout(connect, 2_000);
      };
    };
    connect();
    return () => {
      closed = true;
      source?.close();
      if (reconnectTimer !== undefined) window.clearTimeout(reconnectTimer);
    };
  }, [sessionId, executionId, initialSeq]);
  return { events, isDisconnected };
}

function SubAgentListRow({
  agent,
  childCount = 0,
  isNested = false,
  onOpen,
}: {
  agent: SubAgentStartedData & { status: SubAgentStatus };
  childCount?: number;
  isNested?: boolean;
  onOpen: () => void;
}) {
  return (
    <Button
      className="h-auto w-full min-w-0 flex-1 justify-start gap-2 py-1.5"
      size="sm"
      variant="ghost"
      aria-label={`查看${isNested ? "孙" : "子"} Agent ${agent.name}，${SUB_AGENT_STATUS_LABEL[agent.status]}`}
      onPress={onOpen}
    >
      <SubAgentAvatar executionId={agent.executionId} className="size-5" />
      <span className="flex min-w-0 flex-1 flex-col items-start">
        <span className="w-full truncate text-start text-sm font-medium">{agent.name}</span>
        <span className="w-full truncate text-start text-xs text-muted">
          {agent.agentType === "worker" ? "执行" : "探索"} · {SUB_AGENT_STATUS_LABEL[agent.status]}
          {childCount ? ` · ${childCount} 个子任务` : ""}
        </span>
      </span>
      {childCount === 0 ? (
        <ChevronRight aria-hidden className="size-3.5 shrink-0 text-muted" />
      ) : null}
    </Button>
  );
}

function SubAgentTreeGroup({
  node,
  onOpen,
}: {
  node: SubAgentTreeNode;
  onOpen: (executionId: string) => void;
}) {
  const [isExpanded, setIsExpanded] = useState(true);
  const { agent, children } = node;
  if (children.length === 0)
    return <SubAgentListRow agent={agent} onOpen={() => onOpen(agent.executionId)} />;

  return (
    <Disclosure isExpanded={isExpanded} onExpandedChange={setIsExpanded} className="w-full">
      <Disclosure.Heading className="flex min-w-0 items-center gap-1">
        <SubAgentListRow
          agent={agent}
          childCount={children.length}
          onOpen={() => onOpen(agent.executionId)}
        />
        <Tooltip delay={0}>
          <Disclosure.Trigger
            className="flex size-8 shrink-0 items-center justify-center p-0 text-muted"
            aria-label={`${isExpanded ? "收起" : "展开"} ${agent.name} 的 ${children.length} 个子任务`}
          >
            <ChevronDown
              aria-hidden
              className={`size-4 transition-transform duration-200 motion-reduce:transition-none ${isExpanded ? "" : "-rotate-90"}`}
            />
          </Disclosure.Trigger>
          <Tooltip.Content placement="bottom">
            {isExpanded ? "收起子任务" : "展开子任务"}
          </Tooltip.Content>
        </Tooltip>
      </Disclosure.Heading>
      <Disclosure.Content>
        <Disclosure.Body style={{ padding: 0 }}>
          <div className="flex flex-col gap-0.5">
            {children.map((child) => (
              <SubAgentListRow
                key={child.agent.executionId}
                agent={child.agent}
                isNested
                onOpen={() => onOpen(child.agent.executionId)}
              />
            ))}
          </div>
        </Disclosure.Body>
      </Disclosure.Content>
    </Disclosure>
  );
}

export function SubAgentInspector({
  sessionId,
  runId,
  executionId,
  onClose,
}: {
  sessionId: string;
  runId: string;
  executionId: string | null;
  onClose: () => void;
}) {
  const snapshotQuery = useQuery(sessionSnapshotQueryOptions(sessionId));
  const openSubAgent = useWorkspaceInspectorStore((state) => state.openSubAgent);
  const showSubAgentList = useWorkspaceInspectorStore((state) => state.showSubAgentList);
  const activeEvents = useMemo(
    () => (executionId ? [] : selectActiveSessionEvents(snapshotQuery.data?.events ?? [])),
    [executionId, snapshotQuery.data?.events],
  );
  const agents = useMemo(
    () =>
      activeEvents.flatMap((event) => {
        if (
          event.runId !== runId ||
          event.type !== HarnessEventType.SUBAGENT_STARTED ||
          !isSubAgentStartedData(event.data)
        )
          return [];
        const data = event.data;
        const terminal = activeEvents.findLast(
          (later) =>
            later.seq > event.seq &&
            isPlainObject(later.data) &&
            later.data.executionId === data.executionId &&
            (later.type === HarnessEventType.SUBAGENT_COMPLETED ||
              later.type === HarnessEventType.SUBAGENT_FAILED ||
              later.type === HarnessEventType.SUBAGENT_ABORTED),
        );
        return [{ ...data, status: subAgentStatusFromTerminal(terminal?.type) }];
      }),
    [activeEvents, runId],
  );
  const agentTree = useMemo(() => buildSubAgentTree(agents), [agents]);

  if (executionId)
    return (
      <SubAgentDetail
        key={executionId}
        sessionId={sessionId}
        executionId={executionId}
        onBack={showSubAgentList}
        onClose={onClose}
      />
    );

  return (
    <aside className="flex h-full min-h-0 flex-col bg-background" aria-label="子 Agent 列表">
      <header className="flex min-h-14 items-center gap-2 border-b border-separator px-4">
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-medium">子 Agent</h2>
          <p className="text-xs text-muted">
            本次运行 · {agentTree.length} 组 / {agents.length} 个任务
          </p>
        </div>
        <Tooltip delay={0}>
          <Button
            isIconOnly
            size="sm"
            variant="ghost"
            aria-label="关闭子 Agent 列表"
            onPress={onClose}
          >
            <X className="size-4" />
          </Button>
          <Tooltip.Content placement="bottom">关闭子 Agent 列表</Tooltip.Content>
        </Tooltip>
      </header>
      <ScrollShadow className="session-scrollbar min-h-0 flex-1" orientation="vertical">
        <nav aria-label="本次运行的子 Agent" className="flex flex-col gap-0.5 p-3">
          {snapshotQuery.isPending ? <Spinner aria-label="正在加载子 Agent 列表" /> : null}
          {snapshotQuery.isError ? (
            <p role="alert" className="px-2 text-sm text-danger">
              加载子 Agent 列表失败
            </p>
          ) : null}
          {agents.length === 0 && !snapshotQuery.isPending && !snapshotQuery.isError ? (
            <p className="px-2 text-sm text-muted">暂无子 Agent</p>
          ) : null}
          {agentTree.map((node) => (
            <SubAgentTreeGroup
              key={node.agent.executionId}
              node={node}
              onOpen={(id) => openSubAgent(sessionId, runId, id)}
            />
          ))}
        </nav>
      </ScrollShadow>
    </aside>
  );
}

function SubAgentDetail({
  sessionId,
  executionId,
  onBack,
  onClose,
}: {
  sessionId: string;
  executionId: string;
  onBack: () => void;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const scrollRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const shouldFollowRef = useRef(true);
  const snapshotQuery = useQuery(sessionSnapshotQueryOptions(sessionId));
  const historyQuery = useInfiniteQuery({
    queryKey: sessionQueryKeys.subAgent(sessionId, executionId),
    initialPageParam: 0,
    queryFn: ({ pageParam, signal }) =>
      getSubAgentEvents(sessionId, executionId, pageParam, signal),
    getNextPageParam: (lastPage) => (lastPage.hasMore ? lastPage.events.at(-1)?.seq : undefined),
  });
  const [initialSeq, setInitialSeq] = useState<number | null>(null);
  useEffect(() => {
    if (initialSeq === null && snapshotQuery.data)
      setInitialSeq(snapshotQuery.data.session.lastSeq);
  }, [initialSeq, snapshotQuery.data]);
  const live = useLiveSubAgentEvents(sessionId, executionId, initialSeq);
  const [isStopping, setIsStopping] = useState(false);
  useLayoutEffect(() => {
    const scroll = scrollRef.current;
    const content = contentRef.current;
    if (!scroll || !content) return;
    shouldFollowRef.current = true;
    const scrollToEnd = () => {
      if (shouldFollowRef.current) scroll.scrollTop = scroll.scrollHeight;
    };
    scrollToEnd();
    const observer = new ResizeObserver(scrollToEnd);
    observer.observe(content);
    return () => observer.disconnect();
  }, []);
  const events = useMemo(() => {
    const bySeq = new Map<number, HarnessEvent>();
    for (const page of historyQuery.data?.pages ?? [])
      for (const event of page.events) bySeq.set(event.seq, event);
    for (const event of live.events) bySeq.set(event.seq, event);
    return [...bySeq.values()].sort((left, right) => left.seq - right.seq);
  }, [historyQuery.data, live.events]);
  const activeSnapshotEvents = useMemo(
    () => selectActiveSessionEvents(snapshotQuery.data?.events ?? []),
    [snapshotQuery.data?.events],
  );
  const started =
    events.find(
      (event) =>
        event.type === HarnessEventType.SUBAGENT_STARTED && isSubAgentStartedData(event.data),
    ) ??
    activeSnapshotEvents.find(
      (event) =>
        event.type === HarnessEventType.SUBAGENT_STARTED &&
        isSubAgentStartedData(event.data) &&
        event.data.executionId === executionId,
    );
  const startData = started && isSubAgentStartedData(started.data) ? started.data : null;
  const parentStarted = startData?.parentExecutionId
    ? activeSnapshotEvents.find(
        (event) =>
          event.type === HarnessEventType.SUBAGENT_STARTED &&
          isSubAgentStartedData(event.data) &&
          event.data.executionId === startData.parentExecutionId,
      )
    : undefined;
  const parentName =
    parentStarted && isSubAgentStartedData(parentStarted.data) ? parentStarted.data.name : null;
  const terminal =
    events.findLast(
      (event) =>
        event.type === HarnessEventType.SUBAGENT_COMPLETED ||
        event.type === HarnessEventType.SUBAGENT_FAILED ||
        event.type === HarnessEventType.SUBAGENT_ABORTED,
    ) ??
    activeSnapshotEvents.findLast(
      (event) =>
        isPlainObject(event.data) &&
        event.data.executionId === executionId &&
        (event.type === HarnessEventType.SUBAGENT_COMPLETED ||
          event.type === HarnessEventType.SUBAGENT_FAILED ||
          event.type === HarnessEventType.SUBAGENT_ABORTED),
    );
  const status = subAgentStatusFromTerminal(terminal?.type);
  const terminalData = terminal && isSubAgentTerminalData(terminal.data) ? terminal.data : null;
  const completedTools = new Map<string, HarnessEvent>();
  for (const event of events) {
    if (
      (event.type === HarnessEventType.SUBAGENT_TOOL_COMPLETED ||
        event.type === HarnessEventType.SUBAGENT_TOOL_FAILED) &&
      isPlainObject(event.data) &&
      typeof event.data.toolCallId === "string"
    ) {
      completedTools.set(event.data.toolCallId, event);
    }
  }
  const streamingText = live.events
    .flatMap((event) =>
      event.type === HarnessEventType.SUBAGENT_MESSAGE_DELTA &&
      isPlainObject(event.data) &&
      event.data.kind === MessageDeltaKind.TEXT &&
      typeof event.data.delta === "string"
        ? [event.data.delta]
        : [],
    )
    .join("");
  const stop = async () => {
    setIsStopping(true);
    try {
      await abortSubAgent(sessionId, executionId);
      await queryClient.invalidateQueries({
        queryKey: sessionQueryKeys.subAgent(sessionId, executionId),
      });
    } catch (error: unknown) {
      toast.danger(error instanceof Error ? error.message : "停止子 Agent 失败");
    } finally {
      setIsStopping(false);
    }
  };

  return (
    <aside className="flex h-full min-h-0 flex-col bg-background" aria-label="子 Agent 详情">
      <header className="flex min-h-16 shrink-0 items-center gap-2 border-b border-separator px-3 py-3">
        <Tooltip delay={0}>
          <Button
            isIconOnly
            size="sm"
            variant="ghost"
            aria-label="返回子 Agent 列表"
            onPress={onBack}
          >
            <ArrowLeft aria-hidden className="size-4" />
          </Button>
          <Tooltip.Content placement="bottom">返回子 Agent 列表</Tooltip.Content>
        </Tooltip>
        <SubAgentAvatar executionId={executionId} className="size-6" />
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <h2 className="truncate text-sm leading-5 font-medium" title={startData?.name}>
            {startData?.name ?? "子 Agent"}
          </h2>
          <p className="flex min-w-0 items-center gap-1.5 text-xs leading-4 text-muted">
            <span
              aria-hidden
              className={`size-1.5 shrink-0 rounded-full ${
                status === SubAgentStatus.COMPLETED
                  ? "bg-success"
                  : status === SubAgentStatus.FAILED
                    ? "bg-danger"
                    : status === SubAgentStatus.RUNNING
                      ? "bg-accent"
                      : "bg-muted"
              }`}
            />
            <span className="shrink-0">{SUB_AGENT_STATUS_LABEL[status]}</span>
            <span aria-hidden className="shrink-0">
              ·
            </span>
            <span className="shrink-0">{startData?.agentType === "worker" ? "执行" : "探索"}</span>
            {parentName ? (
              <>
                <span aria-hidden className="shrink-0">
                  ·
                </span>
                <span className="min-w-0 truncate" title={`来自 ${parentName}`}>
                  来自 {parentName}
                </span>
              </>
            ) : null}
          </p>
        </div>
        {status === SubAgentStatus.RUNNING && startData ? (
          <Button size="sm" variant="ghost" isPending={isStopping} onPress={() => void stop()}>
            停止该子任务
          </Button>
        ) : null}
        <Tooltip delay={0}>
          <Button
            isIconOnly
            size="sm"
            variant="ghost"
            aria-label="关闭子 Agent 详情"
            onPress={onClose}
          >
            <X className="size-4" />
          </Button>
          <Tooltip.Content placement="bottom">关闭子 Agent 详情</Tooltip.Content>
        </Tooltip>
      </header>
      <ScrollShadow
        className="session-scrollbar min-h-0 flex-1"
        orientation="vertical"
        ref={scrollRef}
        onPointerDown={(event) => {
          if (event.target === event.currentTarget) shouldFollowRef.current = false;
        }}
        onScroll={(event) => {
          const scroll = event.currentTarget;
          if (
            scroll.scrollHeight - scroll.scrollTop - scroll.clientHeight <=
            CHAT_AUTO_SCROLL_THRESHOLD_PX
          )
            shouldFollowRef.current = true;
        }}
        onTouchMove={() => {
          shouldFollowRef.current = false;
        }}
        onWheel={(event) => {
          if (event.deltaY < 0) shouldFollowRef.current = false;
        }}
      >
        <div className="space-y-5 px-4 py-4" ref={contentRef}>
          {startData ? (
            <section className="space-y-1">
              <h3 className="text-xs font-medium text-muted">任务说明</h3>
              <p className="whitespace-pre-wrap text-sm">{startData.task}</p>
            </section>
          ) : null}
          {historyQuery.isPending ? <Spinner aria-label="正在加载子 Agent 过程" /> : null}
          {historyQuery.isError ? (
            <p role="alert" className="text-sm text-danger">
              加载子 Agent 过程失败
            </p>
          ) : null}
          {events.length === 0 && !historyQuery.isPending ? (
            <p className="text-sm text-muted">暂无过程记录</p>
          ) : null}
          {events.map((event) => {
            if (
              event.type === HarnessEventType.SUBAGENT_MESSAGE_COMPLETED &&
              isPlainObject(event.data) &&
              isPlainObject(event.data.message) &&
              event.data.message.role === "assistant"
            ) {
              const content = readText(event.data.message.content);
              return content ? (
                <article key={event.id} className="text-sm">
                  <AssistantMarkdown>{content}</AssistantMarkdown>
                </article>
              ) : null;
            }
            if (
              event.type === HarnessEventType.SUBAGENT_TOOL_STARTED &&
              isPlainObject(event.data) &&
              typeof event.data.toolCallId === "string" &&
              typeof event.data.toolName === "string"
            ) {
              const completed = completedTools.get(event.data.toolCallId);
              const failed = completed?.type === HarnessEventType.SUBAGENT_TOOL_FAILED;
              const tool: ChatMessageTool = {
                toolCallId: event.data.toolCallId,
                toolName: event.data.toolName,
                input: event.data.arguments,
                ...(completed && isPlainObject(completed.data)
                  ? { output: readToolResult(completed.data.result) }
                  : {}),
                state: completed
                  ? failed
                    ? ChatToolState.OUTPUT_ERROR
                    : ChatToolState.OUTPUT_AVAILABLE
                  : ChatToolState.INPUT_AVAILABLE,
              };
              return <ToolCall key={event.id} tool={tool} />;
            }
            if (
              event.type === HarnessEventType.FILE_CHANGED &&
              isPlainObject(event.data) &&
              typeof event.data.path === "string"
            ) {
              return (
                <p key={event.id} className="break-all text-xs text-muted">
                  已修改文件：{event.data.path}
                </p>
              );
            }
            if (
              event.type === HarnessEventType.APPROVAL_REQUESTED &&
              isPlainObject(event.data) &&
              typeof event.data.summary === "string"
            ) {
              return (
                <p key={event.id} className="text-xs text-muted">
                  等待审批：{event.data.summary}
                </p>
              );
            }
            return null;
          })}
          {status === SubAgentStatus.RUNNING && streamingText ? (
            <div className="text-sm">
              <AssistantMarkdown isStreaming>{streamingText}</AssistantMarkdown>
            </div>
          ) : null}
          {status === SubAgentStatus.RUNNING && !historyQuery.isPending && !live.isDisconnected ? (
            <ThinkingIndicator label="正在处理…" />
          ) : null}
          {terminalData?.errorCode ? (
            <p role="status" className="text-sm text-danger">
              {terminalData.errorCode}
            </p>
          ) : null}
          {live.isDisconnected ? (
            <p role="status" className="text-xs text-muted">
              连接中断，正在重连…
            </p>
          ) : null}
          {historyQuery.hasNextPage ? (
            <Button
              size="sm"
              variant="ghost"
              isPending={historyQuery.isFetchingNextPage}
              onPress={() => void historyQuery.fetchNextPage()}
            >
              加载更多过程
            </Button>
          ) : null}
        </div>
      </ScrollShadow>
    </aside>
  );
}
