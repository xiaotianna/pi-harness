"use client";

import { Alert, AlertDialog, Button, Skeleton, Switch, toast } from "@heroui/react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { ToggleButton, ToggleButtonGroup } from "react-aria-components";
import {
  disconnectSkill,
  getSkillOAuthLaunchUrl,
  installSkillCollection,
  type SkillCollection,
  SkillIcon,
  skillCollectionDetailQueryOptions,
  skillCollectionQueryOptions,
  skillConnectionQueryOptions,
  skillQueryKeys,
  uninstallSkillCollection,
  updateSkillCollectionSkill,
} from "../../skills";
import { SettingsCatalogDetail } from "./settings-catalog-detail";
import { SettingsCatalogItem } from "./settings-catalog-item";
import { SettingsPanelHeader } from "./settings-panel-header";
import { SettingsSkillDetail } from "./settings-skill-detail";

const PLUGIN_CATEGORIES = [
  { id: "all", label: "全部" },
  { id: "developer", label: "开发工具" },
  { id: "productivity", label: "生产力" },
] as const;

type PluginCategoryId = (typeof PLUGIN_CATEGORIES)[number]["id"];
type PluginSkill = SkillCollection["skills"][number];

function PluginSkillSwitch({
  isDisabled,
  skill,
  onChange,
}: {
  isDisabled: boolean;
  skill: PluginSkill;
  onChange: (isEnabled: boolean) => void;
}) {
  return (
    <Switch
      aria-label={`${skill.name} 可用状态`}
      isDisabled={isDisabled}
      isSelected={skill.isEnabled}
      size="sm"
      onChange={onChange}
    >
      <Switch.Content>
        <Switch.Control>
          <Switch.Thumb />
        </Switch.Control>
      </Switch.Content>
    </Switch>
  );
}

function PluginSkillDetail({
  isUpdating,
  onBack,
  onEnabledChange,
  plugin,
  skill,
}: {
  isUpdating: boolean;
  onBack: () => void;
  onEnabledChange: (isEnabled: boolean) => void;
  plugin: SkillCollection;
  skill: PluginSkill;
}) {
  const contentQuery = useQuery(skillCollectionDetailQueryOptions(plugin.id, skill.id));
  return (
    <SettingsSkillDetail
      action={
        plugin.isInstalled ? (
          <div className="flex shrink-0 items-center gap-2">
            <span className="text-sm text-muted">{skill.isEnabled ? "已开启" : "已关闭"}</span>
            <PluginSkillSwitch isDisabled={isUpdating} skill={skill} onChange={onEnabledChange} />
          </div>
        ) : null
      }
      backLabel={`返回 ${plugin.name}`}
      content={contentQuery.data}
      contentError={contentQuery.error}
      description={skill.description}
      icon={<SkillIcon icon={skill.icon} className="size-6 shrink-0 text-muted" />}
      isContentPending={contentQuery.isPending}
      name={skill.name}
      onBack={onBack}
    />
  );
}

