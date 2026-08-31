import { create } from "zustand";

export interface ChatSearchTarget {
  messageEventId: string | null;
  query: string;
  sessionId: string;
}

interface ChatSearchTargetState {
  clearTarget: () => void;
  setTarget: (target: ChatSearchTarget) => void;
  target: ChatSearchTarget | null;
}

export const useChatSearchTargetStore = create<ChatSearchTargetState>()((set) => ({
  clearTarget: () => set({ target: null }),
  setTarget: (target) => set({ target }),
  target: null,
}));
