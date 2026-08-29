"use client";

import { AppLayout } from "@agile-avocation/ui-pro";
import { toast } from "@heroui/react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter, useRouterState } from "@tanstack/react-router";
import { groupBy } from "es-toolkit";
import { useReducedMotion } from "motion/react";
import type { ReactNode } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  type ArchivedConversationsState,
  SettingsDialog,
  type SkillChatDraft,
} from "../../settings";
import { updateSession } from "../api/session-api";
import {
  archivedSessionListQueryOptions,
  sessionListQueryOptions,
  sessionQueryKeys,
} from "../api/session-queries";
import {
  removeWorkspace,
  reorderWorkspaces,
  revealWorkspace,
  updateWorkspace,
} from "../api/workspace-api";
import { workspaceListQueryOptions, workspaceQueryKeys } from "../api/workspace-queries";
import type { ChatActivePage, ChatNavItemId, ChatThread, ChatWorkspace } from "../data/chat";
import { CHAT_NAV_ITEMS, resolveChatActivePage } from "../data/chat";
import { useAddWorkspace } from "../hooks/use-add-workspace";
import { useNewChatStore } from "../state/new-chat-store";
import { useWorkspaceInspectorStore } from "../state/workspace-inspector-store";
import { sessionToChatThread } from "../utils/session-messages";
import { ChatNavbar } from "./chat-navbar";
import { ChatSearchDialog } from "./chat-search-dialog";
import { ChatRenameDialog, type ChatRenameTarget } from "./chat-shell-dialogs";
import { ChatSidebar } from "./chat-sidebar";
import { WorkspaceInspector } from "./workspace-inspector";

export interface ChatShellProps {
  children: ReactNode;
  basePath?: string;
  disableNavigation?: boolean;
}

const INSPECTOR_DEFAULT_WIDTH = 460;
const INSPECTOR_MIN_WIDTH = 360;

