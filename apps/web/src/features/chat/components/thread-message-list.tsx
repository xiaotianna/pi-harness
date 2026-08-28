import { ChevronRight } from "@gravity-ui/icons";
import { Disclosure, Separator, toast } from "@heroui/react";
import { useVirtualizer } from "@tanstack/react-virtual";
import {
  Fragment,
  forwardRef,
  type MouseEvent,
  memo,
  type RefObject,
  useImperativeHandle,
  useMemo,
  useState,
} from "react";
import { AssistantMarkdownLinkProvider } from "../../../components/ai/assistant-markdown-link";
import { openWorkspacePath } from "../api/workspace-api";
import { type ChatMessage, ChatMessageType } from "../data/chat";
import { getConversationTurnAnchorId } from "../utils/conversation-turns";
import { ThreadMessage } from "./thread-message/index";

export interface ThreadMessageListProps {
  messages: readonly ChatMessage[];
  onBeforeTurnNavigate?: () => void;
  scrollContainerRef?: RefObject<HTMLDivElement | null>;
  workspaceId?: string;
  workspaceRoot?: string;
}

export interface ThreadMessageListHandle {
  getTurnIdAtOffset: (offset: number) => string | null;
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
      id: `intermediate-${message.turnId}`,
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

function IntermediateTurn({ messages }: { messages: readonly ChatMessage[] }) {
  const [isOpen, setIsOpen] = useState(false);
  const durationMs = messages[0]?.turnDurationMs;

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
              <ThreadMessage key={message.id} message={message} />
            ))}
          </div>
        </Disclosure.Body>
      </Disclosure.Content>
    </Disclosure>
  );
}

const ThreadMessageListInner = forwardRef<ThreadMessageListHandle, ThreadMessageListProps>(
  function ThreadMessageList(
    { messages, onBeforeTurnNavigate, scrollContainerRef, workspaceId, workspaceRoot },
    ref,
  ) {
    const items = useMemo(() => groupIntermediateMessages(messages), [messages]);
    const isVirtualized = scrollContainerRef !== undefined;
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
      count: isVirtualized ? items.length : 0,
      enabled: isVirtualized,
      estimateSize: () => 180,
      getItemKey: (index) => items[index]?.id ?? index,
      getScrollElement: () => scrollContainerRef?.current ?? null,
      initialRect: { height: 1, width: 1 },
      overscan: 5,
      paddingEnd: 40,
      paddingStart: 40,
      scrollPaddingStart: 40,
    });

    useImperativeHandle(
      ref,
      () => ({
        getTurnIdAtOffset: (offset) => {
          const item = virtualizer.getVirtualItemForOffset(offset);
          return item ? (turnIdByItemIndex[item.index] ?? null) : null;
        },
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

    const handleClickCapture = (event: MouseEvent<HTMLDivElement>) => {
      if (!(event.target instanceof Element)) return;
      const path = event.target.closest<HTMLAnchorElement>("a[data-local-path]")?.dataset.localPath;
      if (!path) return;
      event.preventDefault();
      if (!workspaceId) {
        toast.danger("无法确定文件所属的 Workspace");
        return;
      }
      void openWorkspacePath(workspaceId, path).catch((error: unknown) => {
        toast.danger(error instanceof Error ? error.message : "无法打开本地文件");
      });
    };

    const renderItem = (item: ThreadMessageListItem, index: number, isVirtualItem: boolean) => {
      const message = getItemMessage(item);
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
          id={turnAnchorId}
        >
          {item.kind === "message" ? (
            <ThreadMessage message={item.message} />
          ) : (
            <IntermediateTurn messages={item.messages} />
          )}
        </div>
      );
    };

    return (
      <AssistantMarkdownLinkProvider workspaceRoot={workspaceRoot}>
        <div onClickCapture={handleClickCapture}>
          {isVirtualized ? (
            <div
              className="relative mx-auto w-full max-w-[714px] px-4"
              style={{ height: virtualizer.getTotalSize() }}
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
                    style={{ transform: `translateY(${virtualItem.start}px)` }}
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
