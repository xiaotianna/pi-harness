import { create } from "zustand";

interface ModelSettingsState {
  conversationModelKeys: Readonly<Record<string, string>>;
  setConversationModelKey: (conversationId: string, modelKey: string) => void;
}

export const useModelSettingsStore = create<ModelSettingsState>()((set) => ({
  conversationModelKeys: {},
  setConversationModelKey: (conversationId, modelKey) =>
    set((state) => ({
      conversationModelKeys: { ...state.conversationModelKeys, [conversationId]: modelKey },
    })),
}));
