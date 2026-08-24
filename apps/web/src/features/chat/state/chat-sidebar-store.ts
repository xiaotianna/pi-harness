import { create } from "zustand";
import { persist } from "zustand/middleware";

interface ChatSidebarState {
  collapsedWorkspaceIds: readonly string[];
  setCollapsedWorkspaceIds: (workspaceIds: readonly string[]) => void;
}

export const useChatSidebarStore = create<ChatSidebarState>()(
  persist(
    (set) => ({
      collapsedWorkspaceIds: [],
      setCollapsedWorkspaceIds: (collapsedWorkspaceIds) => set({ collapsedWorkspaceIds }),
    }),
    { name: "pi-harness-chat-sidebar" },
  ),
);
