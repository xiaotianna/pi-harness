"use client";

import { AppLayout } from "@agile-avocation/ui-pro";
import { useRouter, useRouterState } from "@tanstack/react-router";
import { useReducedMotion } from "motion/react";
import type { ReactNode } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { SettingsDialog } from "../../settings";
import type { ChatActivePage, ChatNavItemId, ChatThread, ChatWorkspace } from "../data/chat";
import {
  CHAT_NAV_ITEMS,
  CHAT_THREADS,
  CHAT_WORKSPACES,
  DEFAULT_CHAT_THREAD_ID,
  resolveChatActivePage,
} from "../data/chat";
import { ChatNavbar } from "./chat-navbar";
import { ChatSearchDialog } from "./chat-search-dialog";
import {
  ChatRenameDialog,
  type ChatRenameTarget,
  RemoveWorkspaceDialog,
} from "./chat-shell-dialogs";
import { ChatSidebar } from "./chat-sidebar";
import { WorkspaceInspector } from "./workspace-inspector";

export interface ChatShellProps {
  children: ReactNode;
  basePath?: string;
  disableNavigation?: boolean;
}

const INSPECTOR_DEFAULT_WIDTH = 500;
const INSPECTOR_MIN_WIDTH = 500;

export function ChatShell({ basePath = "", children, disableNavigation = false }: ChatShellProps) {
  const router = useRouter();
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const shouldReduceMotion = useReducedMotion();
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isInspectorOpen, setIsInspectorOpen] = useState(false);
  const [isDesktopLayout, setIsDesktopLayout] = useState(
    () => window.matchMedia("(min-width: 1025px)").matches,
  );
  const [threads, setThreads] = useState<ChatThread[]>(() => [...CHAT_THREADS]);
  const [workspaces, setWorkspaces] = useState<ChatWorkspace[]>(() => [...CHAT_WORKSPACES]);
  const [archivedThreads, setArchivedThreads] = useState<ChatThread[]>([]);
  const [renamingTarget, setRenamingTarget] = useState<ChatRenameTarget | null>(null);
  const [removingWorkspace, setRemovingWorkspace] = useState<ChatWorkspace | null>(null);

  const navigate = useCallback(
    (href: string) => {
      if (disableNavigation) return;
      router.history.push(basePath + href);
    },
    [router, basePath, disableNavigation],
  );

  const activePage = useMemo<ChatActivePage>(
    () => resolveChatActivePage(pathname, basePath, threads),
    [pathname, basePath, threads],
  );
  const isThreadPage = activePage.kind === "thread";
  const isInspectorVisible = isThreadPage && isInspectorOpen;

  const handleRename = useCallback((thread: ChatThread) => {
    setRenamingTarget({ kind: "thread", value: thread });
  }, []);

  const handleRenameWorkspace = useCallback((workspace: ChatWorkspace) => {
    setRenamingTarget({ kind: "workspace", value: workspace });
  }, []);

  const handleRenameCommit = useCallback((target: ChatRenameTarget, value: string) => {
    if (target.kind === "thread") {
      setThreads((current) =>
        current.map((thread) =>
          thread.id === target.value.id ? { ...thread, title: value } : thread,
        ),
      );
    } else {
      setWorkspaces((current) =>
        current.map((workspace) =>
          workspace.id === target.value.id ? { ...workspace, name: value } : workspace,
        ),
      );
    }
  }, []);

  const handleArchive = useCallback(
    (thread: ChatThread) => {
      setThreads((current) => current.filter((item) => item.id !== thread.id));
      setArchivedThreads((current) => [thread, ...current.filter((item) => item.id !== thread.id)]);

      if (activePage.kind === "thread" && activePage.thread.id === thread.id) {
        router.history.push(`${basePath}/new`);
      }
    },
    [activePage, basePath, router],
  );

  const handleRemoveWorkspace = useCallback(
    (workspace: ChatWorkspace) => {
      setWorkspaces((current) => current.filter((item) => item.id !== workspace.id));
      setThreads((current) => current.filter((thread) => thread.workspaceId !== workspace.id));

      if (activePage.kind === "thread" && activePage.thread.workspaceId === workspace.id) {
        router.history.push(`${basePath}/new`);
      }

      setRemovingWorkspace(null);
    },
    [activePage, basePath, router],
  );

  const handleNavAction = useCallback(
    (id: ChatNavItemId) => {
      if (disableNavigation) return;
      const item = CHAT_NAV_ITEMS.find((entry) => entry.id === id);

      if (item?.href) router.history.push(basePath + item.href);
    },
    [router, basePath, disableNavigation],
  );

  const handleThreadSelect = useCallback(
    (thread: ChatThread) => {
      setIsSearchOpen(false);
      if (!disableNavigation) router.history.push(`${basePath}/${thread.id}`);
    },
    [router, basePath, disableNavigation],
  );

  const handleInspectorToggle = useCallback(() => {
    setIsInspectorOpen((isOpen) => !isOpen);
  }, []);

  const handleInspectorOpenChange = useCallback(
    (isOpen: boolean) => {
      if (!isThreadPage && isOpen) return;

      setIsInspectorOpen(isOpen);
    },
    [isThreadPage],
  );

  const handleSearchOpen = useCallback(() => {
    setIsSearchOpen(true);
  }, []);

  const handleSettingsOpen = useCallback(() => {
    setIsSettingsOpen(true);
  }, []);

  const handleRenameClose = useCallback(() => {
    setRenamingTarget(null);
  }, []);

  const handleRemoveWorkspaceClose = useCallback(() => {
    setRemovingWorkspace(null);
  }, []);

  const handleNewThread = useCallback(() => {
    navigate("/new");
  }, [navigate]);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(min-width: 1025px)");
    const handleChange = () => setIsDesktopLayout(mediaQuery.matches);

    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  useEffect(() => {
    if (disableNavigation) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      const isMac = typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform);
      const metaPressed = isMac ? event.metaKey : event.ctrlKey;

      if (metaPressed && (event.key === "k" || event.key === "K")) {
        event.preventDefault();
        setIsSearchOpen((open) => !open);
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [disableNavigation]);

  return (
    <AppLayout
      aside={<WorkspaceInspector isOpen={isInspectorVisible} />}
      asideDefaultSize={`${INSPECTOR_DEFAULT_WIDTH}px`}
      asideMaxSize="50%"
      asideMinSize={`${INSPECTOR_MIN_WIDTH}px`}
      asideMobile="sheet"
      asideOpen={isInspectorVisible}
      asideResizable={isDesktopLayout}
      asideResizeBehavior="preserve-pixel-size"
      navigate={navigate}
      reduceMotion={shouldReduceMotion ?? false}
      resizableAutoSaveId="chat-workspace-inspector"
      scrollMode="content"
      sidebarCollapsible="offcanvas"
      onAsideOpenChange={handleInspectorOpenChange}
      navbar={
        <ChatNavbar
          activePage={activePage}
          isInspectorOpen={isInspectorVisible}
          onInspectorToggle={isThreadPage ? handleInspectorToggle : undefined}
          onSearch={disableNavigation ? undefined : handleSearchOpen}
        />
      }
      sidebar={
        <ChatSidebar
          basePath={basePath}
          disableNavigation={disableNavigation}
          onArchive={handleArchive}
          onNewThread={handleNewThread}
          onRename={handleRename}
          onRemoveWorkspace={setRemovingWorkspace}
          onRenameWorkspace={handleRenameWorkspace}
          onSettings={handleSettingsOpen}
          pathname={pathname || `/${DEFAULT_CHAT_THREAD_ID}`}
          threads={threads}
          workspaces={workspaces}
          onAction={handleNavAction}
        />
      }
    >
      {children}
      <ChatSearchDialog
        isOpen={isSearchOpen}
        threads={threads}
        onOpenChange={setIsSearchOpen}
        onSelect={handleThreadSelect}
      />
      <SettingsDialog
        archivedConversations={archivedThreads}
        isOpen={isSettingsOpen}
        onOpenChange={setIsSettingsOpen}
      />
      <ChatRenameDialog
        key={
          renamingTarget
            ? `${renamingTarget.kind}-${renamingTarget.value.id}`
            : "closed-rename-dialog"
        }
        target={renamingTarget}
        onClose={handleRenameClose}
        onRename={handleRenameCommit}
      />
      <RemoveWorkspaceDialog
        workspace={removingWorkspace}
        onClose={handleRemoveWorkspaceClose}
        onRemove={handleRemoveWorkspace}
      />
    </AppLayout>
  );
}
