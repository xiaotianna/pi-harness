"use client";

import { Sidebar } from "@agile-avocation/ui-pro";
import {
  Archive,
  Ellipsis,
  Folder,
  FolderFill,
  FolderOpen,
  FolderOpenFill,
  Pencil,
  Plus,
  TrashBin as Trash2,
} from "@gravity-ui/icons";
import { Dropdown, Kbd, Separator, Tooltip } from "@heroui/react";
import type { DragEvent, KeyboardEvent } from "react";
import { memo, useState } from "react";
import { formatChatTimestamp } from "../../../shared/utils/format-chat-timestamp";
import { UserMenu } from "../../auth";
import type { ChatNavItem, ChatNavItemId, ChatThread, ChatWorkspace } from "../data/chat";
import { CHAT_NAV_ITEMS, resolveChatActivePage } from "../data/chat";
import { useChatSidebarStore } from "../state/chat-sidebar-store";
import { useNewChatStore } from "../state/new-chat-store";

export interface ChatSidebarProps {
  threads: readonly ChatThread[];
  workspaces: readonly ChatWorkspace[];
  pathname: string;
  basePath: string;
  disableNavigation?: boolean;
  isAddingWorkspace?: boolean;
  onAddWorkspace?: (() => void) | undefined;
  onArchive?: ((thread: ChatThread) => void) | undefined;
  onAction?: ((id: ChatNavItemId) => void) | undefined;
  onNewThread: (workspace: ChatWorkspace) => void;
  onRename?: ((thread: ChatThread) => void) | undefined;
  onRemoveWorkspace?: ((workspace: ChatWorkspace) => void) | undefined;
  onReorderWorkspaces?: ((workspaceIds: readonly string[]) => void) | undefined;
  onRevealWorkspace?: ((workspace: ChatWorkspace) => void) | undefined;
  onRenameWorkspace?: ((workspace: ChatWorkspace) => void) | undefined;
  onSettings: () => void;
}