function PluginConnectionPanel({ plugin }: { plugin: SkillCollection }) {
  const queryClient = useQueryClient();
  const [authorizationWindow, setAuthorizationWindow] = useState<Window | null>(null);
  const isAwaitingAuthorization = authorizationWindow !== null;
  const statusQuery = useQuery({
    ...skillConnectionQueryOptions(plugin.id),
    enabled: plugin.type === "oauth",
    refetchInterval: isAwaitingAuthorization ? 1_000 : false,
    refetchIntervalInBackground: true,
  });
  useEffect(() => {
    if (!authorizationWindow) return;
    if (statusQuery.data?.isConnected) {
      setAuthorizationWindow(null);
      toast.success(`${plugin.name} 已授权`);
      return;
    }
    const intervalId = window.setInterval(() => {
      if (authorizationWindow.closed) setAuthorizationWindow(null);
    }, 500);
    return () => window.clearInterval(intervalId);
  }, [authorizationWindow, plugin.name, statusQuery.data?.isConnected]);
  const disconnectMutation = useMutation({
    mutationFn: () => disconnectSkill(plugin.id),
    onError: (error: Error) => toast.danger(error.message),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: skillQueryKeys.connection(plugin.id) });
      toast.success(`${plugin.name} 已断开连接`);
    },
  });

  if (statusQuery.isPending) {
    return (
      <section
        aria-busy="true"
        aria-label={`${plugin.name} 授权`}
        className="mt-6 flex min-h-16 items-center justify-between gap-4 rounded-xl bg-surface-secondary px-4 py-3"
      >
        <span className="sr-only">正在加载授权状态</span>
        <div className="min-w-0 flex-1 space-y-2">
          <Skeleton animationType="none" className="h-4 w-20 rounded-lg" />
          <Skeleton animationType="none" className="h-4 w-2/3 rounded-lg" />
        </div>
        <Skeleton animationType="none" className="h-8 w-20 shrink-0 rounded-xl" />
      </section>
    );
  }

  if (statusQuery.isError) {
    return (
      <Alert className="mt-6 bg-danger-soft" role="alert" status="danger">
        <Alert.Indicator />
        <Alert.Content>
          <Alert.Title>授权状态加载失败</Alert.Title>
          <Alert.Description>{statusQuery.error.message}</Alert.Description>
          <Button
            isPending={statusQuery.isFetching}
            size="sm"
            variant="tertiary"
            onPress={() => void statusQuery.refetch()}
          >
            重试
          </Button>
        </Alert.Content>
      </Alert>
    );
  }

  const isConnected = statusQuery.data.isConnected;
  const isPending = disconnectMutation.isPending || isAwaitingAuthorization;

  return (
    <section
      aria-label={`${plugin.name} 授权`}
      className="mt-6 flex min-h-16 items-center justify-between gap-4 rounded-xl bg-surface-secondary px-4 py-3"
    >
      <div className="min-w-0">
        <h3 className="text-sm font-medium text-foreground">账户授权</h3>
        <p className="mt-0.5 truncate text-sm text-muted">
          {isConnected
            ? `已连接 ${statusQuery.data.account?.displayName ?? statusQuery.data.account?.username ?? plugin.name}`
            : `授权后，Agent 才能使用 ${plugin.name} 技能。`}
        </p>
      </div>
      <Button
        aria-label={`${isConnected ? "断开" : "授权"} ${plugin.name}`}
        isPending={isPending}
        size="sm"
        variant={isConnected ? "tertiary" : "primary"}
        onPress={() => {
          if (isConnected) {
            disconnectMutation.mutate();
            return;
          }
          const authorizationWindow = window.open(
            getSkillOAuthLaunchUrl(plugin.id),
            "_blank",
            "popup,width=720,height=760",
          );
          if (!authorizationWindow) {
            toast.danger("浏览器阻止了授权窗口，请允许弹窗后重试");
            return;
          }
          setAuthorizationWindow(authorizationWindow);
        }}
      >
        {isAwaitingAuthorization ? "等待授权" : isConnected ? "断开授权" : "授权"}
      </Button>
    </section>
  );
}

function PluginInstalledActions({ plugin }: { plugin: SkillCollection }) {
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const updateMutation = useMutation({
    mutationFn: async (isEnabled: boolean) => {
      // ponytail: sequential per-skill updates; use a batch endpoint if atomic toggles are needed.
      for (const skill of plugin.skills) {
        if (skill.isEnabled !== isEnabled) {
          await updateSkillCollectionSkill(plugin.id, skill.id, isEnabled);
        }
      }
    },
    onError: (error: Error) => toast.danger(error.message),
    onSettled: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: skillQueryKeys.collections() }),
        queryClient.invalidateQueries({ queryKey: skillQueryKeys.lists() }),
      ]),
  });
  const mutation = useMutation({
    mutationFn: () => uninstallSkillCollection(plugin.id),
    onError: (error: Error) => toast.danger(error.message),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: skillQueryKeys.collections() }),
        queryClient.invalidateQueries({ queryKey: skillQueryKeys.connection(plugin.id) }),
        queryClient.invalidateQueries({ queryKey: skillQueryKeys.lists() }),
      ]);
      setIsOpen(false);
      toast.success(`${plugin.name} 已卸载`);
    },
  });

  return (
    <>
      <div className="flex shrink-0 items-center gap-2">
        {plugin.skills.length > 0 && (
          <Switch
            aria-label={`${plugin.name} 可用状态`}
            isDisabled={updateMutation.isPending || mutation.isPending || isOpen}
            isSelected={plugin.skills.some((skill) => skill.isEnabled)}
            size="sm"
            onChange={(isEnabled) => updateMutation.mutate(isEnabled)}
          >
            <Switch.Content>
              <Switch.Control>
                <Switch.Thumb />
              </Switch.Control>
            </Switch.Content>
          </Switch>
        )}
        <Button
          aria-label={`卸载 ${plugin.name}`}
          isDisabled={updateMutation.isPending || mutation.isPending}
          size="sm"
          variant="danger-soft"
          onPress={() => setIsOpen(true)}
        >
          卸载
        </Button>
      </div>
      <AlertDialog.Backdrop isOpen={isOpen} onOpenChange={setIsOpen}>
        <AlertDialog.Container>
          <AlertDialog.Dialog className="sm:max-w-[420px]">
            <AlertDialog.Header>
              <AlertDialog.Icon status="warning" />
              <AlertDialog.Heading>卸载 {plugin.name}？</AlertDialog.Heading>
            </AlertDialog.Header>
            <AlertDialog.Body>
              <p>插件包含的技能将停止使用，已有授权也会一并移除。</p>
            </AlertDialog.Body>
            <AlertDialog.Footer>
              <Button slot="close" variant="tertiary">
                取消
              </Button>
              <Button
                isDisabled={mutation.isPending}
                variant="danger"
                onPress={() => mutation.mutate()}
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

function PluginInstallAction({ plugin }: { plugin: SkillCollection }) {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: () => installSkillCollection(plugin.id),
    onError: (error: Error) => toast.danger(error.message),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: skillQueryKeys.collections() }),
        queryClient.invalidateQueries({ queryKey: skillQueryKeys.lists() }),
      ]);
      toast.success(`${plugin.name} 已安装`);
    },
  });

  if (plugin.isInstalled) {
    return <PluginInstalledActions plugin={plugin} />;
  }

  return (
    <Button
      isPending={mutation.isPending}
      size="sm"
      variant="secondary"
      onPress={() => mutation.mutate()}
    >
      安装
    </Button>
  );
}

