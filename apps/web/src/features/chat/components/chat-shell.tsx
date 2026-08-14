"use client";

import { AppLayout } from "@agile-avocation/ui-pro";
import { AlertDialog, Button, Input, Modal, TextField } from "@heroui/react";
import { useRouter, useRouterState } from "@tanstack/react-router";
import type { FormEvent, ReactNode } from "react";
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
import { ChatSidebar } from "./chat-sidebar";

export interface ChatShellProps {
  children: ReactNode;
  basePath?: string;
  disableNavigation?: boolean;
}

type RenameTarget =
  | { kind: "thread"; value: ChatThread }
  | { kind: "workspace"; value: ChatWorkspace };

export function ChatShell({ basePath = "", children, disableNavigation = false }: ChatShellProps) {
  const router = useRouter();
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [threads, setThreads] = useState<ChatThread[]>(() => [...CHAT_THREADS]);
  const [workspaces, setWorkspaces] = useState<ChatWorkspace[]>(() => [...CHAT_WORKSPACES]);
  const [archivedThreads, setArchivedThreads] = useState<ChatThread[]>([]);
  const [renamingTarget, setRenamingTarget] = useState<RenameTarget | null>(null);
  const [removingWorkspace, setRemovingWorkspace] = useState<ChatWorkspace | null>(null);
  const [renameValue, setRenameValue] = useState("");

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

  const handleRename = (thread: ChatThread) => {
    setRenamingTarget({ kind: "thread", value: thread });
    setRenameValue(thread.title);
  };

  const handleRenameWorkspace = (workspace: ChatWorkspace) => {
    setRenamingTarget({ kind: "workspace", value: workspace });
    setRenameValue(workspace.name);
  };

  const handleRenameSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const title = renameValue.trim();

    if (!renamingTarget || !title) return;

    if (renamingTarget.kind === "thread") {
      setThreads((current) =>
        current.map((thread) =>
          thread.id === renamingTarget.value.id ? { ...thread, title } : thread,
        ),
      );
    } else {
      setWorkspaces((current) =>
        current.map((workspace) =>
          workspace.id === renamingTarget.value.id ? { ...workspace, name: title } : workspace,
        ),
      );
    }

    setRenamingTarget(null);
  };

  const handleArchive = (thread: ChatThread) => {
    setThreads((current) => current.filter((item) => item.id !== thread.id));
    setArchivedThreads((current) => [thread, ...current.filter((item) => item.id !== thread.id)]);

    if (activePage.kind === "thread" && activePage.thread.id === thread.id) {
      router.history.push(`${basePath}/new`);
    }
  };

  const handleRemoveWorkspace = () => {
    if (!removingWorkspace) return;

    setWorkspaces((current) =>
      current.filter((workspace) => workspace.id !== removingWorkspace.id),
    );
    setThreads((current) =>
      current.filter((thread) => thread.workspaceId !== removingWorkspace.id),
    );

    if (activePage.kind === "thread" && activePage.thread.workspaceId === removingWorkspace.id) {
      router.history.push(`${basePath}/new`);
    }

    setRemovingWorkspace(null);
  };

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
      navigate={navigate}
      sidebarCollapsible="offcanvas"
      navbar={
        <ChatNavbar
          activePage={activePage}
          onSearch={disableNavigation ? undefined : () => setIsSearchOpen(true)}
        />
      }
      sidebar={
        <ChatSidebar
          basePath={basePath}
          disableNavigation={disableNavigation}
          onArchive={handleArchive}
          onNewThread={() => navigate("/new")}
          onRename={handleRename}
          onRemoveWorkspace={setRemovingWorkspace}
          onRenameWorkspace={handleRenameWorkspace}
          onSettings={() => setIsSettingsOpen(true)}
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
      <Modal.Backdrop
        isOpen={renamingTarget !== null}
        onOpenChange={(isOpen) => {
          if (!isOpen) setRenamingTarget(null);
        }}
      >
        <Modal.Container>
          <Modal.Dialog className="sm:max-w-md">
            <form onSubmit={handleRenameSubmit}>
              <Modal.Header>
                <Modal.Heading>
                  {renamingTarget?.kind === "workspace" ? "重命名工作区" : "重命名对话"}
                </Modal.Heading>
              </Modal.Header>
              <Modal.Body>
                <TextField
                  aria-label={renamingTarget?.kind === "workspace" ? "工作区名称" : "对话名称"}
                  fullWidth
                  value={renameValue}
                  variant="secondary"
                  onChange={setRenameValue}
                >
                  <Input autoFocus />
                </TextField>
              </Modal.Body>
              <Modal.Footer>
                <Button type="button" variant="tertiary" onPress={() => setRenamingTarget(null)}>
                  取消
                </Button>
                <Button isDisabled={!renameValue.trim()} type="submit">
                  保存
                </Button>
              </Modal.Footer>
            </form>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
      <AlertDialog.Backdrop
        isOpen={removingWorkspace !== null}
        onOpenChange={(isOpen) => {
          if (!isOpen) setRemovingWorkspace(null);
        }}
      >
        <AlertDialog.Container>
          <AlertDialog.Dialog className="sm:max-w-[400px]">
            <AlertDialog.Header>
              <AlertDialog.Icon status="warning" />
              <AlertDialog.Heading>移除 {removingWorkspace?.name}？</AlertDialog.Heading>
            </AlertDialog.Header>
            <AlertDialog.Body>
              <p>该工作区及其对话将从侧边栏中移除，不会删除本地文件。</p>
            </AlertDialog.Body>
            <AlertDialog.Footer>
              <Button slot="close" variant="tertiary">
                取消
              </Button>
              <Button variant="danger" onPress={handleRemoveWorkspace}>
                移除工作区
              </Button>
            </AlertDialog.Footer>
          </AlertDialog.Dialog>
        </AlertDialog.Container>
      </AlertDialog.Backdrop>
    </AppLayout>
  );
}
