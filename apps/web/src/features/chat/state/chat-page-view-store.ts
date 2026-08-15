import { create } from "zustand";
import { ChatPageView, type ChatPageView as ChatPageViewValue } from "../constants/chat-page-view";

interface ChatPageViewState {
  activeView: ChatPageViewValue;
  setActiveView: (activeView: ChatPageViewValue) => void;
}

export const useChatPageViewStore = create<ChatPageViewState>()((set) => ({
  activeView: ChatPageView.CONVERSATION,
  setActiveView: (activeView) => set({ activeView }),
}));