function PluginList({
  plugins,
  onSelect,
}: {
  plugins: readonly SkillCollection[];
  onSelect: (id: string) => void;
}) {
  return (
    <ul className="flex flex-col gap-1">
      {plugins.map((plugin) => (
        <SettingsCatalogItem
          action={<PluginInstallAction plugin={plugin} />}
          ariaLabel={`查看 ${plugin.name} 插件详情`}
          icon={<SkillIcon icon={plugin.logo} className="size-5 shrink-0 text-muted" />}
          key={plugin.id}
          name={plugin.name}
          secondary={<span className="min-w-0 flex-1 truncate">{plugin.description}</span>}
          onPress={() => onSelect(plugin.id)}
        />
      ))}
    </ul>
  );
}

function PluginDetail({ onBack, plugin }: { onBack: () => void; plugin: SkillCollection }) {
  const queryClient = useQueryClient();
  const [selectedSkillId, setSelectedSkillId] = useState<string | null>(null);
  const updateMutation = useMutation<
    void,
    Error,
    { isEnabled: boolean; skillId: string },
    readonly SkillCollection[] | undefined
  >({
    mutationFn: ({ isEnabled, skillId }) =>
      updateSkillCollectionSkill(plugin.id, skillId, isEnabled),
    onError: (error, _variables, previousCollections) => {
      queryClient.setQueryData(skillQueryKeys.collections(), previousCollections);
      toast.danger(error.message);
    },
    onMutate: async ({ isEnabled, skillId }) => {
      await queryClient.cancelQueries({ queryKey: skillQueryKeys.collections() });
      const previousCollections = queryClient.getQueryData<readonly SkillCollection[]>(
        skillQueryKeys.collections(),
      );
      queryClient.setQueryData<readonly SkillCollection[]>(
        skillQueryKeys.collections(),
        (collections) =>
          collections?.map((collection) =>
            collection.id === plugin.id
              ? {
                  ...collection,
                  skills: collection.skills.map((skill) =>
                    skill.id === skillId ? { ...skill, isEnabled } : skill,
                  ),
                }
              : collection,
          ),
      );
      return previousCollections;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: skillQueryKeys.lists() }),
  });
  const selectedSkill = plugin.skills.find((skill) => skill.id === selectedSkillId);

  if (selectedSkill) {
    return (
      <PluginSkillDetail
        isUpdating={
          updateMutation.isPending && updateMutation.variables.skillId === selectedSkill.id
        }
        plugin={plugin}
        skill={selectedSkill}
        onBack={() => setSelectedSkillId(null)}
        onEnabledChange={(isEnabled) =>
          updateMutation.mutate({ isEnabled, skillId: selectedSkill.id })
        }
      />
    );
  }

  return (
    <SettingsCatalogDetail
      action={<PluginInstallAction plugin={plugin} />}
      ariaLabel={`${plugin.name} 插件详情`}
      backLabel="返回插件市场"
      description={plugin.description}
      icon={<SkillIcon icon={plugin.logo} className="size-6 shrink-0 text-muted" />}
      name={plugin.name}
      onBack={onBack}
    >
      {plugin.isInstalled && plugin.type === "oauth" ? (
        <PluginConnectionPanel plugin={plugin} />
      ) : null}
      <div className="mt-8">
        <div className="flex items-center gap-2">
          <h3 className="font-medium text-foreground">包含的技能</h3>
          <span className="text-sm tabular-nums text-muted">{plugin.skills.length}</span>
        </div>
        <ul className="mt-3 flex flex-col gap-1">
          {plugin.skills.map((skill) => {
            const isUpdating =
              updateMutation.isPending && updateMutation.variables.skillId === skill.id;

            return (
              <SettingsCatalogItem
                action={
                  plugin.isInstalled ? (
                    <PluginSkillSwitch
                      isDisabled={isUpdating}
                      skill={skill}
                      onChange={(isEnabled) =>
                        updateMutation.mutate({ isEnabled, skillId: skill.id })
                      }
                    />
                  ) : null
                }
                ariaLabel={`查看 ${skill.name} 技能详情`}
                icon={<SkillIcon icon={skill.icon} className="size-5 shrink-0 text-muted" />}
                key={skill.id}
                name={skill.name}
                secondary={<span className="min-w-0 flex-1 truncate">{skill.description}</span>}
                onPress={() => setSelectedSkillId(skill.id)}
              />
            );
          })}
        </ul>
      </div>
    </SettingsCatalogDetail>
  );
}

