import { create } from "zustand";

export interface PendingFileOpen {
  path: string;
  workspaceId: string;
}

interface FileOpenState {
  pending: PendingFileOpen | null;
  close: () => void;
  requestApplication: (pending: PendingFileOpen) => void;
}

export const useFileOpenStore = create<FileOpenState>((set) => ({
  pending: null,
  close: () => set({ pending: null }),
  requestApplication: (pending) => set({ pending }),
}));
