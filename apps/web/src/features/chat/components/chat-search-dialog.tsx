"use client";

import { Command } from "@agile-avocation/ui-pro";
import { Kbd } from "@heroui/react";
import { MessageCircle, Search } from "lucide-react";
import type { ChatThread } from "../data/chat";

export interface ChatSearchDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  threads: readonly ChatThread[];
  onSelect: (thread: ChatThread) => void;
}

export function ChatSearchDialog({
  isOpen,
  onOpenChange,
  onSelect,
  threads,
}: ChatSearchDialogProps) {
  return (
    <Command>
      <Command.Backdrop isOpen={isOpen} onOpenChange={onOpenChange}>
        <Command.Container>
          <Command.Dialog>
            <Command.InputGroup>
              <Command.InputGroup.Prefix>
                <Search />
              </Command.InputGroup.Prefix>
              <Command.InputGroup.Input placeholder="Search your chats" />
              <Command.InputGroup.ClearButton />
              <Command.InputGroup.Suffix>
                <Kbd className="text-xs">
                  <Kbd.Content>Esc</Kbd.Content>
                </Kbd>
              </Command.InputGroup.Suffix>
            </Command.InputGroup>
            <Command.List
              renderEmptyState={() => (
                <div className="flex h-16 items-center justify-center text-sm text-muted">
                  No chats match that search.
                </div>
              )}
            >
              <Command.Group heading="Recent chats">
                {threads.map((thread) => (
                  <Command.Item
                    key={thread.id}
                    textValue={`${thread.title} ${thread.preview}`}
                    onAction={() => onSelect(thread)}
                  >
                    <MessageCircle />
                    <div className="flex min-w-0 flex-col">
                      <span className="truncate text-sm font-medium text-foreground">
                        {thread.title}
                      </span>
                      <span className="truncate text-xs text-muted">{thread.preview}</span>
                    </div>
                    <span className="ml-auto shrink-0 text-[11px] text-muted">
                      {thread.updatedAt}
                    </span>
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
                  <span>Navigate</span>
                </div>
                <div className="flex items-center gap-2">
                  <Kbd>
                    <Kbd.Abbr keyValue="enter" />
                  </Kbd>
                  <span>Open chat</span>
                </div>
              </div>
            </Command.Footer>
          </Command.Dialog>
        </Command.Container>
      </Command.Backdrop>
    </Command>
  );
}
