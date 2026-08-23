import { create } from "zustand";

interface ModelSettingsState {
  conversationModelKeys: Readonly<Record<string, string>>;
  defaultModelKey: string | null;
  setConversationModelKey: (conversationId: string, modelKey: string) => void;
  setDefaultModelKey: (modelKey: string) => void;
}

export const useModelSettingsStore = create<ModelSettingsState>()((set) => ({
  conversationModelKeys: {},
  defaultModelKey: null,
  setConversationModelKey: (conversationId, modelKey) =>
    set((state) => ({
      conversationModelKeys: { ...state.conversationModelKeys, [conversationId]: modelKey },
    })),
  setDefaultModelKey: (defaultModelKey) => set({ defaultModelKey }),
}));
