import { create } from "zustand";
import type { ChatFileChange } from "../data/chat";

interface WorkspaceInspectorState {
  files: readonly ChatFileChange[];
  selectedPath: string | null;
  turnId: string | null;
  close: () => void;
  open: (turnId: string, files: readonly ChatFileChange[], selectedPath: string | null) => void;
}

export const useWorkspaceInspectorStore = create<WorkspaceInspectorState>((set) => ({
  files: [],
  selectedPath: null,
  turnId: null,
  close: () => set({ files: [], selectedPath: null, turnId: null }),
  open: (turnId, files, selectedPath) => set({ files, selectedPath, turnId }),
}));
