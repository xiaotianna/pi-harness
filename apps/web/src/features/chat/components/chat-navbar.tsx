"use client";

import { AppLayout, Navbar, Sidebar } from "@agile-avocation/ui-pro";
import { Button, Kbd, Tooltip } from "@heroui/react";
import { PanelRightClose, PanelRightOpen, Search } from "lucide-react";
import type { ChatActivePage } from "../data/chat";
import { ChatViewToggle } from "./chat-view-toggle";

const NAV_TITLES: Record<ChatActivePage["kind"], { title: string; subtitle: string }> = {
  explore: {
    subtitle: "从示例提示词开始探索工作台能力",
    title: "探索",
  },
  library: {
    subtitle: "已保存的提示词、语气预设和可复用对话",
    title: "资料库",
  },
  new: { subtitle: "开始一段全新的对话", title: "新对话" },
  thread: { subtitle: "", title: "" },
};

export interface ChatNavbarProps {
  activePage: ChatActivePage;
  isInspectorOpen?: boolean;
  onInspectorToggle?: (() => void) | undefined;
  onSearch?: (() => void) | undefined;
}

export function ChatNavbar({
  activePage,
  isInspectorOpen = false,
  onInspectorToggle,
  onSearch,
}: ChatNavbarProps) {
  const isThread = activePage.kind === "thread";
  const thread = isThread ? activePage.thread : undefined;
  const title = isThread ? (thread?.title ?? "对话") : NAV_TITLES[activePage.kind].title;
  const subtitle = isThread ? "" : NAV_TITLES[activePage.kind].subtitle;

  return (
    <Navbar maxWidth="full">
      <Navbar.Header>
        <AppLayout.MenuToggle aria-label="打开导航" tooltip="打开导航" />
        <Sidebar.Trigger aria-label="切换侧边栏" />
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex min-w-0 flex-col">
            <h1 className="truncate text-sm font-semibold text-foreground sm:text-base">{title}</h1>
            {subtitle ? <span className="truncate text-xs text-muted">{subtitle}</span> : null}
          </div>
          {isThread ? <ChatViewToggle /> : null}
        </div>
        <Navbar.Spacer />
        <div className="flex items-center gap-2">
          {isThread ? (
            <Tooltip delay={0}>
              <Button
                isIconOnly
                aria-label={isInspectorOpen ? "收起右侧面板" : "打开右侧面板"}
                size="sm"
                variant="tertiary"
                {...(onInspectorToggle ? { onPress: onInspectorToggle } : {})}
              >
                {isInspectorOpen ? (
                  <PanelRightClose className="size-4" />
                ) : (
                  <PanelRightOpen className="size-4" />
                )}
              </Button>
              <Tooltip.Content placement="bottom">
                {isInspectorOpen ? "收起右侧面板" : "打开右侧面板"}
              </Tooltip.Content>
            </Tooltip>
          ) : null}
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
}
