"use client";

import { Sidebar } from "@agile-avocation/ui-pro";
import { Dropdown, Kbd, Tooltip } from "@heroui/react";
import {
  Archive,
  Ellipsis,
  Folder,
  FolderOpen,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { formatChatTimestamp } from "../../../shared/utils/format-chat-timestamp";
import { UserMenu } from "../../auth";
import type { ChatNavItem, ChatNavItemId, ChatThread, ChatWorkspace } from "../data/chat";
import { CHAT_NAV_ITEMS, DEFAULT_CHAT_THREAD_ID, resolveChatActivePage } from "../data/chat";

export interface ChatSidebarProps {
  threads: readonly ChatThread[];
  workspaces: readonly ChatWorkspace[];
  pathname: string;
  basePath: string;
  disableNavigation?: boolean;
  onArchive: (thread: ChatThread) => void;
  onAction?: ((id: ChatNavItemId) => void) | undefined;
  onNewThread: () => void;
  onRename: (thread: ChatThread) => void;
  onRemoveWorkspace: (workspace: ChatWorkspace) => void;
  onRenameWorkspace: (workspace: ChatWorkspace) => void;
  onSettings: () => void;
}

export function ChatSidebar({
  basePath,
  disableNavigation = false,
  onArchive,
  onAction,
  onNewThread,
  onRename,
  onRemoveWorkspace,
  onRenameWorkspace,
  onSettings,
  pathname,
  threads,
  workspaces,
}: ChatSidebarProps) {
  const contentProps = {
    basePath,
    disableNavigation,
    onArchive,
    onAction,
    onNewThread,
    onRename,
    onRemoveWorkspace,
    onRenameWorkspace,
    onSettings,
    pathname,
    threads,
    workspaces,
  };

  return (
    <>
      <Sidebar>
        <SidebarContents {...contentProps} />
        <Sidebar.Rail aria-label="切换侧边栏" />
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
  onArchive,
  onAction,
  onNewThread,
  onRename,
  onRemoveWorkspace,
  onRenameWorkspace,
  onSettings,
  pathname,
  threads,
  workspaces,
}: SidebarContentsProps) {
  const activePage = resolveChatActivePage(pathname, basePath);

  return (
    <>
      <Sidebar.Content className="pt-4">
        <Sidebar.Group>
          <Sidebar.Menu aria-label="对话操作">
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
          <Sidebar.GroupLabel className="flex items-center justify-between text-sm font-normal">
            <span>工作区</span>
            <Tooltip delay={0}>
              <Sidebar.MenuAction aria-label="新建工作区" className="-my-1">
                <Plus className="!size-3.5 text-muted" />
              </Sidebar.MenuAction>
              <Tooltip.Content placement="right">新建工作区</Tooltip.Content>
            </Tooltip>
          </Sidebar.GroupLabel>
          <Sidebar.Menu
            aria-label="工作区"
            defaultExpandedKeys={workspaces.map(
              (workspace) => `${idPrefix}workspace-${workspace.id}`,
            )}
            showGuideLines={false}
          >
            {workspaces.map((workspace) => (
              <ChatSidebarWorkspaceItem
                key={workspace.id}
                basePath={basePath}
                disableNavigation={disableNavigation ?? false}
                idPrefix={idPrefix}
                onArchive={onArchive}
                onNewThread={onNewThread}
                onRemove={onRemoveWorkspace}
                onRename={onRename}
                onRenameWorkspace={onRenameWorkspace}
                pathname={pathname}
                threads={threads.filter((thread) => thread.workspaceId === workspace.id)}
                workspace={workspace}
              />
            ))}
          </Sidebar.Menu>
        </Sidebar.Group>
      </Sidebar.Content>
      <Sidebar.Footer>
        <UserMenu onSettings={onSettings} />
      </Sidebar.Footer>
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

interface ChatSidebarWorkspaceItemProps {
  basePath: string;
  disableNavigation: boolean;
  idPrefix: string;
  onArchive: (thread: ChatThread) => void;
  onNewThread: () => void;
  onRemove: (workspace: ChatWorkspace) => void;
  onRename: (thread: ChatThread) => void;
  onRenameWorkspace: (workspace: ChatWorkspace) => void;
  pathname: string;
  threads: readonly ChatThread[];
  workspace: ChatWorkspace;
}

function ChatSidebarWorkspaceItem({
  basePath,
  disableNavigation,
  idPrefix,
  onArchive,
  onNewThread,
  onRemove,
  onRename,
  onRenameWorkspace,
  pathname,
  threads,
  workspace,
}: ChatSidebarWorkspaceItemProps) {
  return (
    <Sidebar.MenuItem
      data-workspace-item
      id={`${idPrefix}workspace-${workspace.id}`}
      textValue={workspace.name}
    >
      <Sidebar.MenuTrigger className="order-first">
        <Sidebar.MenuIndicator />
      </Sidebar.MenuTrigger>
      <Sidebar.MenuIcon className="order-first">
        <Folder className="sidebar__workspace-folder-closed" />
        <FolderOpen className="sidebar__workspace-folder-open" />
      </Sidebar.MenuIcon>
      <Sidebar.MenuLabel>{workspace.name}</Sidebar.MenuLabel>
      <Sidebar.MenuActions className="absolute end-2 w-16 justify-end">
        <Dropdown>
          <Tooltip delay={0}>
            <Dropdown.Trigger
              aria-label={`更多操作：${workspace.name}`}
              className="sidebar__menu-action"
            >
              <Ellipsis />
            </Dropdown.Trigger>
            <Tooltip.Content placement="right">更多操作</Tooltip.Content>
          </Tooltip>
          <Dropdown.Popover placement="bottom start">
            <Dropdown.Menu
              aria-label={`${workspace.name}操作`}
              onAction={(key) => {
                if (key === "rename") onRenameWorkspace(workspace);
                if (key === "remove") onRemove(workspace);
              }}
            >
              <Dropdown.Item id="rename" textValue="重命名工作区">
                <Pencil className="size-4 text-muted" />
                重命名工作区
              </Dropdown.Item>
              <Dropdown.Item className="text-danger" id="remove" textValue="移除工作区">
                <Trash2 className="size-4 text-danger" />
                移除工作区
              </Dropdown.Item>
            </Dropdown.Menu>
          </Dropdown.Popover>
        </Dropdown>
        <Tooltip delay={0}>
          <Sidebar.MenuAction aria-label={`在 ${workspace.name} 中新建对话`} onPress={onNewThread}>
            <Plus />
          </Sidebar.MenuAction>
          <Tooltip.Content placement="right">新对话</Tooltip.Content>
        </Tooltip>
      </Sidebar.MenuActions>
      <Sidebar.Submenu>
        {threads.map((thread) => (
          <ChatSidebarThreadItem
            key={thread.id}
            basePath={basePath}
            disableNavigation={disableNavigation}
            idPrefix={idPrefix}
            onArchive={onArchive}
            onRename={onRename}
            pathname={pathname}
            thread={thread}
          />
        ))}
      </Sidebar.Submenu>
    </Sidebar.MenuItem>
  );
}

interface ChatSidebarThreadItemProps {
  basePath: string;
  disableNavigation: boolean;
  idPrefix: string;
  onArchive: (thread: ChatThread) => void;
  onRename: (thread: ChatThread) => void;
  pathname: string;
  thread: ChatThread;
}

function ChatSidebarThreadItem({
  basePath,
  disableNavigation,
  idPrefix,
  onArchive,
  onRename,
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
      data-thread-item
      id={`${idPrefix}${thread.id}`}
      isCurrent={isCurrent}
      textValue={thread.title}
      {...(!disableNavigation ? { href: fullHref } : {})}
    >
      <Sidebar.MenuLabel>{thread.title}</Sidebar.MenuLabel>
      <Sidebar.MenuChip>{formatChatTimestamp(thread.updatedAt)}</Sidebar.MenuChip>
      <Sidebar.MenuActions className="absolute end-2 w-12 justify-end">
        <Dropdown>
          <Tooltip delay={0}>
            <Dropdown.Trigger
              aria-label={`更多操作：${thread.title}`}
              className="sidebar__menu-action"
            >
              <Ellipsis />
            </Dropdown.Trigger>
            <Tooltip.Content placement="right">更多操作</Tooltip.Content>
          </Tooltip>
          <Dropdown.Popover placement="bottom start">
            <Dropdown.Menu
              aria-label={`${thread.title}操作`}
              onAction={(key) => {
                if (key === "rename") onRename(thread);
                if (key === "archive") onArchive(thread);
              }}
            >
              <Dropdown.Item id="rename" textValue="重命名">
                <Pencil className="size-4 text-muted" />
                重命名
              </Dropdown.Item>
              <Dropdown.Item id="archive" textValue="归档">
                <Archive className="size-4 text-muted" />
                归档
              </Dropdown.Item>
            </Dropdown.Menu>
          </Dropdown.Popover>
        </Dropdown>
      </Sidebar.MenuActions>
    </Sidebar.MenuItem>
  );
}
