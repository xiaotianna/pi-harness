"use client";

import { Alert, AlertDialog, Button, Card, Skeleton, Switch, toast } from "@heroui/react";
import {
  McpAuthMode,
  McpAuthRequirement,
  McpCatalogStatus,
  McpTransport,
} from "@pi-harness/agent-runtime/mcp-contract";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import {
  deleteSkillCollectionAppCredential,
  disconnectSkill,
  getSkillCollectionAppOAuthLaunchUrl,
  getSkillOAuthLaunchUrl,
  installSkillCollection,
  putSkillCollectionAppCredential,
  type SkillCollection,
  SkillIcon,
  skillCollectionDetailQueryOptions,
  skillCollectionQueryOptions,
  skillConnectionQueryOptions,
  skillQueryKeys,
  uninstallSkillCollection,
  updateSkillCollectionApp,
  updateSkillCollectionSkill,
} from "../../skills";
import { McpCredentialEditor } from "./mcp-credential-editor";
import { SettingsCatalogDetail } from "./settings-catalog-detail";
import { SettingsCatalogItem } from "./settings-catalog-item";
import { SettingsFilterTabs } from "./settings-filter-tabs";
import { SettingsPanelHeader } from "./settings-panel-header";
import { SettingsSkillDetail } from "./settings-skill-detail";

const PLUGIN_CATEGORIES = [
  { id: "all", label: "全部" },
  { id: "developer", label: "开发工具" },
  { id: "productivity", label: "生产力" },
] as const;

type PluginCategoryId = (typeof PLUGIN_CATEGORIES)[number]["id"];
type PluginSkill = SkillCollection["skills"][number];
type PluginApp = SkillCollection["apps"][number];

function pluginAppStatus(app: PluginApp): string {
  const server = app.server;
  if (server === null || !server.isEnabled) return "未开启";
  if (app.usesPluginOAuth && !server.hasCredential) return "需要插件授权";
  if (!server.hasCredential && server.authRequirement === McpAuthRequirement.OAUTH) return "未授权";
  if (!server.hasCredential && server.authRequirement === McpAuthRequirement.STATIC)
    return "未配置凭据";
  if (server.catalogStatus === McpCatalogStatus.LOADING) return "正在连接";
  if (server.catalogStatus === McpCatalogStatus.ERROR) return "连接失败";
  if (server.catalogStatus === McpCatalogStatus.READY) return "已连接";
  if (server.credentialMode === McpAuthMode.OAUTH) return "OAuth 已授权";
  if (server.credentialMode === McpAuthMode.STATIC) return "凭据已配置";
  if (server.authRequirement === McpAuthRequirement.OAUTH) return "需要 OAuth 授权";
  if (server.authRequirement === McpAuthRequirement.STATIC) return "需要 Token / API Key";
  if (server.authRequirement === McpAuthRequirement.NONE) return "无需授权";
  return "首次连接时自动检测授权方式";
}

function pluginAppStatusDotClassName(app: PluginApp): string {
  const server = app.server;
  if (server === null || !server.isEnabled) return "bg-muted";
  if (app.usesPluginOAuth && !server.hasCredential) return "bg-warning";
  if (
    !server.hasCredential &&
    (server.authRequirement === McpAuthRequirement.OAUTH ||
      server.authRequirement === McpAuthRequirement.STATIC)
  )
    return "bg-warning";
  if (server.catalogStatus === McpCatalogStatus.ERROR) return "bg-danger";
  if (server.catalogStatus === McpCatalogStatus.LOADING) return "bg-accent";
  if (
    server.catalogStatus === McpCatalogStatus.READY ||
    server.credentialMode === McpAuthMode.OAUTH ||
    server.credentialMode === McpAuthMode.STATIC
  )
    return "bg-success";
  return "bg-muted";
}

