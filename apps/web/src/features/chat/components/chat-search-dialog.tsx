"use client";

import { Command } from "@agile-avocation/ui-pro";
import { Comment as MessageCircle, Magnifier as Search } from "@gravity-ui/icons";
import { Kbd } from "@heroui/react";
import { useQuery } from "@tanstack/react-query";
import { memo, useEffect, useState } from "react";
import { formatChatTimestamp } from "../../../shared/utils/format-chat-timestamp";
import { sessionSearchQueryOptions } from "../api/session-queries";
import type { ChatSearchTarget } from "../state/chat-search-target-store";

export interface ChatSearchDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (target: ChatSearchTarget) => void;
}

function HighlightedText({ query, text }: { query: string; text: string }) {
  const matchIndex = query ? text.toLocaleLowerCase().indexOf(query.toLocaleLowerCase()) : -1;
  if (matchIndex < 0) return text;

  return (
    <>
      {text.slice(0, matchIndex)}
      <mark className="bg-transparent font-semibold text-accent">
        {text.slice(matchIndex, matchIndex + query.length)}
      </mark>
      {text.slice(matchIndex + query.length)}
    </>
  );
}

export const ChatSearchDialog = memo(function ChatSearchDialog({
  isOpen,
  onOpenChange,
  onSelect,
}: ChatSearchDialogProps) {
  const [inputValue, setInputValue] = useState("");
  const [query, setQuery] = useState("");
  const resultsQuery = useQuery({
    ...sessionSearchQueryOptions(query),
    enabled: isOpen,
  });

  useEffect(() => {
    if (!isOpen) {
      setInputValue("");
      setQuery("");
      return;
    }
    const timeout = window.setTimeout(() => setQuery(inputValue.trim()), 180);
    return () => window.clearTimeout(timeout);
  }, [inputValue, isOpen]);

  const normalizedInput = inputValue.trim();
  const visibleResults = normalizedInput === query ? (resultsQuery.data ?? []) : [];
  const emptyMessage =
    resultsQuery.isPending || normalizedInput !== query || resultsQuery.isFetching
      ? normalizedInput
        ? "正在搜索对话…"
        : "正在加载对话…"
      : resultsQuery.isError
        ? "搜索对话失败，请稍后重试"
        : normalizedInput
          ? "没有找到匹配的对话"
          : "暂无对话";

  return (
    <Command>
      <Command.Backdrop isOpen={isOpen} onOpenChange={onOpenChange}>
        <Command.Container size="lg">
          <Command.Dialog
            aria-label="搜索对话"
            filter={() => true}
            inputValue={inputValue}
            onInputChange={setInputValue}
          >
            <Command.InputGroup aria-label="搜索对话">
              <Command.InputGroup.Prefix>
                <Search />
              </Command.InputGroup.Prefix>
              <Command.InputGroup.Input maxLength={500} placeholder="搜索标题、描述和对话内容" />
              <Command.InputGroup.ClearButton aria-label="清空搜索" />
              <Command.InputGroup.Suffix>
                <Kbd className="text-xs">
                  <Kbd.Content>Esc</Kbd.Content>
                </Kbd>
              </Command.InputGroup.Suffix>
            </Command.InputGroup>
            <Command.List aria-label="对话搜索结果" renderEmptyState={() => emptyMessage}>
              <Command.Group heading={normalizedInput ? "搜索结果" : "最近对话"}>
                {visibleResults.map(({ excerpt, messageEventId, session }) => (
                  <Command.Item
                    className="items-start"
                    key={session.id}
                    textValue={`${session.title} ${excerpt}`}
                    onAction={() => onSelect({ messageEventId, query, sessionId: session.id })}
                  >
                    <MessageCircle className="mt-0.5" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-3">
                        <span className="min-w-0 flex-1 truncate font-medium">
                          <HighlightedText query={query} text={session.title} />
                        </span>
                        <time
                          className="shrink-0 text-xs font-normal tabular-nums text-muted"
                          dateTime={new Date(session.updatedAt).toISOString()}
                        >
                          {formatChatTimestamp(new Date(session.updatedAt).toISOString())}
                        </time>
                      </div>
                      <span className="mt-1 block truncate text-xs text-muted">
                        {excerpt ? <HighlightedText query={query} text={excerpt} /> : "暂无消息"}
                      </span>
                    </div>
                  </Command.Item>
                ))}
              </Command.Group>
            </Command.List>
            <Command.Footer className="justify-between [&_kbd]:h-5 [&_kbd]:text-xs">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-0.5">
                    <Kbd className="text-xs">
                      <Kbd.Abbr keyValue="up" />
                    </Kbd>
                    <Kbd className="text-xs">
                      <Kbd.Abbr keyValue="down" />
                    </Kbd>
                  </div>
                  <span>选择</span>
                </div>
                <div className="flex items-center gap-2">
                  <Kbd>
                    <Kbd.Abbr keyValue="enter" />
                  </Kbd>
                  <span>打开对话</span>
                </div>
              </div>
            </Command.Footer>
          </Command.Dialog>
        </Command.Container>
      </Command.Backdrop>
    </Command>
  );
});
