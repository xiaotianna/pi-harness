"use client";

import { Tabs } from "@heroui/react";
import { memo } from "react";
import { ChatPageView, isChatPageView } from "../constants/chat-page-view";
import { useChatPageViewStore } from "../state/chat-page-view-store";

export const ChatViewToggle = memo(function ChatViewToggle() {
  const activeView = useChatPageViewStore((state) => state.activeView);
  const setActiveView = useChatPageViewStore((state) => state.setActiveView);

  // HeroUI Tabs variants currently share slot state; remounting keeps this primary instance isolated.
  return (
    <Tabs
      key={activeView}
      selectedKey={activeView}
      variant="primary"
      onSelectionChange={(key) => {
        if (isChatPageView(key)) setActiveView(key);
      }}
    >
      <Tabs.ListContainer>
        <Tabs.List aria-label="切换会话视图">
          <Tabs.Tab id={ChatPageView.CONVERSATION}>
            对话
            <Tabs.Indicator />
          </Tabs.Tab>
          <Tabs.Tab id={ChatPageView.TRACE}>
            轨迹
            <Tabs.Indicator />
          </Tabs.Tab>
        </Tabs.List>
      </Tabs.ListContainer>
    </Tabs>
  );
});