function usePluginAppOAuth(app: PluginApp) {
  const queryClient = useQueryClient();
  const [oauthWindow, setOauthWindow] = useState<{
    credentialRevision: number | undefined;
    window: Window;
  } | null>(null);

  useEffect(() => {
    if (oauthWindow === null) return;
    if (
      app.server?.credentialRevision !== undefined &&
      app.server.credentialRevision !== oauthWindow.credentialRevision
    ) {
      setOauthWindow(null);
      toast.success(`${app.name} 已授权`);
      return;
    }
    const intervalId = window.setInterval(() => {
      if (oauthWindow.window.closed) setOauthWindow(null);
      void queryClient.invalidateQueries({ queryKey: skillQueryKeys.collections() });
    }, 1_000);
    return () => window.clearInterval(intervalId);
  }, [app.name, app.server?.credentialRevision, oauthWindow, queryClient]);

  const authorize = () => {
    const server = app.server;
    if (!server) return;
    const launchUrl = getSkillCollectionAppOAuthLaunchUrl(app);
    if (launchUrl === null) return;
    const authorizationWindow = window.open(launchUrl, "_blank", "popup,width=720,height=760");
    if (!authorizationWindow) {
      toast.danger("浏览器阻止了授权窗口，请允许弹窗后重试");
      return;
    }
    setOauthWindow({
      credentialRevision: server.credentialRevision,
      window: authorizationWindow,
    });
  };

  return { authorize, isAwaitingAuthorization: oauthWindow !== null };
}

function PluginAppItem({ app, onPress }: { app: PluginApp; onPress: () => void }) {
  const { authorize, isAwaitingAuthorization } = usePluginAppOAuth(app);
  const server = app.server;
  const isOAuthAuthorizationRequired =
    server?.isEnabled === true &&
    !app.usesPluginOAuth &&
    !server.hasCredential &&
    server.authRequirement === McpAuthRequirement.OAUTH;

  return (
    <SettingsCatalogItem
      action={
        isOAuthAuthorizationRequired ? (
          <Button
            aria-label={`授权 ${app.name}`}
            isPending={isAwaitingAuthorization}
            size="sm"
            onPress={authorize}
          >
            {isAwaitingAuthorization ? "等待授权" : "授权"}
          </Button>
        ) : (
          <Button className="gap-2" size="sm" variant="secondary" onPress={onPress}>
            <span
              aria-hidden
              className={`size-1.5 shrink-0 rounded-full ${pluginAppStatusDotClassName(app)}`}
            />
            {pluginAppStatus(app)}
          </Button>
        )
      }
      ariaLabel={`查看 ${app.name} 应用详情`}
      icon={<SkillIcon icon={app.icon} className="size-5 shrink-0 text-muted" />}
      name={app.name}
      secondary={<span className="min-w-0 flex-1 truncate">{app.description}</span>}
      onPress={onPress}
    />
  );
}

