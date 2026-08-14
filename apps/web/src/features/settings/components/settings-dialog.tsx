"use client";

import {
  Label,
  ListBox,
  Modal,
  Select,
  Separator,
  ToggleButton,
  ToggleButtonGroup,
} from "@heroui/react";
import type { LucideIcon } from "lucide-react";
import { Archive, Blocks, Bot, Brain, Monitor, Moon, Plug, Settings2, Sun } from "lucide-react";
import type { ReactNode } from "react";
import { useState } from "react";
import { formatChatTimestamp } from "../../../shared/utils/format-chat-timestamp";
import { useAppTheme } from "../theme-provider";

export interface SettingsDialogProps {
  archivedConversations: readonly {
    id: string;
    title: string;
    updatedAt: string;
  }[];
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}

const SETTINGS_SECTIONS = [
  {
    id: "general",
    label: "通用设置",
    description: "管理 PI Workbench 的界面与基础偏好。",
    icon: Settings2,
  },
  {
    id: "models",
    label: "模型",
    description: "管理模型 Provider、凭据与默认模型。",
    icon: Bot,
  },
  {
    id: "memory",
    label: "记忆",
    description: "管理 Agent 可以使用的长期记忆。",
    icon: Brain,
  },
  {
    id: "plugins",
    label: "插件",
    description: "管理已安装插件及其可用状态。",
    icon: Blocks,
  },
  {
    id: "mcp",
    label: "MCP",
    description: "管理 MCP 服务及其连接配置。",
    icon: Plug,
  },
  {
    id: "archived",
    label: "已归档",
    description: "查看已归档的对话。",
    icon: Archive,
  },
] as const satisfies readonly {
  id: string;
  label: string;
  description: string;
  icon: LucideIcon;
}[];

type SettingsSectionId = (typeof SETTINGS_SECTIONS)[number]["id"];

function SettingsRow({
  children,
  description,
  title,
}: {
  children: ReactNode;
  description?: string;
  title: string;
}) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-6 py-6">
      <div className="min-w-0">
        <h3 className="font-medium text-foreground">{title}</h3>
        {description ? <p className="mt-1 text-muted">{description}</p> : null}
      </div>
      {children}
    </div>
  );
}

function GeneralSettingsPanel() {
  const { setTheme, theme } = useAppTheme();

  return (
    <section aria-label="通用设置" className="w-full max-w-[720px]">
      <SettingsRow
        description="对此后新建的会话生效。运行中的会话保持它开始时的预设。"
        title="Agent 预设"
      >
        <Select
          aria-label="Agent 预设"
          className="min-w-40 max-w-56"
          defaultSelectedKey="standard"
          variant="secondary"
        >
          <Select.Trigger>
            <Select.Value />
            <Select.Indicator />
          </Select.Trigger>
          <Select.Popover>
            <ListBox>
              <ListBox.Item id="standard" textValue="标准模式">
                <Label>标准模式</Label>
                <ListBox.ItemIndicator />
              </ListBox.Item>
            </ListBox>
          </Select.Popover>
        </Select>
      </SettingsRow>

      <Separator />

      <SettingsRow description="选择新会话的默认权限模式。" title="权限">
        <Select
          aria-label="默认权限"
          className="min-w-40 max-w-56"
          defaultSelectedKey="workspace-write"
          variant="secondary"
        >
          <Select.Trigger>
            <Select.Value />
            <Select.Indicator />
          </Select.Trigger>
          <Select.Popover>
            <ListBox>
              <ListBox.Item id="workspace-write" textValue="Workspace Write">
                <Label>Workspace Write</Label>
                <ListBox.ItemIndicator />
              </ListBox.Item>
            </ListBox>
          </Select.Popover>
        </Select>
      </SettingsRow>

      <Separator />

      <SettingsRow title="语言">
        <Select
          aria-label="界面语言"
          className="min-w-40 max-w-56"
          defaultSelectedKey="zh-CN"
          variant="secondary"
        >
          <Select.Trigger>
            <Select.Value />
            <Select.Indicator />
          </Select.Trigger>
          <Select.Popover>
            <ListBox>
              <ListBox.Item id="zh-CN" textValue="中文">
                <Label>中文</Label>
                <ListBox.ItemIndicator />
              </ListBox.Item>
            </ListBox>
          </Select.Popover>
        </Select>
      </SettingsRow>

      <Separator />

      <div className="py-6">
        <h3 className="font-medium text-foreground">外观</h3>
        <ToggleButtonGroup
          className="mt-4"
          disallowEmptySelection
          fullWidth
          isDetached
          selectedKeys={[theme]}
          selectionMode="single"
          onSelectionChange={(keys) => {
            const [selectedTheme] = keys;

            if (typeof selectedTheme === "string") {
              setTheme(selectedTheme);
            }
          }}
        >
          <ToggleButton className="h-20" id="light" variant="ghost">
            <Sun />
            浅色
          </ToggleButton>
          <ToggleButton className="h-20" id="dark" variant="ghost">
            <Moon />
            深色
          </ToggleButton>
          <ToggleButton className="h-20" id="system" variant="ghost">
            <Monitor />
            跟随系统
          </ToggleButton>
        </ToggleButtonGroup>
      </div>

      <Separator />

      <SettingsRow
        description="仅在 Agent 运行时生效；Cmd/Ctrl+Enter 使用另一行为。"
        title="繁忙时 Enter 键行为"
      >
        <Select
          aria-label="繁忙时 Enter 键行为"
          className="min-w-40 max-w-56"
          defaultSelectedKey="queue"
          variant="secondary"
        >
          <Select.Trigger>
            <Select.Value />
            <Select.Indicator />
          </Select.Trigger>
          <Select.Popover>
            <ListBox>
              <ListBox.Item id="queue" textValue="排队发送">
                <Label>排队发送</Label>
                <ListBox.ItemIndicator />
              </ListBox.Item>
            </ListBox>
          </Select.Popover>
        </Select>
      </SettingsRow>
    </section>
  );
}

