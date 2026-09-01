"use client";

import { useSidebar } from "@agile-avocation/ui-pro";
import {
  Archive,
  Shapes4 as Blocks,
  FaceRobot as Bot,
  Folder,
  Display as Monitor,
  Moon,
  Sliders as Settings2,
  ShoppingBag as Store,
  Sun,
} from "@gravity-ui/icons";
import {
  Alert,
  Button,
  Label,
  ListBox,
  Modal,
  Select,
  Separator,
  Skeleton,
  ToggleButton,
  ToggleButtonGroup,
  toast,
  useMediaQuery,
} from "@heroui/react";
import { Brain } from "lucide-react";
import { type ComponentType, type SVGProps, useState } from "react";
import { formatChatTimestamp } from "../../../shared/utils/format-chat-timestamp";
import { useAppSettings } from "../hooks/use-app-settings";
import { useAppTheme } from "../theme-provider";
import { ApprovalPolicySelect } from "./approval-policy-select";
import { MemorySettingsPanel } from "./memory-settings-panel";
import { ModelSettingsPanel } from "./model-settings-panel";
import { PluginMarketplacePanel } from "./plugin-marketplace-panel";
import { SettingsPanelHeader } from "./settings-panel-header";
import { SettingsRow } from "./settings-row";
import {
  type SkillChatDraft,
  SkillSettingsPanel,
  type SkillSettingsWorkspace,
} from "./skill-settings-panel";

export interface SettingsDialogProps {
  archivedConversations: ArchivedConversationsState;
  currentWorkspaceId: string | null;
  isOpen: boolean;
  onRestoreArchivedConversation: (conversationId: string) => Promise<void>;
  onOpenChange: (isOpen: boolean) => void;
  onStartSkillChat: (draft: SkillChatDraft) => void;
  workspaces: readonly SkillSettingsWorkspace[];
}

export type ArchivedConversationsState =
  | { status: "pending" }
  | { message: string; status: "error" }
  | {
      status: "ready";
      workspaces: readonly {
        conversations: readonly { id: string; title: string; updatedAt: string }[];
        id: string;
        name: string;
      }[];
    };

