import { create } from "zustand";

export interface NewChatDraft {
  id: number;
  prompt: string;
  skillLabel?: string;
  skillName?: string;
}

export interface StartNewChatDraftInput extends Omit<NewChatDraft, "id"> {
  workspaceId: string;
}

interface NewChatState {
  clearDraft: () => void;
  draft: NewChatDraft | null;
  draftVersion: number;
  workspaceId: string | null;
  setWorkspaceId: (workspaceId: string) => void;
  startDraft: (input: StartNewChatDraftInput) => void;
}

export const useNewChatStore = create<NewChatState>((set) => ({
  clearDraft: () => set({ draft: null }),
  draft: null,
  draftVersion: 0,
  workspaceId: null,
  setWorkspaceId: (workspaceId) => set({ workspaceId }),
  startDraft: ({ prompt, skillLabel, skillName, workspaceId }) =>
    set((state) => {
      const draftVersion = state.draftVersion + 1;
      return {
        draft: {
          id: draftVersion,
          prompt,
          ...(skillLabel ? { skillLabel } : {}),
          ...(skillName ? { skillName } : {}),
        },
        draftVersion,
        workspaceId,
      };
    }),
}));
