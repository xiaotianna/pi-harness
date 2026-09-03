import { ChevronRight } from "@gravity-ui/icons";
import { Disclosure, Separator, toast } from "@heroui/react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useReducedMotion } from "motion/react";
import {
  Fragment,
  forwardRef,
  type MouseEvent,
  memo,
  type RefObject,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import { AssistantMarkdownLinkProvider } from "../../../components/ai/assistant-markdown-link";
import { SearchHighlightProvider } from "../../../components/ui/search-highlighted-text";
import { type ChatMessage, ChatMessageType } from "../data/chat";
import { useOpenWorkspacePath } from "../hooks/use-open-workspace-path";
import type { ChatSearchTarget } from "../state/chat-search-target-store";
import { getConversationTurnAnchorId } from "../utils/conversation-turns";
import { ThreadMessage } from "./thread-message/index";

export interface ThreadMessageListProps {
  messages: readonly ChatMessage[];
  onBeforeMessageEdit?: () => void;
  onBeforeTurnNavigate?: () => void;
  onRetryUserMessage?: (messageEventId: string, prompt: string) => Promise<void>;
  onSearchTargetComplete?: () => void;
  scrollContainerRef?: RefObject<HTMLDivElement | null>;
  searchTarget?: ChatSearchTarget;
  workspaceId?: string;
  workspaceRoot?: string;
}

export interface ThreadMessageListHandle {
  getTurnIdAtOffset: (offset: number) => string | null;
  scrollToEnd: () => void;
  scrollToTurn: (turnId: string) => void;
}

type ThreadMessageListItem =
  | { id: string; kind: "intermediate"; messages: readonly ChatMessage[] }
  | { id: string; kind: "message"; message: ChatMessage };

function groupIntermediateMessages(messages: readonly ChatMessage[]): ThreadMessageListItem[] {
  const items: ThreadMessageListItem[] = [];
  for (let index = 0; index < messages.length; ) {
    const message = messages[index];
    if (!message?.isIntermediate || !message.turnId) {
      if (message) items.push({ id: message.id, kind: "message", message });
      index += 1;
      continue;
    }

    const intermediateMessages: ChatMessage[] = [];
    while (
      index < messages.length &&
      messages[index]?.isIntermediate &&
      messages[index]?.turnId === message.turnId
    ) {
      const intermediateMessage = messages[index];
      if (!intermediateMessage) break;
      intermediateMessages.push(intermediateMessage);
      index += 1;
    }
    items.push({
      id: `intermediate-${message.turnId}-${message.id}`,
      kind: "intermediate",
      messages: intermediateMessages,
    });
  }
  return items;
}

function formatTurnDuration(durationMs: number): string {
  const totalSeconds = Math.max(0, Math.floor(durationMs / 1_000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;
}

function getItemMessage(item: ThreadMessageListItem): ChatMessage | undefined {
  return item.kind === "message" ? item.message : item.messages[0];
}

function SearchTargetMessage({
  isLastUserMessage = false,
  message,
  onComplete,
  onEditingChange,
  onRetryUserMessage,
  query,
  targetMessageId,
}: {
  isLastUserMessage?: boolean;
  message: ChatMessage;
  onComplete?: () => void;
  onEditingChange?: (isEditing: boolean) => void;
  onRetryUserMessage?: (messageEventId: string, prompt: string) => Promise<void>;
  query: string;
  targetMessageId: string | null;
}) {
  if (message.id !== targetMessageId) {
    return (
      <ThreadMessage
        isLastUserMessage={isLastUserMessage}
        message={message}
        {...(onEditingChange ? { onEditingChange } : {})}
        {...(onRetryUserMessage ? { onRetryUserMessage } : {})}
      />
    );
  }
  return (
    <div data-search-target="true">
      <SearchHighlightProvider query={query} {...(onComplete ? { onComplete } : {})}>
        <ThreadMessage
          isLastUserMessage={isLastUserMessage}
          message={message}
          {...(onEditingChange ? { onEditingChange } : {})}
          {...(onRetryUserMessage ? { onRetryUserMessage } : {})}
        />
      </SearchHighlightProvider>
    </div>
  );
}

function IntermediateTurn({
  messages,
  onSearchTargetComplete,
  searchQuery,
  targetMessageId,
}: {
  messages: readonly ChatMessage[];
  onSearchTargetComplete?: () => void;
  searchQuery: string;
  targetMessageId: string | null;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const durationMs = messages[0]?.turnDurationMs;

  useEffect(() => {
    if (messages.some((message) => message.id === targetMessageId)) setIsOpen(true);
  }, [messages, targetMessageId]);

  return (
    <Disclosure isExpanded={isOpen} onExpandedChange={setIsOpen}>
      <Disclosure.Heading>
        <Disclosure.Trigger className="group flex min-h-7 items-center gap-1 p-0 text-[13.5px] text-muted hover:text-foreground">
          <span>已处理</span>
          {durationMs === undefined ? null : (
            <span className="tabular-nums">{formatTurnDuration(durationMs)}</span>
          )}
          <ChevronRight
            aria-hidden
            className="size-3.5 opacity-60 transition-transform duration-200 group-aria-expanded:rotate-90 motion-reduce:transition-none"
          />
        </Disclosure.Trigger>
      </Disclosure.Heading>
      <Separator className="-mb-2 origin-top scale-y-50" variant="tertiary" />
      <Disclosure.Content>
        <Disclosure.Body style={{ paddingInline: 0 }}>
          <div className="flex flex-col gap-2 pt-2">
            {messages.map((message) => (
              <SearchTargetMessage
                key={message.id}
                message={message}
                query={searchQuery}
                targetMessageId={targetMessageId}
                {...(onSearchTargetComplete ? { onComplete: onSearchTargetComplete } : {})}
              />
            ))}
          </div>
        </Disclosure.Body>
      </Disclosure.Content>
    </Disclosure>
  );
}

const ThreadMessageListInner = forwardRef<ThreadMessageListHandle, ThreadMessageListProps>(
  function ThreadMessageList(
    {
      messages,
      onBeforeMessageEdit,
      onBeforeTurnNavigate,
      onRetryUserMessage,
      onSearchTargetComplete,
      scrollContainerRef,
      searchTarget,
      workspaceId,
      workspaceRoot,
    },
    ref,
  ) {
    const [hoveredTurnId, setHoveredTurnId] = useState<string | null>(null);
    const [isEditingMessage, setIsEditingMessage] = useState(false);
    const listRef = useRef<HTMLDivElement>(null);
    const shouldReduceMotion = useReducedMotion();
    const items = useMemo(() => groupIntermediateMessages(messages), [messages]);
    const lastUserMessageId = messages.findLast(
      (message) => message.type === ChatMessageType.USER,
    )?.id;
    const isVirtualized = scrollContainerRef !== undefined;
    const handleEditingChange = useCallback(
      (isEditing: boolean) => {
        if (isEditing) onBeforeMessageEdit?.();
        setIsEditingMessage(isEditing);
      },
      [onBeforeMessageEdit],
    );
    const { turnIdByItemIndex, turnItemIndexById } = useMemo(() => {
      const turnIdByItemIndex: Array<string | null> = [];
      const turnItemIndexById = new Map<string, number>();
      let currentTurnId: string | null = null;

      for (const [index, item] of items.entries()) {
        const message = getItemMessage(item);
        if (message?.type === ChatMessageType.USER) {
          currentTurnId = message.id;
          turnItemIndexById.set(message.id, index);
        }
        turnIdByItemIndex.push(currentTurnId);
      }

      return { turnIdByItemIndex, turnItemIndexById };
    }, [items]);
    const virtualizer = useVirtualizer({
      anchorTo: isEditingMessage ? "start" : "end",
      count: isVirtualized ? items.length : 0,
      directDomUpdates: true,
      enabled: isVirtualized,
      estimateSize: () => 180,
      followOnAppend: true,
      getItemKey: (index) => items[index]?.id ?? index,
      getScrollElement: () => scrollContainerRef?.current ?? null,
      initialOffset: () => items.length * 180 + 80,
      initialRect: { height: 1, width: 1 },
      overscan: 5,
      paddingEnd: 40,
      paddingStart: 40,
      scrollPaddingStart: 40,
      useFlushSync: false,
    });
    const targetMessageId = useMemo(() => {
      if (!searchTarget?.messageEventId) return null;
      const query = searchTarget.query.toLocaleLowerCase();
      const candidates = messages.filter(
        (message) => message.sourceEventId === searchTarget.messageEventId,
      );
      return (
        candidates.find(
          (message) =>
            (message.type === ChatMessageType.USER || message.type === ChatMessageType.ASSISTANT) &&
            message.content.toLocaleLowerCase().includes(query),
        )?.id ??
        candidates.find(
          (message) =>
            message.type === ChatMessageType.USER || message.type === ChatMessageType.ASSISTANT,
        )?.id ??
        null
      );
    }, [messages, searchTarget]);
    const targetItemIndex = useMemo(
      () =>
        targetMessageId === null
          ? -1
          : items.findIndex((item) =>
              item.kind === "message"
                ? item.message.id === targetMessageId
                : item.messages.some((message) => message.id === targetMessageId),
            ),
      [items, targetMessageId],
    );

    useEffect(() => {
      if (!searchTarget) return;
      if (targetMessageId === null || targetItemIndex < 0) {
        onSearchTargetComplete?.();
        return;
      }

      onBeforeTurnNavigate?.();
      if (isVirtualized) virtualizer.scrollToIndex(targetItemIndex, { align: "center" });
      const scrollTimeout = window.setTimeout(() => {
        listRef.current?.querySelector('[data-search-target="true"]')?.scrollIntoView({
          behavior: shouldReduceMotion ? "auto" : "smooth",
          block: "center",
        });
      }, 180);
      const completionTimeout = window.setTimeout(() => onSearchTargetComplete?.(), 2_800);

      return () => {
        window.clearTimeout(scrollTimeout);
        window.clearTimeout(completionTimeout);
      };
    }, [
      isVirtualized,
      onBeforeTurnNavigate,
      onSearchTargetComplete,
      searchTarget,
      shouldReduceMotion,
      targetItemIndex,
      targetMessageId,
      virtualizer,
    ]);

    useImperativeHandle(
      ref,
      () => ({
        getTurnIdAtOffset: (offset) => {
          const item = virtualizer.getVirtualItemForOffset(offset);
          return item ? (turnIdByItemIndex[item.index] ?? null) : null;
        },
        scrollToEnd: () => virtualizer.scrollToEnd(),
        scrollToTurn: (turnId) => {
          const index = turnItemIndexById.get(turnId);
          if (index !== undefined) {
            onBeforeTurnNavigate?.();
            virtualizer.scrollToIndex(index, { align: "start" });
          }
        },
      }),
      [onBeforeTurnNavigate, turnIdByItemIndex, turnItemIndexById, virtualizer],
    );

    const openWorkspacePath = useOpenWorkspacePath();

    const handleClickCapture = (event: MouseEvent<HTMLDivElement>) => {
      if (!(event.target instanceof Element)) return;
      const path = event.target.closest<HTMLAnchorElement>("a[data-local-path]")?.dataset.localPath;
      if (!path) return;
      event.preventDefault();
      if (!workspaceId) {
        toast.danger("无法确定文件所属的 Workspace");
        return;
      }
      openWorkspacePath(workspaceId, path);
    };

    const renderItem = (item: ThreadMessageListItem, index: number, isVirtualItem: boolean) => {
      const message = getItemMessage(item);
      const turnId = turnIdByItemIndex[index] ?? null;
      const previousItem = items[index - 1];
      const previousMessage = previousItem ? getItemMessage(previousItem) : undefined;
      const startsNewTurn =
        index > 0 &&
        (message?.type === ChatMessageType.USER || previousMessage?.type === ChatMessageType.USER);
      const turnAnchorId =
        message?.type === ChatMessageType.USER
          ? getConversationTurnAnchorId(message.id)
          : undefined;

      return (
        // biome-ignore lint/a11y/noStaticElementInteractions: hover only reveals actions; keyboard focus is handled by the action controls.
        <div
          className={
            isVirtualItem
              ? startsNewTurn
                ? "pt-6 pb-2"
                : "pb-2"
              : startsNewTurn
                ? "mt-6 scroll-mt-10"
                : turnAnchorId
                  ? "scroll-mt-10"
                  : undefined
          }
          data-turn-hovered={turnId !== null && turnId === hoveredTurnId}
          id={turnAnchorId}
          onMouseEnter={() => setHoveredTurnId(turnId)}
          onMouseLeave={() => setHoveredTurnId(null)}
        >
          {item.kind === "message" ? (
            <SearchTargetMessage
              isLastUserMessage={item.message.id === lastUserMessageId}
              message={item.message}
              onEditingChange={handleEditingChange}
              {...(onRetryUserMessage ? { onRetryUserMessage } : {})}
              query={searchTarget?.query ?? ""}
              targetMessageId={targetMessageId}
              {...(onSearchTargetComplete ? { onComplete: onSearchTargetComplete } : {})}
            />
          ) : (
            <IntermediateTurn
              messages={item.messages}
              searchQuery={searchTarget?.query ?? ""}
              targetMessageId={targetMessageId}
              {...(onSearchTargetComplete ? { onSearchTargetComplete } : {})}
            />
          )}
        </div>
      );
    };

    return (
      <AssistantMarkdownLinkProvider workspaceRoot={workspaceRoot}>
        <div ref={listRef} onClickCapture={handleClickCapture}>
          {isVirtualized ? (
            <div
              className="relative mx-auto w-full max-w-[714px] px-4"
              ref={virtualizer.containerRef}
            >
              {virtualizer.getVirtualItems().map((virtualItem) => {
                const item = items[virtualItem.index];
                if (!item) return null;

                return (
                  <div
                    className="absolute top-0 right-4 left-4"
                    data-index={virtualItem.index}
                    key={virtualItem.key}
                    ref={virtualizer.measureElement}
                  >
                    {renderItem(item, virtualItem.index, true)}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="mx-auto flex w-full max-w-[714px] flex-col gap-2 px-4 pt-10 pb-12">
              {items.map((item, index) => (
                <Fragment key={item.id}>{renderItem(item, index, false)}</Fragment>
              ))}
            </div>
          )}
        </div>
      </AssistantMarkdownLinkProvider>
    );
  },
);

export const ThreadMessageList = memo(ThreadMessageListInner);