export const ChatSidebar = memo(function ChatSidebar({
  basePath,
  disableNavigation = false,
  isAddingWorkspace = false,
  onAddWorkspace,
  onArchive,
  onAction,
  onNewThread,
  onRename,
  onRemoveWorkspace,
  onReorderWorkspaces,
  onRevealWorkspace,
  onRenameWorkspace,
  onSettings,
  pathname,
  threads,
  workspaces,
}: ChatSidebarProps) {
  const contentProps = {
    basePath,
    disableNavigation,
    isAddingWorkspace,
    onAddWorkspace,
    onArchive,
    onAction,
    onNewThread,
    onRename,
    onRemoveWorkspace,
    onReorderWorkspaces,
    onRevealWorkspace,
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
});

interface SidebarContentsProps extends ChatSidebarProps {
  idPrefix?: string;
}

function SidebarContents({
  basePath,
  disableNavigation,
  idPrefix = "",
  isAddingWorkspace = false,
  onAddWorkspace,
  onArchive,
  onAction,
  onNewThread,
  onRename,
  onRemoveWorkspace,
  onReorderWorkspaces,
  onRevealWorkspace,
  onRenameWorkspace,
  onSettings,
  pathname,
  threads,
  workspaces,
}: SidebarContentsProps) {
  const activePage = resolveChatActivePage(pathname, basePath, threads);
  const collapsedWorkspaceIds = useChatSidebarStore((state) => state.collapsedWorkspaceIds);
  const setCollapsedWorkspaceIds = useChatSidebarStore((state) => state.setCollapsedWorkspaceIds);
  const newChatWorkspaceId = useNewChatStore((state) => state.workspaceId);
  const [draggedWorkspaceId, setDraggedWorkspaceId] = useState<string | null>(null);
  const [workspaceDropTarget, setWorkspaceDropTarget] = useState<{
    id: string;
    position: "after" | "before";
  } | null>(null);
  const canReorderWorkspaces = workspaces.length > 1 && Boolean(onReorderWorkspaces);
  const activeWorkspaceId =
    activePage.kind === "thread"
      ? activePage.thread.workspaceId
      : activePage.kind === "new"
        ? (workspaces.find((workspace) => workspace.id === newChatWorkspaceId)?.id ??
          workspaces[0]?.id)
        : undefined;

  const clearWorkspaceDrag = () => {
    setDraggedWorkspaceId(null);
    setWorkspaceDropTarget(null);
  };

  const handleWorkspaceDragStart = (event: DragEvent<HTMLDivElement>) => {
    const item =
      event.target instanceof Element
        ? event.target.closest<HTMLElement>("[data-workspace-id]")
        : null;
    const workspaceId = item?.dataset.workspaceId;
    if (!canReorderWorkspaces || !workspaceId) {
      event.preventDefault();
      return;
    }

    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", workspaceId);
    const preview = item
      .querySelector<HTMLElement>("[data-slot='sidebar-menu-item-content']")
      ?.cloneNode(true);
    if (preview instanceof HTMLElement) {
      preview.querySelector("[data-slot='sidebar-menu-trigger']")?.remove();
      preview.querySelector("[data-slot='sidebar-menu-actions']")?.remove();
      preview.classList.add("sidebar__workspace-drag-preview");
      preview.style.width = `${Math.min(item.offsetWidth, 320)}px`;
      document.body.append(preview);
      event.dataTransfer.setDragImage(preview, 20, preview.offsetHeight / 2);
      requestAnimationFrame(() => preview.remove());
    }
    setDraggedWorkspaceId(workspaceId);
  };

  const handleWorkspaceDragOver = (event: DragEvent<HTMLDivElement>) => {
    const item =
      event.target instanceof Element
        ? event.target.closest<HTMLElement>("[data-workspace-id]")
        : null;
    const workspaceId = item?.dataset.workspaceId;
    if (!item || !workspaceId || !draggedWorkspaceId || workspaceId === draggedWorkspaceId) return;

    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    const position = event.clientY < item.getBoundingClientRect().top + item.offsetHeight / 2;
    setWorkspaceDropTarget({ id: workspaceId, position: position ? "before" : "after" });
  };

  const handleWorkspaceDrop = (event: DragEvent<HTMLDivElement>) => {
    const item =
      event.target instanceof Element
        ? event.target.closest<HTMLElement>("[data-workspace-id]")
        : null;
    const targetId = item?.dataset.workspaceId;
    if (!item || !targetId || !draggedWorkspaceId || targetId === draggedWorkspaceId) {
      clearWorkspaceDrag();
      return;
    }

    event.preventDefault();
    const reordered = workspaces.filter((workspace) => workspace.id !== draggedWorkspaceId);
    const targetIndex = reordered.findIndex((workspace) => workspace.id === targetId);
    if (targetIndex < 0) {
      clearWorkspaceDrag();
      return;
    }
    const draggedWorkspace = workspaces.find((workspace) => workspace.id === draggedWorkspaceId);
    if (!draggedWorkspace) {
      clearWorkspaceDrag();
      return;
    }
    const isAfter = event.clientY >= item.getBoundingClientRect().top + item.offsetHeight / 2;
    reordered.splice(isAfter ? targetIndex + 1 : targetIndex, 0, draggedWorkspace);
    if (!reordered.every((workspace, index) => workspace.id === workspaces[index]?.id)) {
      onReorderWorkspaces?.(reordered.map((workspace) => workspace.id));
    }
    clearWorkspaceDrag();
  };

  const handleWorkspaceKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (!event.altKey || (event.key !== "ArrowUp" && event.key !== "ArrowDown")) return;
    const item =
      event.target instanceof Element
        ? event.target.closest<HTMLElement>("[data-workspace-id]")
        : null;
    const workspaceId = item?.dataset.workspaceId;
    const currentIndex = workspaces.findIndex((workspace) => workspace.id === workspaceId);
    const targetIndex = currentIndex + (event.key === "ArrowUp" ? -1 : 1);
    if (
      !onReorderWorkspaces ||
      currentIndex < 0 ||
      targetIndex < 0 ||
      targetIndex >= workspaces.length
    ) {
      return;
    }

    event.preventDefault();
    const reordered = [...workspaces];
    const [workspace] = reordered.splice(currentIndex, 1);
    if (!workspace) return;
    reordered.splice(targetIndex, 0, workspace);
    onReorderWorkspaces(reordered.map((item) => item.id));
  };

  return (
    <>
      <Sidebar.Header className="px-3 pt-4 pb-0">
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
              <Sidebar.MenuAction
                aria-label="添加工作区"
                className="-my-1"
                isDisabled={isAddingWorkspace || !onAddWorkspace}
                {...(onAddWorkspace ? { onPress: onAddWorkspace } : {})}
              >
                <Plus className="!size-3.5 text-muted" />
              </Sidebar.MenuAction>
              <Tooltip.Content placement="right">添加工作区</Tooltip.Content>
            </Tooltip>
          </Sidebar.GroupLabel>
        </Sidebar.Group>
      </Sidebar.Header>
      <Sidebar.Content className="session-scrollbar session-scrollbars pt-1" hideScrollBar={false}>
        <Sidebar.Group
          onDragEnd={clearWorkspaceDrag}
          onDragOver={handleWorkspaceDragOver}
          onDragStart={handleWorkspaceDragStart}
          onDrop={handleWorkspaceDrop}
        >
          <Sidebar.Menu
            aria-label="工作区"
            expandedKeys={workspaces.flatMap((workspace) =>
              collapsedWorkspaceIds.includes(workspace.id)
                ? []
                : [`${idPrefix}workspace-${workspace.id}`],
            )}
            showGuideLines={false}
            onExpandedChange={(expandedKeys) =>
              setCollapsedWorkspaceIds(
                workspaces.flatMap((workspace) =>
                  expandedKeys.has(`${idPrefix}workspace-${workspace.id}`) ? [] : [workspace.id],
                ),
              )
            }
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
                onReveal={onRevealWorkspace}
                onRename={onRename}
                onRenameWorkspace={onRenameWorkspace}
                pathname={pathname}
                dropPosition={
                  workspaceDropTarget?.id === workspace.id ? workspaceDropTarget.position : null
                }
                isDraggable={canReorderWorkspaces}
                isDragging={draggedWorkspaceId === workspace.id}
                isCurrent={activeWorkspaceId === workspace.id}
                threads={threads.filter((thread) => thread.workspaceId === workspace.id)}
                workspace={workspace}
                onKeyDown={handleWorkspaceKeyDown}
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
  isDraggable: boolean;
  isDragging: boolean;
  isCurrent: boolean;
  onArchive?: ((thread: ChatThread) => void) | undefined;
  onNewThread: (workspace: ChatWorkspace) => void;
  onRemove?: ((workspace: ChatWorkspace) => void) | undefined;
  onReveal?: ((workspace: ChatWorkspace) => void) | undefined;
  onRename?: ((thread: ChatThread) => void) | undefined;
  onRenameWorkspace?: ((workspace: ChatWorkspace) => void) | undefined;
  pathname: string;
  dropPosition: "after" | "before" | null;
  threads: readonly ChatThread[];
  workspace: ChatWorkspace;
  onKeyDown: (event: KeyboardEvent<HTMLDivElement>) => void;
}

function ChatSidebarWorkspaceItem({
  basePath,
  disableNavigation,
  dropPosition,
  idPrefix,
  isDraggable,
  isDragging,
  isCurrent,
  onArchive,
  onNewThread,
  onRemove,
  onReveal,
  onRename,
  onRenameWorkspace,
  onKeyDown,
  pathname,
  threads,
  workspace,
}: ChatSidebarWorkspaceItemProps) {
  const revealLabel =
    typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform)
      ? "在 Finder 中显示"
      : typeof navigator !== "undefined" && /Win/.test(navigator.platform)
        ? "在文件资源管理器中显示"
        : "在文件管理器中显示";

  return (
    <Sidebar.MenuItem
      data-dragging={isDragging || undefined}
      data-drop-position={dropPosition ?? undefined}
      data-workspace-item
      data-workspace-id={workspace.id}
      id={`${idPrefix}workspace-${workspace.id}`}
      render={(props) => (
        // biome-ignore lint/a11y/noStaticElementInteractions: React Aria supplies the TreeItem row semantics through these props.
        <div
          {...props}
          aria-keyshortcuts="Alt+ArrowUp Alt+ArrowDown"
          draggable={isDraggable}
          onKeyDown={(event) => {
            onKeyDown(event);
            if (!event.defaultPrevented) props.onKeyDown?.(event);
          }}
        />
      )}
      textValue={workspace.name}
    >
      <Sidebar.MenuTrigger className="order-first">
        <Sidebar.MenuIndicator />
      </Sidebar.MenuTrigger>
      <Sidebar.MenuIcon className="order-first" data-current-workspace={isCurrent || undefined}>
        <span aria-hidden className="sidebar__workspace-folder sidebar__workspace-folder-closed">
          <FolderFill className="sidebar__workspace-folder-fill" />
          <Folder />
        </span>
        <span aria-hidden className="sidebar__workspace-folder sidebar__workspace-folder-open">
          <FolderOpenFill className="sidebar__workspace-folder-fill" />
          <FolderOpen />
        </span>
      </Sidebar.MenuIcon>
      <Sidebar.MenuLabel className="pe-16">{workspace.name}</Sidebar.MenuLabel>
      <Sidebar.MenuActions className="absolute end-2 w-16 justify-end">
        {onRenameWorkspace || onReveal || onRemove ? (
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
                  if (key === "edit") onRenameWorkspace?.(workspace);
                  if (key === "reveal") onReveal?.(workspace);
                  if (key === "remove") onRemove?.(workspace);
                }}
              >
                {onRenameWorkspace ? (
                  <Dropdown.Item id="edit" textValue="编辑">
                    <Pencil className="size-4 text-muted" />
                    编辑
                  </Dropdown.Item>
                ) : null}
                {onReveal ? (
                  <Dropdown.Item id="reveal" textValue={revealLabel}>
                    <FolderOpen className="size-4 text-muted" />
                    {revealLabel}
                  </Dropdown.Item>
                ) : null}
                {onRemove && (onRenameWorkspace || onReveal) ? (
                  <Separator className="my-1" />
                ) : null}
                {onRemove ? (
                  <Dropdown.Item className="text-danger" id="remove" textValue="移除项目">
                    <Trash2 className="size-4 text-danger" />
                    移除项目
                  </Dropdown.Item>
                ) : null}
              </Dropdown.Menu>
            </Dropdown.Popover>
          </Dropdown>
        ) : null}
        <Tooltip delay={0}>
          <Sidebar.MenuAction
            aria-label={`在 ${workspace.name} 中新建对话`}
            onPress={() => onNewThread(workspace)}
          >
            <Plus />
          </Sidebar.MenuAction>
          <Tooltip.Content placement="right">新对话</Tooltip.Content>
        </Tooltip>
      </Sidebar.MenuActions>
      <Sidebar.Submenu>
        {threads.length === 0 ? (
          <Sidebar.MenuItem
            id={`${idPrefix}workspace-${workspace.id}-empty`}
            isDisabled
            textValue="暂无对话"
          >
            <Sidebar.MenuLabel>暂无对话</Sidebar.MenuLabel>
          </Sidebar.MenuItem>
        ) : (
          threads.map((thread) => (
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
          ))
        )}
      </Sidebar.Submenu>
    </Sidebar.MenuItem>
  );
}

interface ChatSidebarThreadItemProps {
  basePath: string;
  disableNavigation: boolean;
  idPrefix: string;
  onArchive?: ((thread: ChatThread) => void) | undefined;
  onRename?: ((thread: ChatThread) => void) | undefined;
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
  const isCurrent = pathname === fullHref || pathname === thread.id || pathname === `/${thread.id}`;

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
      {onRename || onArchive ? (
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
                  if (key === "rename") onRename?.(thread);
                  if (key === "archive") onArchive?.(thread);
                }}
              >
                {onRename ? (
                  <Dropdown.Item id="rename" textValue="重命名">
                    <Pencil className="size-4 text-muted" />
                    重命名
                  </Dropdown.Item>
                ) : null}
                {onArchive ? (
                  <Dropdown.Item id="archive" textValue="归档">
                    <Archive className="size-4 text-muted" />
                    归档
                  </Dropdown.Item>
                ) : null}
              </Dropdown.Menu>
            </Dropdown.Popover>
          </Dropdown>
        </Sidebar.MenuActions>
      ) : null}
    </Sidebar.MenuItem>
  );
}
