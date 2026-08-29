"use client";

import { Folder, FolderOpen, Globe, MagicWand } from "@gravity-ui/icons";
import {
  Alert,
  AlertDialog,
  Button,
  ScrollShadow,
  Skeleton,
  Switch,
  Tooltip,
  toast,
} from "@heroui/react";
import { useMutation, useQueries, useQueryClient } from "@tanstack/react-query";
import { type ReactNode, useState } from "react";
import { ToggleButton, ToggleButtonGroup } from "react-aria-components";
import {
  openSkillDirectory,
  openSkillRootDirectory,
  removeSkill,
  type Skill,
  skillListQueryOptions,
  skillQueryKeys,
  updateSkill,
} from "../../skills";
import { SettingsCatalogDetail } from "./settings-catalog-detail";
import { SettingsCatalogItem } from "./settings-catalog-item";
import { SettingsPanelHeader } from "./settings-panel-header";

const ALL_SKILLS_TAB_ID = "all";

export type SkillSettingsWorkspace = {
  id: string;
  name: string;
  path: string;
};

type SkillEntry = {
  skill: Skill;
  workspaceId: string;
};

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
  onBack,
  onOpenDirectory,
}: {
  entry: SkillEntry;
  onBack: () => void;
  onOpenDirectory: () => void;
}) {
  return (
    <SettingsCatalogDetail
      action={
        <Button size="sm" variant="tertiary" onPress={onOpenDirectory}>
          <FolderOpen aria-hidden className="size-4" />
          打开目录
        </Button>
      }
      ariaLabel={`${entry.skill.name} 技能详情`}
      backLabel="返回技能"
      description={entry.skill.description}
      icon={<MagicWand aria-hidden className="size-6 text-muted" />}
      name={entry.skill.name}
      onBack={onBack}
    >
      <div className="mt-8">
        <h3 className="font-medium text-foreground">所在目录</h3>
        <div className="mt-3 flex min-h-16 items-center gap-3 rounded-xl px-3 py-2.5">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-surface-secondary">
            <FolderOpen aria-hidden className="size-4 text-muted" />
          </div>
          <p className="min-w-0 flex-1 truncate text-sm text-muted">{entry.skill.directory}</p>
        </div>
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
  workspaces,
}: {
  workspaces: readonly SkillSettingsWorkspace[];
}) {
  const queryClient = useQueryClient();
  const [activeTabId, setActiveTabId] = useState(ALL_SKILLS_TAB_ID);
  const [detailEntry, setDetailEntry] = useState<SkillEntry | null>(null);
  const [removeTarget, setRemoveTarget] = useState<SkillEntry | null>(null);
  const skillQueries = useQueries({
    queries: workspaces.map((workspace) => skillListQueryOptions(workspace.id)),
  });
  const workspaceGroups = workspaces.map((workspace, index) => ({
    skills: skillQueries[index]?.data,
    workspace,
  }));
  const globalGroup = workspaceGroups.find((group) => group.skills !== undefined);
  const globalEntries = (globalGroup?.skills ?? [])
    .filter((skill) => skill.scope === "global")
    .map((skill) => ({ skill, workspaceId: globalGroup?.workspace.id ?? "" }));
  const globalDirectory = globalEntries.at(0)?.skill.directory.replace(/[\\/][^\\/]+$/, "");
  const activeWorkspaceIndex = workspaces.findIndex((workspace) => workspace.id === activeTabId);
  const activeQueries =
    activeTabId === ALL_SKILLS_TAB_ID
      ? skillQueries
      : activeWorkspaceIndex >= 0
        ? [skillQueries[activeWorkspaceIndex]]
        : [];
  const activeError = activeQueries.find((query) => query?.isError)?.error;
  const isPending = activeQueries.some((query) => query?.isPending);

  const updateMutation = useMutation({
    mutationFn: ({ entry, isEnabled }: { entry: SkillEntry; isEnabled: boolean }) =>
      updateSkill(entry.workspaceId, entry.skill, isEnabled),
    onError: (error: Error) => toast.danger(error.message),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: skillQueryKeys.all }),
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

  const renderSkillList = (entries: readonly SkillEntry[], emptyMessage = "暂无技能") =>
    entries.length === 0 ? (
      <p className="py-8 text-center text-sm text-muted">{emptyMessage}</p>
    ) : (
      <ul className="flex flex-col gap-1">
        {entries.map((entry) => {
          const isUpdating =
            updateMutation.isPending &&
            updateMutation.variables.entry.workspaceId === entry.workspaceId &&
            updateMutation.variables.entry.skill.id === entry.skill.id;
          const isRemoving =
            removeMutation.isPending &&
            removeMutation.variables.workspaceId === entry.workspaceId &&
            removeMutation.variables.skill.id === entry.skill.id;

          return (
            <SettingsCatalogItem
              action={
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
              }
              ariaLabel={`查看 ${entry.skill.name} 详情`}
              icon={<MagicWand aria-hidden className="size-5 text-muted" />}
              key={`${entry.workspaceId}:${entry.skill.id}`}
              name={entry.skill.name}
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
          onBack={() => setDetailEntry(null)}
          onOpenDirectory={() => openDirectory(detailEntry)}
        />
      ) : (
        <section aria-label="技能设置" className="w-full min-w-0 max-w-[720px]">
          <SettingsPanelHeader
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
                {activeError ? (
                  <Alert className="mb-4 bg-danger-soft" role="alert" status="danger">
                    <Alert.Indicator />
                    <Alert.Content>
                      <Alert.Title>技能加载失败</Alert.Title>
                      <Alert.Description>
                        {activeError instanceof Error ? activeError.message : "无法加载技能"}
                      </Alert.Description>
                    </Alert.Content>
                  </Alert>
                ) : null}

                {activeTabId === ALL_SKILLS_TAB_ID ? (
                  <div className="space-y-4">
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
                      <div className="mt-1">{renderSkillList(globalEntries, "暂无全局技能")}</div>
                    </section>

                    {workspaceGroups.map(({ skills, workspace }) => {
                      const entries = (skills ?? [])
                        .filter((skill) => skill.scope === "project")
                        .map((skill) => ({ skill, workspaceId: workspace.id }));
                      if (entries.length === 0) return null;
                      const projectDirectory = entries[0]?.skill.directory.replace(
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
    </>
  );
}