function ArchivedSettingsPanel({
  conversations,
}: {
  conversations: SettingsDialogProps["archivedConversations"];
}) {
  return (
    <section aria-label="已归档对话" className="w-full max-w-[720px]">
      <h2 className="text-lg font-medium text-foreground">已归档对话</h2>
      <p className="mt-2 text-muted">归档的对话不会显示在侧边栏中。</p>
      {conversations.length > 0 ? (
        <ul className="mt-6 flex flex-col gap-1 rounded-xl bg-default p-1">
          {conversations.map((conversation) => (
            <li className="flex min-h-12 items-center gap-3 rounded-lg px-3" key={conversation.id}>
              <Archive aria-hidden className="size-4 shrink-0 text-muted" />
              <span className="min-w-0 flex-1 truncate text-foreground">{conversation.title}</span>
              <span className="shrink-0 text-xs text-muted">
                {formatChatTimestamp(conversation.updatedAt)}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-6 rounded-xl bg-default p-6 text-center text-muted">暂无已归档对话</p>
      )}
    </section>
  );
}

export function SettingsDialog({
  archivedConversations,
  isOpen,
  onOpenChange,
}: SettingsDialogProps) {
  const [activeSectionId, setActiveSectionId] = useState<SettingsSectionId>("general");
  const activeSection =
    SETTINGS_SECTIONS.find((section) => section.id === activeSectionId) ?? SETTINGS_SECTIONS[0];

  return (
    <Modal.Backdrop isOpen={isOpen} onOpenChange={onOpenChange}>
      <Modal.Container size="cover">
        <Modal.Dialog className="h-[640px] min-h-0 max-w-5xl overflow-hidden p-0">
          <Modal.CloseTrigger aria-label="关闭设置" className="z-20" />
          <Modal.Body className="m-0 overflow-hidden p-0">
            <div className="grid h-full min-h-0 grid-cols-[15rem_minmax(0,1fr)]">
              <aside className="min-h-0 overflow-y-auto p-4">
                <Modal.Heading className="px-2 py-2">设置</Modal.Heading>
                <ListBox
                  aria-label="设置分类"
                  className="mt-4 p-0"
                  selectedKeys={new Set([activeSectionId])}
                  selectionMode="single"
                  onSelectionChange={(keys) => {
                    if (keys === "all") return;

                    const [key] = keys;
                    const nextSection = SETTINGS_SECTIONS.find((section) => section.id === key);
                    if (nextSection) {
                      setActiveSectionId(nextSection.id);
                    }
                  }}
                >
                  {SETTINGS_SECTIONS.map((section) => {
                    const Icon = section.icon;

                    return (
                      <ListBox.Item
                        className="data-[selected=true]:bg-default data-[selected=true]:text-foreground data-[selected=true]:shadow-surface"
                        id={section.id}
                        key={section.id}
                        textValue={section.label}
                      >
                        <Icon aria-hidden className="size-4 shrink-0 text-muted" />
                        <Label>{section.label}</Label>
                      </ListBox.Item>
                    );
                  })}
                </ListBox>
              </aside>

              <main className="min-h-0 overflow-y-auto p-8">
                {activeSectionId === "general" ? (
                  <GeneralSettingsPanel />
                ) : activeSectionId === "archived" ? (
                  <ArchivedSettingsPanel conversations={archivedConversations} />
                ) : (
                  <section className="w-full max-w-[720px]">
                    <h2 className="text-lg font-medium text-foreground">{activeSection.label}</h2>
                    <p className="mt-2 max-w-xl text-muted">{activeSection.description}</p>
                  </section>
                )}
              </main>
            </div>
          </Modal.Body>
        </Modal.Dialog>
      </Modal.Container>
    </Modal.Backdrop>
  );
}
