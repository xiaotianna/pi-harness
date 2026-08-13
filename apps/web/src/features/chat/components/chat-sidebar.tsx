"use client";

import { Sidebar } from "@agile-avocation/ui-pro";
import { Kbd } from "@heroui/react";
import { MessageCircle } from "lucide-react";
import { UserMenu } from "../../auth";
import type { ChatNavItem, ChatNavItemId, ChatThread } from "../data/chat";
import { CHAT_NAV_ITEMS, DEFAULT_CHAT_THREAD_ID, resolveChatActivePage } from "../data/chat";

export interface ChatSidebarProps {
  threads: readonly ChatThread[];
  pathname: string;
  basePath: string;
  disableNavigation?: boolean;
  onAction?: ((id: ChatNavItemId) => void) | undefined;
}

export function ChatSidebar({
  basePath,
  disableNavigation = false,
  onAction,
  pathname,
  threads,
}: ChatSidebarProps) {
  const contentProps = {
    basePath,
    disableNavigation,
    onAction,
    pathname,
    threads,
  };

  return (
    <>
      <Sidebar>
        <SidebarContents {...contentProps} />
        <Sidebar.Rail />
      </Sidebar>
      <Sidebar.Mobile>
        <SidebarContents {...contentProps} idPrefix="mobile-" />
      </Sidebar.Mobile>
    </>
  );
}

interface SidebarContentsProps extends ChatSidebarProps {
  idPrefix?: string;
}

function SidebarContents({
  basePath,
  disableNavigation,
  idPrefix = "",
  onAction,
  pathname,
  threads,
}: SidebarContentsProps) {
  const activePage = resolveChatActivePage(pathname, basePath);

  return (
    <>
      <Sidebar.Header>
        <UserMenu />
      </Sidebar.Header>
      <Sidebar.Content>
        <Sidebar.Group>
          <Sidebar.Menu aria-label="Chat actions">
            {CHAT_NAV_ITEMS.map((item) => (
              <ChatSidebarActionItem
                key={item.id}
                activePageKind={activePage.kind}
                basePath={basePath}
                disableNavigation={disableNavigation ?? false}
                idPrefix={idPrefix}
                item={item}
                onAction={onAction}
              />
            ))}
          </Sidebar.Menu>
        </Sidebar.Group>
        <Sidebar.Separator />
        <Sidebar.Group>
          <Sidebar.GroupLabel>Recent</Sidebar.GroupLabel>
          <Sidebar.Menu aria-label="Recent chats">
            {threads.map((thread) => (
              <ChatSidebarThreadItem
                key={thread.id}
                basePath={basePath}
                disableNavigation={disableNavigation ?? false}
                idPrefix={idPrefix}
                pathname={pathname}
                thread={thread}
              />
            ))}
          </Sidebar.Menu>
        </Sidebar.Group>
      </Sidebar.Content>
    </>
  );
}

interface ChatSidebarActionItemProps {
  activePageKind: ReturnType<typeof resolveChatActivePage>["kind"];
  basePath: string;
  disableNavigation: boolean;
  idPrefix: string;
  item: ChatNavItem;
  onAction?: ((id: ChatNavItemId) => void) | undefined;
}

function ChatSidebarActionItem({
  activePageKind,
  basePath,
  disableNavigation,
  idPrefix,
  item,
  onAction,
}: ChatSidebarActionItemProps) {
  const Icon = item.icon;
  const fullHref = item.href ? basePath + item.href : undefined;
  const isCurrent = activePageKind !== "thread" && item.id === activePageKind;

  const handlePress = () => {
    if (disableNavigation) return;
    onAction?.(item.id);
  };

  return (
    <Sidebar.MenuItem
      id={`${idPrefix}${item.id}`}
      isCurrent={Boolean(isCurrent)}
      textValue={item.label}
      onPress={handlePress}
      {...(item.href && !disableNavigation && fullHref ? { href: fullHref } : {})}
    >
      <Sidebar.MenuIcon>
        <Icon className="size-4" />
      </Sidebar.MenuIcon>
      <Sidebar.MenuLabel>{item.label}</Sidebar.MenuLabel>
      {item.shortcut ? (
        <Sidebar.MenuChip>
          <Kbd className="text-[11px]">{item.shortcut}</Kbd>
        </Sidebar.MenuChip>
      ) : null}
    </Sidebar.MenuItem>
  );
}

interface ChatSidebarThreadItemProps {
  basePath: string;
  disableNavigation: boolean;
  idPrefix: string;
  pathname: string;
  thread: ChatThread;
}

function ChatSidebarThreadItem({
  basePath,
  disableNavigation,
  idPrefix,
  pathname,
  thread,
}: ChatSidebarThreadItemProps) {
  const fullHref = `${basePath}/${thread.id}`;
  const isCurrent =
    pathname === fullHref ||
    pathname === thread.id ||
    pathname === `/${thread.id}` ||
    (thread.id === DEFAULT_CHAT_THREAD_ID &&
      (pathname === basePath || pathname === `${basePath}/` || pathname === "/"));

  return (
    <Sidebar.MenuItem
      id={`${idPrefix}${thread.id}`}
      isCurrent={isCurrent}
      textValue={thread.title}
      {...(!disableNavigation ? { href: fullHref } : {})}
    >
      <Sidebar.MenuIcon>
        <MessageCircle className="size-4" />
      </Sidebar.MenuIcon>
      <Sidebar.MenuLabel>{thread.title}</Sidebar.MenuLabel>
    </Sidebar.MenuItem>
  );
}
