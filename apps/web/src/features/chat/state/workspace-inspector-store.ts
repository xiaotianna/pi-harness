import { create } from "zustand";
import type { ChatFileChange } from "../data/chat";

interface WorkspaceInspectorState {
  files: readonly ChatFileChange[];
  selectedPath: string | null;
  subAgent: { executionId: string | null; runId: string; sessionId: string } | null;
  turnId: string | null;
  close: () => void;
  open: (turnId: string, files: readonly ChatFileChange[], selectedPath: string | null) => void;
  openSubAgent: (sessionId: string, runId: string, executionId: string) => void;
  showSubAgentList: () => void;
}

export const useWorkspaceInspectorStore = create<WorkspaceInspectorState>((set) => ({
  files: [],
  selectedPath: null,
  subAgent: null,
  turnId: null,
  close: () => set({ files: [], selectedPath: null, subAgent: null, turnId: null }),
  open: (turnId, files, selectedPath) => set({ files, selectedPath, subAgent: null, turnId }),
  openSubAgent: (sessionId, runId, executionId) =>
    set({
      files: [],
      selectedPath: null,
      subAgent: { executionId, runId, sessionId },
      turnId: null,
    }),
  showSubAgentList: () =>
    set((state) => ({
      subAgent: state.subAgent ? { ...state.subAgent, executionId: null } : null,
    })),
}));