function PluginMarketplaceSkeleton() {
  return (
    <div aria-busy="true" className="mt-3 flex min-h-16 items-center gap-3 px-3 py-2">
      <span className="sr-only">正在加载插件市场</span>
      <Skeleton className="size-10 shrink-0 rounded-xl" />
      <div className="min-w-0 flex-1 space-y-2">
        <Skeleton className="h-5 w-28 rounded-lg" />
        <Skeleton className="h-4 w-full rounded-lg" />
      </div>
      <Skeleton className="h-8 w-20 rounded-xl" />
    </div>
  );
}

export function PluginMarketplacePanel() {
  const [activeCategoryId, setActiveCategoryId] = useState<PluginCategoryId>("all");
  const [selectedPluginId, setSelectedPluginId] = useState<string | null>(null);
  const pluginsQuery = useQuery(skillCollectionQueryOptions);
  const selectedPlugin = pluginsQuery.data?.find((plugin) => plugin.id === selectedPluginId);

  if (selectedPlugin) {
    return <PluginDetail plugin={selectedPlugin} onBack={() => setSelectedPluginId(null)} />;
  }

  const visiblePlugins =
    activeCategoryId === "all"
      ? pluginsQuery.data
      : pluginsQuery.data?.filter((plugin) => plugin.category === activeCategoryId);

  return (
    <section aria-label="插件市场" className="w-full max-w-[720px]">
      <SettingsPanelHeader
        description="发现并连接 Skill 集合，让 Agent 安全地使用外部服务。"
        title="插件市场"
      />

      <ToggleButtonGroup
        aria-label="插件分类"
        className="mt-5 flex flex-wrap gap-1"
        disallowEmptySelection
        selectedKeys={[activeCategoryId]}
        selectionMode="single"
        onSelectionChange={(keys) => {
          const [key] = keys;
          if (typeof key === "string") setActiveCategoryId(key as PluginCategoryId);
        }}
      >
        {PLUGIN_CATEGORIES.map((category) => (
          <ToggleButton
            className="h-8 cursor-[var(--cursor-interactive)] rounded-lg px-3 text-sm text-muted outline-none hover:bg-default data-[focus-visible]:bg-default data-[selected]:bg-accent-soft data-[selected]:font-medium data-[selected]:text-accent-soft-foreground"
            id={category.id}
            key={category.id}
          >
            {category.label}
          </ToggleButton>
        ))}
      </ToggleButtonGroup>

      {pluginsQuery.isPending ? (
        <PluginMarketplaceSkeleton />
      ) : pluginsQuery.isError ? (
        <Alert className="mt-3 bg-danger-soft" role="alert" status="danger">
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Title>插件市场加载失败</Alert.Title>
            <Alert.Description>{pluginsQuery.error.message}</Alert.Description>
          </Alert.Content>
        </Alert>
      ) : visiblePlugins?.length ? (
        <div className="mt-3">
          <PluginList plugins={visiblePlugins} onSelect={setSelectedPluginId} />
        </div>
      ) : (
        <p className="py-8 text-center text-sm text-muted">当前分类暂无插件</p>
      )}
    </section>
  );
}
