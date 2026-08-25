import { create } from "zustand";

interface NewChatState {
  workspaceId: string | null;
  setWorkspaceId: (workspaceId: string) => void;
}

export const useNewChatStore = create<NewChatState>((set) => ({
  workspaceId: null,
  setWorkspaceId: (workspaceId) => set({ workspaceId }),
}));