function PluginAppDetail({
  app,
  onBack,
  plugin,
}: {
  app: PluginApp;
  onBack: () => void;
  plugin: SkillCollection;
}) {
  const queryClient = useQueryClient();
  const [isEditingCredential, setIsEditingCredential] = useState(false);
  const { authorize, isAwaitingAuthorization } = usePluginAppOAuth(app);
  const updateMutation = useMutation({
    mutationFn: (isEnabled: boolean) => updateSkillCollectionApp(plugin.id, app.id, isEnabled),
    onError: (error: Error) => toast.danger(error.message),
    onSettled: () => queryClient.invalidateQueries({ queryKey: skillQueryKeys.collections() }),
  });

  const server = app.server;
  const isOAuth = !app.usesPluginOAuth && server?.authRequirement === McpAuthRequirement.OAUTH;
  const isStatic = !app.usesPluginOAuth && server?.authRequirement === McpAuthRequirement.STATIC;
  const authLabel = app.usesPluginOAuth
    ? `使用 ${plugin.name} 插件授权`
    : isOAuth
      ? "OAuth"
      : isStatic
        ? "Token / API Key"
        : server?.authRequirement === McpAuthRequirement.NONE
          ? "无需授权"
          : "自动检测";
  const transportLabel =
    server?.transport === McpTransport.STREAMABLE_HTTP
      ? "Streamable HTTP"
      : (server?.transport ?? "安装插件后可用");

  return (
    <>
      <SettingsCatalogDetail
        action={
          <div className="flex shrink-0 items-center gap-2">
            <span className="text-sm text-muted">{pluginAppStatus(app)}</span>
            {plugin.isInstalled && server ? (
              <Switch
                aria-label={`${app.name} 可用状态`}
                isDisabled={updateMutation.isPending}
                isSelected={server.isEnabled}
                size="sm"
                onChange={(isEnabled) => updateMutation.mutate(isEnabled)}
              >
                <Switch.Content>
                  <Switch.Control>
                    <Switch.Thumb />
                  </Switch.Control>
                </Switch.Content>
              </Switch>
            ) : null}
          </div>
        }
        ariaLabel={`${app.name} 应用详情`}
        backLabel={`返回 ${plugin.name}`}
        description={app.description}
        icon={<SkillIcon icon={app.icon} className="size-5 shrink-0 text-muted" />}
        name={app.name}
        onBack={onBack}
      >
        <Card className="mt-6" variant="secondary">
          <Card.Content>
            <dl className="grid gap-4 text-sm sm:grid-cols-2">
              <div className="min-w-0">
                <dt className="text-xs text-muted">所属插件</dt>
                <dd className="mt-1 break-all text-foreground">{plugin.name}</dd>
              </div>
              <div className="min-w-0">
                <dt className="text-xs text-muted">应用 ID</dt>
                <dd className="mt-1 break-all text-foreground">{app.id}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted">连接方式</dt>
                <dd className="mt-1 text-foreground">{transportLabel}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted">鉴权</dt>
                <dd className="mt-1 text-foreground">{authLabel}</dd>
              </div>
            </dl>
          </Card.Content>
        </Card>

        {plugin.isInstalled && server?.isEnabled && app.usesPluginOAuth ? (
          <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="font-medium text-foreground">授权</h3>
              <p className="mt-1 text-sm text-muted">
                {server.hasCredential
                  ? `正在使用 ${plugin.name} 插件授权，无需单独连接。`
                  : `${plugin.name} 插件未授权或授权已失效，请返回插件详情重新授权。`}
              </p>
            </div>
            {!server.hasCredential ? (
              <Button size="sm" variant="secondary" onPress={onBack}>
                返回插件授权
              </Button>
            ) : null}
          </div>
        ) : plugin.isInstalled && server?.isEnabled && (isOAuth || isStatic) ? (
          <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="font-medium text-foreground">授权</h3>
              <p className="mt-1 text-sm text-muted">
                {server.hasCredential
                  ? isOAuth
                    ? "OAuth 已授权"
                    : "凭据已配置"
                  : isOAuth
                    ? "需要完成 OAuth 授权后才能使用"
                    : "需要配置 Token 或 API Key 后才能使用"}
              </p>
            </div>
            <Button
              isPending={isOAuth && isAwaitingAuthorization}
              size="sm"
              variant={server.hasCredential ? "secondary" : "primary"}
              onPress={isOAuth ? authorize : () => setIsEditingCredential(true)}
            >
              {isOAuth
                ? server.hasCredential
                  ? "重新授权"
                  : "授权"
                : server.hasCredential
                  ? "更新凭据"
                  : "设置凭据"}
            </Button>
          </div>
        ) : null}
      </SettingsCatalogDetail>
      {isEditingCredential && server ? (
        <McpCredentialEditor
          server={{
            config: { transport: server.transport },
            hasCredential: server.hasCredential,
            id: server.id,
            name: app.name,
            revision: server.revision,
          }}
          onClose={() => setIsEditingCredential(false)}
          onDeleteCredential={() => deleteSkillCollectionAppCredential(plugin.id, app.id)}
          onPutCredential={(material) =>
            putSkillCollectionAppCredential(
              plugin.id,
              app.id,
              server.transport === McpTransport.STDIO ? material.environment : material.headers,
            )
          }
          onSaved={() => queryClient.invalidateQueries({ queryKey: skillQueryKeys.collections() })}
        />
      ) : null}
    </>
  );
}

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
    if (statusQuery.data !== undefined) {
      void queryClient.invalidateQueries({ queryKey: skillQueryKeys.collections() });
    }
    if (!authorizationWindow) return;
    if (statusQuery.data?.isConnected) {
      setAuthorizationWindow(null);
      void queryClient.invalidateQueries({ queryKey: skillQueryKeys.collections() });
      toast.success(`${plugin.name} 已授权`);
      return;
    }
    const intervalId = window.setInterval(() => {
      if (authorizationWindow.closed) setAuthorizationWindow(null);
    }, 500);
    return () => window.clearInterval(intervalId);
  }, [authorizationWindow, plugin.name, queryClient, statusQuery.data]);
  const disconnectMutation = useMutation({
    mutationFn: () => disconnectSkill(plugin.id),
    onError: (error: Error) => toast.danger(error.message),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: skillQueryKeys.connection(plugin.id) }),
        queryClient.invalidateQueries({ queryKey: skillQueryKeys.collections() }),
      ]);
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
        <h3 className="text-sm font-medium text-foreground">Skill 网关授权</h3>
        <p className="mt-0.5 truncate text-sm text-muted">
          {isConnected
            ? `已连接 ${statusQuery.data.account?.displayName ?? statusQuery.data.account?.username ?? plugin.name}`
            : `未授权或授权已失效，请重新授权后使用 ${plugin.name}。`}
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
            getSkillOAuthLaunchUrl(plugin.id, plugin.name),
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
      // ponytail: sequential per-item updates; use a batch endpoint if atomic toggles are needed.
      for (const skill of plugin.skills) {
        if (skill.isEnabled !== isEnabled) {
          await updateSkillCollectionSkill(plugin.id, skill.id, isEnabled);
        }
      }
      for (const app of plugin.apps) {
        if ((app.server?.isEnabled ?? false) !== isEnabled) {
          await updateSkillCollectionApp(plugin.id, app.id, isEnabled);
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
        {plugin.skills.length + plugin.apps.length > 0 && (
          <Switch
            aria-label={`${plugin.name} 可用状态`}
            isDisabled={updateMutation.isPending || mutation.isPending || isOpen}
            isSelected={
              plugin.skills.some((skill) => skill.isEnabled) ||
              plugin.apps.some((app) => app.server?.isEnabled)
            }
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
              <p>插件包含的应用和技能将停止使用，已有授权也会一并移除。</p>
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
  const [selectedAppId, setSelectedAppId] = useState<string | null>(null);
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
  const selectedApp = plugin.apps.find((app) => app.id === selectedAppId);
  const selectedSkill = plugin.skills.find((skill) => skill.id === selectedSkillId);

  if (selectedApp) {
    return (
      <PluginAppDetail app={selectedApp} plugin={plugin} onBack={() => setSelectedAppId(null)} />
    );
  }

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
      {plugin.apps.length > 0 ? (
        <div className="mt-8">
          <div className="flex items-center gap-2">
            <h3 className="font-medium text-foreground">包含的应用</h3>
            <span className="text-sm tabular-nums text-muted">{plugin.apps.length}</span>
          </div>
          <ul className="mt-3 flex flex-col gap-1">
            {plugin.apps.map((app) => (
              <PluginAppItem app={app} key={app.id} onPress={() => setSelectedAppId(app.id)} />
            ))}
          </ul>
        </div>
      ) : null}
      {plugin.skills.length > 0 ? (
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
      ) : null}
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
        description="发现包含应用和 Skill 的插件，让 Agent 安全地使用外部服务。"
        title="插件市场"
      />

      <SettingsFilterTabs
        label="插件分类"
        className="mt-5"
        items={PLUGIN_CATEGORIES}
        selectedKey={activeCategoryId}
        onSelectionChange={setActiveCategoryId}
      />

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
