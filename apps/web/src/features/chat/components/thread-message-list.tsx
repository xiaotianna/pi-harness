import { Disclosure, Separator, toast } from "@heroui/react";
import { ChevronRight } from "lucide-react";
import { type MouseEvent, memo, useState } from "react";
import { AssistantMarkdownLinkProvider } from "../../../components/ai/assistant-markdown-link";
import { openWorkspacePath } from "../api/workspace-api";
import { type ChatMessage, ChatMessageType } from "../data/chat";
import { ThreadMessage } from "./thread-message/index";

export interface ThreadMessageListProps {
  messages: readonly ChatMessage[];
  workspaceId?: string;
  workspaceRoot?: string;
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
        <Disclosure.Body>
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

export const ThreadMessageList = memo(function ThreadMessageList({
  messages,
  workspaceId,
  workspaceRoot,
}: ThreadMessageListProps) {
  const items = groupIntermediateMessages(messages);

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

  return (
    <AssistantMarkdownLinkProvider workspaceRoot={workspaceRoot}>
      <div
        className="mx-auto flex w-full max-w-[714px] flex-col gap-2 px-4 pt-10 pb-12"
        onClickCapture={handleClickCapture}
      >
        {items.map((item, index) => {
          const message = item.kind === "message" ? item.message : item.messages[0];
          const previousItem = items[index - 1];
          const previousMessage =
            previousItem?.kind === "message" ? previousItem.message : previousItem?.messages.at(-1);
          const startsNewTurn =
            index > 0 &&
            (message?.type === ChatMessageType.USER ||
              previousMessage?.type === ChatMessageType.USER);

          return (
            <div key={item.id} className={startsNewTurn ? "mt-6" : undefined}>
              {item.kind === "message" ? (
                <ThreadMessage message={item.message} />
              ) : (
                <IntermediateTurn messages={item.messages} />
              )}
            </div>
          );
        })}
      </div>
    </AssistantMarkdownLinkProvider>
  );
});
