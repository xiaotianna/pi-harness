import { create } from "zustand";
import { persist } from "zustand/middleware";

interface ChatSidebarState {
  collapsedWorkspaceIds: readonly string[];
  markSessionCompleted: (sessionId: string) => void;
  markSessionRead: (sessionId: string) => void;
  setCollapsedWorkspaceIds: (workspaceIds: readonly string[]) => void;
  unreadCompletedSessionIds: readonly string[];
}

export const useChatSidebarStore = create<ChatSidebarState>()(
  persist(
    (set) => ({
      collapsedWorkspaceIds: [],
      markSessionCompleted: (sessionId) =>
        set((state) =>
          state.unreadCompletedSessionIds.includes(sessionId)
            ? state
            : { unreadCompletedSessionIds: [...state.unreadCompletedSessionIds, sessionId] },
        ),
      markSessionRead: (sessionId) =>
        set((state) =>
          state.unreadCompletedSessionIds.includes(sessionId)
            ? {
                unreadCompletedSessionIds: state.unreadCompletedSessionIds.filter(
                  (id) => id !== sessionId,
                ),
              }
            : state,
        ),
      setCollapsedWorkspaceIds: (collapsedWorkspaceIds) => set({ collapsedWorkspaceIds }),
      unreadCompletedSessionIds: [],
    }),
    { name: "pi-harness-chat-sidebar" },
  ),
);