const SETTINGS_SECTIONS = [
  {
    id: "general",
    label: "通用设置",
    description: "管理 PI Harness 的界面与基础偏好。",
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
    label: "插件市场",
    description: "发现并安装可连接外部服务的插件。",
    icon: Store,
  },
  {
    id: "skills",
    label: "技能",
    description: "管理技能及其可用状态。",
    icon: Blocks,
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
  icon: ComponentType<SVGProps<SVGSVGElement>>;
}[];

type SettingsSectionId = (typeof SETTINGS_SECTIONS)[number]["id"];

function GeneralSettingsPanel() {
  const { setTheme, theme } = useAppTheme();
  const { isSaving, settings, updateSettings } = useAppSettings();
  const approvalPolicy = settings?.approvalPolicy;

  return (
    <section
      aria-label="通用设置"
      className="w-full max-w-[720px] [&>:first-child]:pt-0 sm:[&>:first-child]:pt-6"
    >
      <SettingsRow description="所有会话共用的权限模式。" title="权限">
        {approvalPolicy === undefined ? (
          <Skeleton aria-hidden className="h-10 w-full rounded-xl sm:w-40" />
        ) : (
          <ApprovalPolicySelect
            className="w-full sm:min-w-40 sm:max-w-56"
            isDisabled={isSaving}
            value={approvalPolicy}
            onChange={(approvalPolicy) => {
              void updateSettings({ approvalPolicy }).catch((error: unknown) => {
                toast.danger(error instanceof Error ? error.message : "保存权限审批设置失败");
              });
            }}
          />
        )}
      </SettingsRow>

      <Separator />

      <SettingsRow
        description="仅在 Agent 运行时生效；Cmd/Ctrl+Enter 使用另一行为。"
        title="繁忙时 Enter 键行为"
      >
        <Select
          aria-label="繁忙时 Enter 键行为"
          className="w-full sm:min-w-40 sm:max-w-56"
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
              <ListBox.Item id="steer" textValue="插话发送">
                <Label>插话发送</Label>
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
    </section>
  );
}

function ArchivedSettingsPanel({
  onRestore,
  state,
}: {
  onRestore: SettingsDialogProps["onRestoreArchivedConversation"];
  state: ArchivedConversationsState;
}) {
  const [restoringId, setRestoringId] = useState<string | null>(null);

  const restore = async (conversationId: string) => {
    setRestoringId(conversationId);
    try {
      await onRestore(conversationId);
      toast.success("已恢复对话");
    } catch (error: unknown) {
      toast.danger(error instanceof Error ? error.message : "恢复对话失败");
    } finally {
      setRestoringId(null);
    }
  };

  return (
    <section aria-label="已归档对话" className="w-full max-w-[720px]">
      <SettingsPanelHeader description="归档的对话不会显示在侧边栏中。" title="已归档对话" />
      {state.status === "pending" ? (
        <div aria-busy="true" className="mt-6 space-y-4">
          <span className="sr-only">正在加载已归档对话</span>
          <Skeleton className="h-5 w-32 rounded-lg" />
          <Skeleton className="h-24 w-full rounded-xl" />
        </div>
      ) : state.status === "error" ? (
        <Alert className="mt-6 bg-danger-soft" role="alert" status="danger">
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Title>{state.message}</Alert.Title>
          </Alert.Content>
        </Alert>
      ) : state.workspaces.length > 0 ? (
        <div className="mt-6 space-y-6">
          {state.workspaces.map((workspace) => (
            <section aria-labelledby={`archived-workspace-${workspace.id}`} key={workspace.id}>
              <div className="flex min-w-0 items-center gap-2 px-1">
                <Folder aria-hidden className="size-4 shrink-0 text-muted" />
                <h3
                  className="min-w-0 flex-1 truncate font-medium text-foreground"
                  id={`archived-workspace-${workspace.id}`}
                >
                  {workspace.name}
                </h3>
              </div>
              <ul className="mt-2 flex flex-col gap-1 rounded-xl bg-default p-1">
                {workspace.conversations.map((conversation) => (
                  <li
                    className="flex min-h-12 items-center gap-3 rounded-lg px-3"
                    key={conversation.id}
                  >
                    <Archive aria-hidden className="size-4 shrink-0 text-muted" />
                    <span className="min-w-0 flex-1 truncate text-foreground">
                      {conversation.title}
                    </span>
                    <span className="shrink-0 text-xs text-muted">
                      {formatChatTimestamp(conversation.updatedAt)}
                    </span>
                    <Button
                      isDisabled={restoringId !== null && restoringId !== conversation.id}
                      isPending={restoringId === conversation.id}
                      size="sm"
                      variant="secondary"
                      onPress={() => void restore(conversation.id)}
                    >
                      恢复
                    </Button>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      ) : (
        <p className="mt-6 rounded-xl bg-default p-6 text-center text-muted">暂无已归档对话</p>
      )}
    </section>
  );
}

export function SettingsDialog({
  archivedConversations,
  currentWorkspaceId,
  isOpen,
  onRestoreArchivedConversation,
  onOpenChange,
  onStartSkillChat,
  workspaces,
}: SettingsDialogProps) {
  const [activeSectionId, setActiveSectionId] = useState<SettingsSectionId>("general");
  const isMobile = useMediaQuery("(max-width: 639px)");
  const { setMobileOpen } = useSidebar();

  return (
    <Modal.Backdrop isOpen={isOpen} onOpenChange={onOpenChange}>
      <Modal.Container size="cover">
        <Modal.Dialog className="h-full min-h-0 max-w-5xl overflow-hidden p-0 sm:h-[640px]">
          <Modal.CloseTrigger aria-label="关闭设置" className="z-20" />
          <Modal.Body className="m-0 overflow-hidden p-0">
            <div className="flex h-full min-h-0 flex-col sm:grid sm:grid-cols-[15rem_minmax(0,1fr)]">
              <aside className="shrink-0 p-4 pb-2 sm:min-h-0 sm:overflow-y-auto sm:pb-4">
                <Modal.Heading className="px-2 py-2">设置</Modal.Heading>
                {isMobile ? (
                  <Select
                    aria-label="设置分类"
                    className="mt-3 w-full"
                    value={activeSectionId}
                    variant="secondary"
                    onChange={(key) => {
                      if (typeof key !== "string") return;
                      const nextSection = SETTINGS_SECTIONS.find((section) => section.id === key);
                      if (nextSection) {
                        setActiveSectionId(nextSection.id);
                      }
                    }}
                  >
                    <Select.Trigger>
                      <Select.Value className="flex items-center gap-2" />
                      <Select.Indicator />
                    </Select.Trigger>
                    <Select.Popover>
                      <ListBox>
                        {SETTINGS_SECTIONS.map((section) => {
                          const Icon = section.icon;

                          return (
                            <ListBox.Item
                              id={section.id}
                              key={section.id}
                              textValue={section.label}
                            >
                              <Icon aria-hidden className="size-4 shrink-0 text-muted" />
                              <Label>{section.label}</Label>
                              <ListBox.ItemIndicator />
                            </ListBox.Item>
                          );
                        })}
                      </ListBox>
                    </Select.Popover>
                  </Select>
                ) : (
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
                          <Label className="text-foreground">{section.label}</Label>
                        </ListBox.Item>
                      );
                    })}
                  </ListBox>
                )}
              </aside>

              <main className="min-h-0 min-w-0 flex-1 overflow-x-hidden overflow-y-auto px-4 pt-2 pb-6 sm:py-8 sm:pr-16 sm:pl-8">
                {activeSectionId === "general" ? (
                  <GeneralSettingsPanel />
                ) : activeSectionId === "models" ? (
                  <ModelSettingsPanel />
                ) : activeSectionId === "memory" ? (
                  <MemorySettingsPanel />
                ) : activeSectionId === "plugins" ? (
                  <PluginMarketplacePanel />
                ) : activeSectionId === "skills" ? (
                  <SkillSettingsPanel
                    currentWorkspaceId={currentWorkspaceId}
                    workspaces={workspaces}
                    onStartChat={(draft) => {
                      setMobileOpen(false);
                      onStartSkillChat(draft);
                    }}
                  />
                ) : activeSectionId === "archived" ? (
                  <ArchivedSettingsPanel
                    state={archivedConversations}
                    onRestore={onRestoreArchivedConversation}
                  />
                ) : (
                  <GeneralSettingsPanel />
                )}
              </main>
            </div>
          </Modal.Body>
        </Modal.Dialog>
      </Modal.Container>
    </Modal.Backdrop>
  );
}