export function ChatShell({ basePath = "", children, disableNavigation = false }: ChatShellProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const shouldReduceMotion = useReducedMotion();
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [renameTarget, setRenameTarget] = useState<ChatRenameTarget | null>(null);
  const [isDesktopLayout, setIsDesktopLayout] = useState(
    () => window.matchMedia("(min-width: 1025px)").matches,
  );
  const sessionsQuery = useQuery(sessionListQueryOptions());
  const archivedSessionsQuery = useQuery({
    ...archivedSessionListQueryOptions(),
    enabled: isSettingsOpen,
  });
  const workspacesQuery = useQuery(workspaceListQueryOptions());
  const addWorkspaceMutation = useAddWorkspace();
  const clearNewChatDraft = useNewChatStore((state) => state.clearDraft);
  const newChatWorkspaceId = useNewChatStore((state) => state.workspaceId);
  const setNewChatWorkspaceId = useNewChatStore((state) => state.setWorkspaceId);
  const startNewChatDraft = useNewChatStore((state) => state.startDraft);
  const inspectorFiles = useWorkspaceInspectorStore((state) => state.files);
  const inspectorSelectedPath = useWorkspaceInspectorStore((state) => state.selectedPath);
  const inspectorTurnId = useWorkspaceInspectorStore((state) => state.turnId);
  const closeInspector = useWorkspaceInspectorStore((state) => state.close);
  const threads = useMemo<ChatThread[]>(
    () => (sessionsQuery.data ?? []).map((session) => sessionToChatThread(session)),
    [sessionsQuery.data],
  );
  const workspaces = workspacesQuery.data ?? [];
  const archivedConversations = useMemo<ArchivedConversationsState>(() => {
    if (archivedSessionsQuery.isPending || workspacesQuery.isPending) return { status: "pending" };
    const error = archivedSessionsQuery.error ?? workspacesQuery.error;
    if (error) {
      return {
        message: error instanceof Error ? error.message : "加载已归档对话失败",
        status: "error",
      };
    }

    const sessionsByWorkspace = groupBy(
      archivedSessionsQuery.data ?? [],
      (session) => session.workspaceId,
    );
    return {
      status: "ready",
      workspaces: workspaces.flatMap((workspace) => {
        const sessions = sessionsByWorkspace[workspace.id] ?? [];
        return sessions.length === 0
          ? []
          : [
              {
                conversations: sessions.map((session) => ({
                  id: session.id,
                  title: session.title,
                  updatedAt: new Date(session.updatedAt).toISOString(),
                })),
                id: workspace.id,
                name: workspace.name,
              },
            ];
      }),
    };
  }, [
    archivedSessionsQuery.data,
    archivedSessionsQuery.error,
    archivedSessionsQuery.isPending,
    workspaces,
    workspacesQuery.error,
    workspacesQuery.isPending,
  ]);

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
  const activeThreadId = isThreadPage ? activePage.thread.id : null;
  const currentWorkspaceId = isThreadPage
    ? activePage.thread.workspaceId
    : (newChatWorkspaceId ?? workspaces[0]?.id ?? null);
  const isInspectorVisible = isThreadPage && inspectorTurnId !== null;

  const handleNavAction = useCallback(
    (id: ChatNavItemId) => {
      if (disableNavigation) return;
      const item = CHAT_NAV_ITEMS.find((entry) => entry.id === id);

      if (item?.href) {
        if (item.href === "/new") clearNewChatDraft();
        router.history.push(basePath + item.href);
      }
    },
    [basePath, clearNewChatDraft, disableNavigation, router],
  );

  const handleThreadSelect = useCallback(
    (thread: ChatThread) => {
      setIsSearchOpen(false);
      if (!disableNavigation) router.history.push(`${basePath}/${thread.id}`);
    },
    [router, basePath, disableNavigation],
  );

  const handleInspectorOpenChange = useCallback(
    (isOpen: boolean) => {
      if (!isOpen) closeInspector();
    },
    [closeInspector],
  );

  const handleSearchOpen = useCallback(() => {
    setIsSearchOpen(true);
  }, []);

  const handleSettingsOpen = useCallback(() => {
    setIsSettingsOpen(true);
  }, []);

  const handleNewThread = useCallback(
    (workspace: ChatWorkspace) => {
      clearNewChatDraft();
      setNewChatWorkspaceId(workspace.id);
      navigate("/new");
    },
    [clearNewChatDraft, navigate, setNewChatWorkspaceId],
  );

  const handleStartSkillChat = useCallback(
    (draft: SkillChatDraft) => {
      if (disableNavigation) return;
      startNewChatDraft(draft);
      setIsSettingsOpen(false);
      navigate("/new");
    },
    [disableNavigation, navigate, startNewChatDraft],
  );

  const handleAddWorkspace = useCallback(() => {
    void addWorkspaceMutation.mutateAsync().catch((error: unknown) => {
      toast.danger(error instanceof Error ? error.message : "添加工作区失败");
    });
  }, [addWorkspaceMutation]);

  const refreshSessions = useCallback(
    () => queryClient.invalidateQueries({ queryKey: sessionQueryKeys.list() }),
    [queryClient],
  );

  const handleRenameThread = useCallback((thread: ChatThread) => {
    setRenameTarget({ kind: "thread", value: thread });
  }, []);

  const handleEditWorkspace = useCallback((workspace: ChatWorkspace) => {
    setRenameTarget({ kind: "workspace", value: workspace });
  }, []);

  const handleRename = useCallback(
    (target: ChatRenameTarget, title: string) => {
      if (target.kind === "workspace") {
        void updateWorkspace(target.value.id, title)
          .then((workspace) => {
            queryClient.setQueryData<readonly ChatWorkspace[]>(
              workspaceQueryKeys.list(),
              (current) =>
                (current ?? []).map((item) => (item.id === workspace.id ? workspace : item)),
            );
          })
          .catch((error: unknown) => {
            toast.danger(error instanceof Error ? error.message : "编辑工作区失败");
          });
        return;
      }
      void updateSession(target.value.id, { title })
        .then(refreshSessions)
        .catch((error: unknown) => {
          toast.danger(error instanceof Error ? error.message : "重命名对话失败");
        });
    },
    [queryClient, refreshSessions],
  );

  const handleRevealWorkspace = useCallback((workspace: Pick<ChatWorkspace, "id">) => {
    void revealWorkspace(workspace.id).catch((error: unknown) => {
      toast.danger(error instanceof Error ? error.message : "无法显示工作区目录");
    });
  }, []);

  const handleRemoveWorkspace = useCallback(
    (workspace: ChatWorkspace) => {
      void removeWorkspace(workspace.id)
        .then(() =>
          Promise.all([
            queryClient.invalidateQueries({ queryKey: workspaceQueryKeys.list() }),
            queryClient.invalidateQueries({ queryKey: sessionQueryKeys.list() }),
          ]),
        )
        .then(() => {
          if (activePage.kind === "thread" && activePage.thread.workspaceId === workspace.id) {
            clearNewChatDraft();
            navigate("/new");
          }
        })
        .catch((error: unknown) => {
          toast.danger(error instanceof Error ? error.message : "移除项目失败");
        });
    },
    [activePage, clearNewChatDraft, navigate, queryClient],
  );

  const handleReorderWorkspaces = useCallback(
    (workspaceIds: readonly string[]) => {
      const workspaceById = new Map(workspaces.map((workspace) => [workspace.id, workspace]));
      const reordered = workspaceIds.flatMap((workspaceId) => {
        const workspace = workspaceById.get(workspaceId);
        return workspace ? [workspace] : [];
      });
      if (reordered.length !== workspaces.length) return;

      queryClient.setQueryData(workspaceQueryKeys.list(), reordered);
      void reorderWorkspaces(workspaceIds)
        .then((savedWorkspaces) => {
          queryClient.setQueryData(workspaceQueryKeys.list(), savedWorkspaces);
        })
        .catch((error: unknown) => {
          void queryClient.invalidateQueries({ queryKey: workspaceQueryKeys.list() });
          toast.danger(error instanceof Error ? error.message : "调整工作区顺序失败");
        });
    },
    [queryClient, workspaces],
  );

  const handleArchive = useCallback(
    (thread: ChatThread) => {
      void updateSession(thread.id, { archived: true })
        .then(() => queryClient.invalidateQueries({ queryKey: sessionQueryKeys.all }))
        .then(() => {
          if (activePage.kind === "thread" && activePage.thread.id === thread.id) {
            clearNewChatDraft();
            navigate("/new");
          }
        })
        .catch((error: unknown) => {
          toast.danger(error instanceof Error ? error.message : "归档对话失败");
        });
    },
    [activePage, clearNewChatDraft, navigate, queryClient],
  );

  const handleRestoreArchivedConversation = useCallback(
    async (conversationId: string) => {
      await updateSession(conversationId, { archived: false });
      await queryClient.invalidateQueries({ queryKey: sessionQueryKeys.all });
    },
    [queryClient],
  );

  useEffect(() => {
    const mediaQuery = window.matchMedia("(min-width: 1025px)");
    const handleChange = () => setIsDesktopLayout(mediaQuery.matches);

    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  useEffect(() => {
    closeInspector();
  }, [activeThreadId, closeInspector]);

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
      aside={
        isInspectorVisible && activePage.kind === "thread" ? (
          <WorkspaceInspector
            files={inspectorFiles}
            key={`${activePage.thread.id}:${inspectorTurnId}`}
            selectedPath={inspectorSelectedPath}
            workspaceId={activePage.thread.workspaceId}
            onClose={closeInspector}
          />
        ) : (
          <div aria-hidden className="h-full w-full" />
        )
      }
      asideDefaultSize={`${INSPECTOR_DEFAULT_WIDTH}px`}
      asideMaxSize="50%"
      asideMinSize={`${INSPECTOR_MIN_WIDTH}px`}
      asideMobile="sheet"
      asideOpen={isInspectorVisible}
      asideResizable={isDesktopLayout}
      asideResizeBehavior="preserve-pixel-size"
      defaultAsideOpen={false}
      navigate={navigate}
      reduceMotion={shouldReduceMotion ?? false}
      resizableAutoSaveId="chat-workspace-inspector-v2"
      scrollMode="content"
      sidebarCollapsible="offcanvas"
      onAsideOpenChange={handleInspectorOpenChange}
      navbar={
        <ChatNavbar
          activePage={activePage}
          onSearch={disableNavigation ? undefined : handleSearchOpen}
        />
      }
      sidebar={
        <ChatSidebar
          basePath={basePath}
          disableNavigation={disableNavigation}
          isAddingWorkspace={addWorkspaceMutation.isPending}
          isPending={sessionsQuery.isPending || workspacesQuery.isPending}
          onAddWorkspace={handleAddWorkspace}
          onArchive={handleArchive}
          onNewThread={handleNewThread}
          onRename={handleRenameThread}
          onRemoveWorkspace={handleRemoveWorkspace}
          onReorderWorkspaces={handleReorderWorkspaces}
          onRenameWorkspace={handleEditWorkspace}
          onRevealWorkspace={handleRevealWorkspace}
          onSettings={handleSettingsOpen}
          pathname={pathname || "/new"}
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
      {renameTarget ? (
        <ChatRenameDialog
          target={renameTarget}
          onClose={() => setRenameTarget(null)}
          onRename={handleRename}
        />
      ) : null}
      <SettingsDialog
        archivedConversations={archivedConversations}
        currentWorkspaceId={currentWorkspaceId}
        isOpen={isSettingsOpen}
        workspaces={workspaces}
        onRestoreArchivedConversation={handleRestoreArchivedConversation}
        onOpenChange={setIsSettingsOpen}
        onStartSkillChat={handleStartSkillChat}
      />
    </AppLayout>
  );
}
