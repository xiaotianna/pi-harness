"use client";

import { AppLayout, Navbar, Sidebar } from "@agile-avocation/ui-pro";
import { Magnifier as Search } from "@gravity-ui/icons";
import { Button, Kbd, Tooltip } from "@heroui/react";
import { memo } from "react";
import type { ChatPageKind } from "../data/chat";
import { CHAT_NAVBAR_ACTIONS_ID } from "./chat-navbar-actions";
import { ChatViewToggle } from "./chat-view-toggle";

const NAV_TITLES: Record<Exclude<ChatPageKind, "thread">, { title: string; subtitle: string }> = {
  board: {
    subtitle: "掌握 AI 执行、等待处理与验收状态",
    title: "任务中心",
  },
  new: { subtitle: "开始一段全新的对话", title: "新对话" },
};

export interface ChatNavbarProps {
  pageKind: ChatPageKind;
  onSearch?: (() => void) | undefined;
}

export const ChatNavbar = memo(function ChatNavbar({ pageKind, onSearch }: ChatNavbarProps) {
  const isThread = pageKind === "thread";
  const navTitle = isThread ? null : NAV_TITLES[pageKind];

  return (
    <Navbar maxWidth="full">
      <Navbar.Header data-tauri-drag-region>
        <AppLayout.MenuToggle aria-label="打开导航" tooltip="打开导航" />
        <Sidebar.Trigger aria-label="切换侧边栏" />
        <div className="flex min-w-0 items-center gap-3">
          {navTitle ? (
            <div className="flex min-w-0 flex-col">
              <h1 className="truncate text-sm font-semibold text-foreground sm:text-base">
                {navTitle.title}
              </h1>
              <span className="truncate text-xs text-muted">{navTitle.subtitle}</span>
            </div>
          ) : null}
          {isThread ? <ChatViewToggle /> : null}
        </div>
        <Navbar.Spacer />
        <div className="flex items-center gap-2">
          <div className="contents" id={CHAT_NAVBAR_ACTIONS_ID} />
          <Tooltip delay={0}>
            <Button
              aria-label="搜索对话"
              size="sm"
              variant="tertiary"
              {...(onSearch ? { onPress: onSearch } : {})}
            >
              <Search className="size-4" />
              <span className="hidden sm:inline">搜索</span>
            </Button>
            <Tooltip.Content placement="bottom">
              <div className="flex items-center gap-2 text-xs">
                <span>搜索对话</span>
                <Kbd className="text-[10px]">⌘K</Kbd>
              </div>
            </Tooltip.Content>
          </Tooltip>
        </div>
      </Navbar.Header>
    </Navbar>
  );
});
