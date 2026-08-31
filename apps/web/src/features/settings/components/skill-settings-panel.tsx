"use client";

import {
  ChevronDown,
  FileArrowDown,
  Folder,
  FolderOpen,
  Globe,
  MagicWand,
  Plus,
} from "@gravity-ui/icons";
import {
  Alert,
  AlertDialog,
  Button,
  Dropdown,
  Label,
  ScrollShadow,
  Skeleton,
  Switch,
  Tooltip,
  toast,
} from "@heroui/react";
import { useMutation, useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import { type ReactNode, useState } from "react";
import { ToggleButton, ToggleButtonGroup } from "react-aria-components";
import { AssistantMarkdown } from "../../../components/ai/assistant-markdown";
import {
  openSkillDirectory,
  openSkillRootDirectory,
  removeSkill,
  type Skill,
  SkillInstallDialog,
  skillDetailQueryOptions,
  skillListQueryOptions,
  skillQueryKeys,
  updateSkill,
} from "../../skills";
import { SettingsCatalogDetail } from "./settings-catalog-detail";
import { SettingsCatalogItem } from "./settings-catalog-item";
import { SettingsPanelHeader } from "./settings-panel-header";

const ALL_SKILLS_TAB_ID = "all";
const SKILL_CREATOR_NAME = "skill-creator";

const SkillChatAction = {
  CREATE: "create",
  INSTALL: "install",
} as const;

export interface SkillChatDraft {
  prompt: string;
  skillLabel?: string;
  skillName?: string;
  workspaceId: string;
}

export type SkillSettingsWorkspace = {
  id: string;
  name: string;
  path: string;
};

type SkillEntry = {
  skill: Skill;
  workspaceId: string;
};

function getSkillDisplayName(skill: Skill): string {
  if (skill.scope !== "system") return skill.name;
  return skill.name
    .split("-")
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(" ");
}

function SkillGroupHeader({
  directory,
  icon,
  onOpenDirectory,
  title,
  titleId,
}: {
  directory: string | null;
  icon: ReactNode;
  onOpenDirectory: () => void;
  title: string;
  titleId?: string;
}) {
  return (
    <div className="flex min-w-0 items-center gap-2 px-1 py-1">
      {icon}
      <h3 className="min-w-0 flex-1 truncate text-sm font-medium text-foreground" id={titleId}>
        {title}
      </h3>
      {directory ? (
        <Tooltip>
          <Button
            isIconOnly
            aria-label={`打开目录：${directory}`}
            className="shrink-0"
            size="sm"
            variant="ghost"
            onPress={onOpenDirectory}
          >
            <FolderOpen aria-hidden className="size-4 text-muted" />
          </Button>
          <Tooltip.Content>{directory}</Tooltip.Content>
        </Tooltip>
      ) : null}
    </div>
  );
}

function SkillDetail({
  entry,
  isRemoving,
  isUpdating,
  onBack,
  onEnabledChange,
  onOpenDirectory,
  onRemove,
}: {
  entry: SkillEntry;
  isRemoving: boolean;
  isUpdating: boolean;
  onBack: () => void;
  onEnabledChange: (isEnabled: boolean) => void;
  onOpenDirectory: () => void;
  onRemove: () => void;
}) {
  const contentQuery = useQuery(skillDetailQueryOptions(entry.workspaceId, entry.skill));
  const isSystemSkill = entry.skill.scope === "system";
  const displayName = getSkillDisplayName(entry.skill);

  return (
    <SettingsCatalogDetail
      action={
        isSystemSkill ? (
          <span className="text-sm text-muted">系统</span>
        ) : (
          <div className="flex shrink-0 items-center gap-2">
            <span className="text-sm text-muted">
              {entry.skill.isEnabled ? "已开启" : "已关闭"}
            </span>
            <Switch
              aria-label={`${entry.skill.name} 可用状态`}
              isDisabled={isUpdating || isRemoving}
              isSelected={entry.skill.isEnabled}
              size="sm"
              onChange={onEnabledChange}
            >
              <Switch.Content>
                <Switch.Control>
                  <Switch.Thumb />
                </Switch.Control>
              </Switch.Content>
            </Switch>
          </div>
        )
      }
      ariaLabel={`${displayName} 技能详情`}
      backLabel="返回技能"
      description={entry.skill.description}
      icon={<MagicWand aria-hidden className="size-6 text-muted" />}
      name={displayName}
      toolbarAction={
        isSystemSkill ? null : (
          <div className="flex items-center gap-1">
            <Button isDisabled={isRemoving} size="sm" variant="tertiary" onPress={onOpenDirectory}>
              <FolderOpen aria-hidden className="size-4" />
              打开目录
            </Button>
            <Button
              isDisabled={isUpdating}
              isPending={isRemoving}
              size="sm"
              variant="danger-soft"
              onPress={onRemove}
            >
              卸载
            </Button>
          </div>
        )
      }
      onBack={onBack}
    >
      <div className="mt-8">
        {contentQuery.isPending ? (
          <div aria-busy="true" className="space-y-3">
            <span className="sr-only">正在加载技能内容</span>
            <Skeleton className="h-5 w-2/3 rounded-lg" />
            <Skeleton className="h-4 w-full rounded-lg" />
            <Skeleton className="h-4 w-5/6 rounded-lg" />
          </div>
        ) : contentQuery.isError ? (
          <Alert className="bg-danger-soft" role="alert" status="danger">
            <Alert.Indicator />
            <Alert.Content>
              <Alert.Title>技能内容加载失败</Alert.Title>
              <Alert.Description>{contentQuery.error.message}</Alert.Description>
            </Alert.Content>
          </Alert>
        ) : (
          <AssistantMarkdown>{contentQuery.data}</AssistantMarkdown>
        )}
      </div>
    </SettingsCatalogDetail>
  );
}

function SkillListSkeleton() {
  return (
    <div aria-busy="true" className="flex flex-col gap-1">
      <span className="sr-only">正在加载技能</span>
      {Array.from({ length: 3 }, (_, index) => (
        <div className="flex min-h-16 items-center gap-3 px-3 py-2" key={index}>
          <Skeleton className="size-10 shrink-0 rounded-xl" />
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-5 w-32 rounded-lg" />
            <Skeleton className="h-4 w-full rounded-lg" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function SkillSettingsPanel({
  currentWorkspaceId,
  onStartChat,
  workspaces,
}: {
  currentWorkspaceId: string | null;
  onStartChat: (draft: SkillChatDraft) => void;
  workspaces: readonly SkillSettingsWorkspace[];
}) {
  const queryClient = useQueryClient();
  const [activeTabId, setActiveTabId] = useState(ALL_SKILLS_TAB_ID);
  const [detailEntry, setDetailEntry] = useState<SkillEntry | null>(null);
  const [isInstallOpen, setIsInstallOpen] = useState(false);
  const [removeTarget, setRemoveTarget] = useState<SkillEntry | null>(null);
  const skillQueries = useQueries({
    queries: workspaces.map((workspace) => skillListQueryOptions(workspace.id)),
  });
  const workspaceGroups = workspaces.map((workspace, index) => ({
    query: skillQueries[index],
    skills: skillQueries[index]?.data,
    workspace,
  }));
  const globalGroup = workspaceGroups.find((group) => group.skills !== undefined);
  const globalEntries = (globalGroup?.skills ?? [])
    .filter((skill) => skill.scope === "global")
    .map((skill) => ({ skill, workspaceId: globalGroup?.workspace.id ?? "" }));
  const systemEntries = (globalGroup?.skills ?? [])
    .filter((skill) => skill.scope === "system")
    .map((skill) => ({ skill, workspaceId: globalGroup?.workspace.id ?? "" }));
  const hasAnySkill =
    systemEntries.length > 0 ||
    globalEntries.length > 0 ||
    workspaceGroups.some((group) => group.skills?.some((skill) => skill.scope === "project"));
  const globalDirectory = globalEntries.at(0)?.skill.directory?.replace(/[\\/][^\\/]+$/, "");
  const activeWorkspaceIndex = workspaces.findIndex((workspace) => workspace.id === activeTabId);
  const targetWorkspace =
    activeWorkspaceIndex >= 0
      ? workspaces[activeWorkspaceIndex]
      : (workspaces.find((workspace) => workspace.id === currentWorkspaceId) ?? workspaces[0]);
  const activeWorkspaceGroups =
    activeTabId === ALL_SKILLS_TAB_ID
      ? workspaceGroups
      : workspaceGroups.filter(({ workspace }) => workspace.id === activeTabId);
  const activeErrors = activeWorkspaceGroups.flatMap(({ query, workspace }) =>
    query?.error ? [{ error: query.error, workspace }] : [],
  );
  const isPending = activeWorkspaceGroups.some(({ query }) => query?.isPending);

  const startSkillChat = () => {
    if (!targetWorkspace) return;

    onStartChat({
      prompt: "创建一个当前项目 Skill。技能需求：",
      skillLabel: "Skill Creator",
      skillName: SKILL_CREATOR_NAME,
      workspaceId: targetWorkspace.id,
    });
  };

  const updateMutation = useMutation({
    mutationFn: ({ entry, isEnabled }: { entry: SkillEntry; isEnabled: boolean }) =>
      updateSkill(entry.workspaceId, entry.skill, isEnabled),
    onError: (error: Error) => toast.danger(error.message),
    onSuccess: async (_, { entry, isEnabled }) => {
      setDetailEntry((current) =>
        current?.workspaceId === entry.workspaceId && current.skill.id === entry.skill.id
          ? { ...current, skill: { ...current.skill, isEnabled } }
          : current,
      );
      await queryClient.invalidateQueries({ queryKey: skillQueryKeys.all });
    },
  });
  const removeMutation = useMutation({
    mutationFn: (entry: SkillEntry) => removeSkill(entry.workspaceId, entry.skill),
    onError: (error: Error) => toast.danger(error.message),
    onSuccess: async (_, entry) => {
      setRemoveTarget(null);
      if (detailEntry?.skill.directory === entry.skill.directory) setDetailEntry(null);
      await queryClient.invalidateQueries({ queryKey: skillQueryKeys.all });
      toast.success(`已卸载 ${entry.skill.name}`);
    },
  });

  const openDirectory = (entry: SkillEntry) => {
    void openSkillDirectory(entry.workspaceId, entry.skill).catch((error: unknown) => {
      toast.danger(error instanceof Error ? error.message : "无法打开技能目录");
    });
  };

  const openRootDirectory = (workspaceId: string, directory: string) => {
    void openSkillRootDirectory(workspaceId, directory).catch((error: unknown) => {
      toast.danger(error instanceof Error ? error.message : "无法打开技能目录");
    });
  };

  const isEntryUpdating = (entry: SkillEntry) =>
    updateMutation.isPending &&
    updateMutation.variables.entry.workspaceId === entry.workspaceId &&
    updateMutation.variables.entry.skill.id === entry.skill.id;
  const isEntryRemoving = (entry: SkillEntry) =>
    removeMutation.isPending &&
    removeMutation.variables.workspaceId === entry.workspaceId &&
    removeMutation.variables.skill.id === entry.skill.id;

  const renderSkillList = (entries: readonly SkillEntry[], emptyMessage = "暂无技能") =>
    entries.length === 0 ? (
      <p className="py-8 text-center text-sm text-muted">{emptyMessage}</p>
    ) : (
      <ul className="flex flex-col gap-1">
        {entries.map((entry) => {
          const isUpdating = isEntryUpdating(entry);
          const isRemoving = isEntryRemoving(entry);
          const isSystemSkill = entry.skill.scope === "system";
          const displayName = getSkillDisplayName(entry.skill);

          return (
            <SettingsCatalogItem
              action={
                isSystemSkill ? (
                  <span className="text-sm text-muted">系统</span>
                ) : (
                  <div className="flex shrink-0 items-center gap-2">
                    <Switch
                      aria-label={`${entry.skill.name} 可用状态`}
                      isDisabled={isUpdating || isRemoving}
                      isSelected={entry.skill.isEnabled}
                      size="sm"
                      onChange={(isEnabled) => updateMutation.mutate({ entry, isEnabled })}
                    >
                      <Switch.Content>
                        <Switch.Control>
                          <Switch.Thumb />
                        </Switch.Control>
                      </Switch.Content>
                    </Switch>
                    <Button
                      isDisabled={isUpdating}
                      isPending={isRemoving}
                      size="sm"
                      variant="danger-soft"
                      onPress={() => setRemoveTarget(entry)}
                    >
                      卸载
                    </Button>
                  </div>
                )
              }
              ariaLabel={`查看 ${displayName} 详情`}
              icon={<MagicWand aria-hidden className="size-5 text-muted" />}
              key={`${entry.workspaceId}:${entry.skill.id}`}
              name={displayName}
              secondary={<span className="min-w-0 flex-1 truncate">{entry.skill.description}</span>}
              onPress={() => setDetailEntry(entry)}
            />
          );
        })}
      </ul>
    );

  return (
    <>
      {detailEntry ? (
        <SkillDetail
          entry={detailEntry}
          isRemoving={isEntryRemoving(detailEntry)}
          isUpdating={isEntryUpdating(detailEntry)}
          onBack={() => setDetailEntry(null)}
          onEnabledChange={(isEnabled) => updateMutation.mutate({ entry: detailEntry, isEnabled })}
          onOpenDirectory={() => openDirectory(detailEntry)}
          onRemove={() => setRemoveTarget(detailEntry)}
        />
      ) : (
        <section aria-label="技能设置" className="w-full min-w-0 max-w-[720px]">
          <SettingsPanelHeader
            action={
              <Dropdown>
                <Button isDisabled={!targetWorkspace} size="sm" variant="secondary">
                  <Plus aria-hidden className="size-4" />
                  新增技能
                  <ChevronDown aria-hidden className="size-4" />
                </Button>
                <Dropdown.Popover
                  className="min-w-36 max-w-[calc(100vw-2rem)]"
                  placement="bottom end"
                >
                  <Dropdown.Menu
                    aria-label="新增技能"
                    onAction={(key) => {
                      if (key === SkillChatAction.CREATE) startSkillChat();
                      if (key === SkillChatAction.INSTALL) setIsInstallOpen(true);
                    }}
                  >
                    <Dropdown.Item id={SkillChatAction.CREATE} textValue="创建技能">
                      <MagicWand aria-hidden className="size-4 text-muted" />
                      <Label>创建技能</Label>
                    </Dropdown.Item>
                    <Dropdown.Item id={SkillChatAction.INSTALL} textValue="安装技能">
                      <FileArrowDown aria-hidden className="size-4 text-muted" />
                      <Label>安装技能</Label>
                    </Dropdown.Item>
                  </Dropdown.Menu>
                </Dropdown.Popover>
              </Dropdown>
            }
            description="管理全局和各项目技能的可用状态；卸载会删除对应的本地技能目录。"
            title="技能"
          />

          <ScrollShadow
            className="session-scrollbar session-scrollbars mt-5 w-full max-w-full"
            orientation="horizontal"
            size={16}
          >
            <ToggleButtonGroup
              aria-label="技能范围"
              className="flex w-max min-w-full flex-nowrap gap-1"
              disallowEmptySelection
              selectedKeys={[activeTabId]}
              selectionMode="single"
              onSelectionChange={(keys) => {
                const [key] = keys;
                if (typeof key === "string") setActiveTabId(key);
              }}
            >
              <ToggleButton
                className="h-8 shrink-0 cursor-[var(--cursor-interactive)] rounded-lg px-3 text-sm text-muted outline-none hover:bg-default data-[focus-visible]:bg-default data-[selected]:bg-accent-soft data-[selected]:font-medium data-[selected]:text-accent-soft-foreground"
                id={ALL_SKILLS_TAB_ID}
              >
                全部
              </ToggleButton>
              {workspaces.map((workspace) => (
                <ToggleButton
                  aria-label={workspace.name}
                  className="inline-flex h-8 max-w-48 shrink-0 cursor-[var(--cursor-interactive)] items-center overflow-hidden rounded-lg px-3 text-sm text-muted outline-none hover:bg-default data-[focus-visible]:bg-default data-[selected]:bg-accent-soft data-[selected]:font-medium data-[selected]:text-accent-soft-foreground"
                  id={workspace.id}
                  key={workspace.id}
                >
                  <span className="block min-w-0 max-w-full truncate">{workspace.name}</span>
                </ToggleButton>
              ))}
            </ToggleButtonGroup>
          </ScrollShadow>

          <div className="mt-3">
            {workspaces.length === 0 ? (
              <p className="py-12 text-center text-sm text-muted">添加项目后即可管理技能</p>
            ) : isPending ? (
              <SkillListSkeleton />
            ) : (
              <>
                {activeErrors.map(({ error, workspace }) => (
                  <Alert
                    className="mb-4 bg-danger-soft"
                    key={workspace.id}
                    role="alert"
                    status="danger"
                  >
                    <Alert.Indicator />
                    <Alert.Content>
                      <Alert.Title>{workspace.name}</Alert.Title>
                      <Alert.Description>
                        {error instanceof Error ? error.message : "无法加载技能"}
                      </Alert.Description>
                    </Alert.Content>
                  </Alert>
                ))}

                {activeTabId === ALL_SKILLS_TAB_ID ? (
                  hasAnySkill ? (
                    <div className="space-y-4">
                      {systemEntries.length > 0 ? (
                        <section aria-labelledby="system-skills-heading">
                          <SkillGroupHeader
                            directory={null}
                            icon={<MagicWand aria-hidden className="size-4 shrink-0 text-muted" />}
                            title="系统技能"
                            titleId="system-skills-heading"
                            onOpenDirectory={() => undefined}
                          />
                          <div className="mt-1">{renderSkillList(systemEntries)}</div>
                        </section>
                      ) : null}

                      {globalEntries.length > 0 ? (
                        <section aria-labelledby="global-skills-heading">
                          <SkillGroupHeader
                            directory={globalDirectory ?? null}
                            icon={<Globe aria-hidden className="size-4 shrink-0 text-muted" />}
                            title="全局技能"
                            titleId="global-skills-heading"
                            onOpenDirectory={() => {
                              if (globalDirectory && globalGroup) {
                                openRootDirectory(globalGroup.workspace.id, globalDirectory);
                              }
                            }}
                          />
                          <div className="mt-1">{renderSkillList(globalEntries)}</div>
                        </section>
                      ) : null}

                      {workspaceGroups.map(({ skills, workspace }) => {
                        const entries = (skills ?? [])
                          .filter((skill) => skill.scope === "project")
                          .map((skill) => ({ skill, workspaceId: workspace.id }));
                        if (entries.length === 0) return null;
                        const projectDirectory = entries[0]?.skill.directory?.replace(
                          /[\\/][^\\/]+$/,
                          "",
                        );

                        return (
                          <section aria-label={`${workspace.name} 项目技能`} key={workspace.id}>
                            <SkillGroupHeader
                              directory={projectDirectory ?? null}
                              icon={<Folder aria-hidden className="size-4 shrink-0 text-muted" />}
                              title={workspace.name}
                              onOpenDirectory={() => {
                                if (projectDirectory) {
                                  openRootDirectory(workspace.id, projectDirectory);
                                }
                              }}
                            />
                            <div className="mt-1">{renderSkillList(entries)}</div>
                          </section>
                        );
                      })}
                    </div>
                  ) : (
                    renderSkillList([], "暂无技能")
                  )
                ) : activeWorkspaceIndex >= 0 ? (
                  renderSkillList(
                    (workspaceGroups[activeWorkspaceIndex]?.skills ?? [])
                      .filter((skill) => skill.scope === "project")
                      .map((skill) => ({
                        skill,
                        workspaceId: workspaces[activeWorkspaceIndex]?.id ?? "",
                      })),
                  )
                ) : null}
              </>
            )}
          </div>
        </section>
      )}

      <AlertDialog.Backdrop
        isOpen={removeTarget !== null}
        onOpenChange={(isOpen) => !isOpen && setRemoveTarget(null)}
      >
        <AlertDialog.Container>
          <AlertDialog.Dialog className="sm:max-w-[420px]">
            <AlertDialog.Header>
              <AlertDialog.Icon status="warning" />
              <AlertDialog.Heading>卸载 {removeTarget?.skill.name}？</AlertDialog.Heading>
            </AlertDialog.Header>
            <AlertDialog.Body>
              <p>对应的本地技能目录会被删除，此操作无法撤销。</p>
            </AlertDialog.Body>
            <AlertDialog.Footer>
              <Button slot="close" variant="tertiary">
                取消
              </Button>
              <Button
                isDisabled={removeMutation.isPending}
                variant="danger"
                onPress={() => removeTarget && removeMutation.mutate(removeTarget)}
              >
                确认卸载
              </Button>
            </AlertDialog.Footer>
          </AlertDialog.Dialog>
        </AlertDialog.Container>
      </AlertDialog.Backdrop>

      {targetWorkspace ? (
        <SkillInstallDialog
          isOpen={isInstallOpen}
          workspaceId={targetWorkspace.id}
          onClose={() => setIsInstallOpen(false)}
        />
      ) : null}
    </>
  );
}
