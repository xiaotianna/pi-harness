import { Display, TrashBin, UniversalAccess } from "@gravity-ui/icons";
import { Alert, Button, Chip, Skeleton, Spinner, Switch, Tooltip, toast } from "@heroui/react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { type CSSProperties, useState } from "react";
import {
  type SkillCollection,
  SkillIcon,
  skillCollectionQueryOptions,
  skillQueryKeys,
  updateSkillCollectionApp,
} from "../../skills";
import { ComputerUsePermission, getComputerUseAppIconUrl } from "../api/app-settings-api";
import { useAppSettings } from "../hooks/use-app-settings";
import { useComputerUsePermissions } from "../hooks/use-computer-use-permissions";
import { PluginInstallButton } from "./plugin-marketplace-panel";
import { SettingsCatalogItem } from "./settings-catalog-item";
import { SettingsPanelHeader } from "./settings-panel-header";

const PERMISSION_STATUS_TEXT = {
  denied: "未授权",
  error: "无法读取",
  granted: "已授权",
  loading: "读取中…",
  verifying: "待核对",
} as const;

type PermissionStatus = keyof typeof PERMISSION_STATUS_TEXT;

const PERMISSION_STATUS_COLOR = {
  denied: "warning",
  error: "danger",
  granted: "success",
  verifying: "accent",
} as const;

export function ComputerUseSettingsPanel() {
  const queryClient = useQueryClient();
  const pluginQuery = useQuery(skillCollectionQueryOptions);
  const computerUsePlugin = pluginQuery.data?.find((plugin) => plugin.id === "computer-use");
  const computerUseApp = computerUsePlugin?.apps.find((app) => app.id === "computer-use");
  const updateAppMutation = useMutation({
    mutationFn: (isEnabled: boolean) =>
      updateSkillCollectionApp("computer-use", "computer-use", isEnabled),
    onMutate: async (isEnabled) => {
      await queryClient.cancelQueries({ queryKey: skillQueryKeys.collections() });
      const previousEnabled = computerUseApp?.server?.isEnabled ?? false;
      queryClient.setQueryData<SkillCollection[]>(skillQueryKeys.collections(), (plugins) =>
        plugins?.map((plugin) =>
          plugin.id === "computer-use"
            ? {
                ...plugin,
                apps: plugin.apps.map((app) =>
                  app.id === "computer-use" && app.server
                    ? { ...app, server: { ...app.server, isEnabled } }
                    : app,
                ),
              }
            : plugin,
        ),
      );
      return previousEnabled;
    },
    onError: (error: Error, _isEnabled, previousEnabled) => {
      queryClient.setQueryData<SkillCollection[]>(skillQueryKeys.collections(), (plugins) =>
        plugins?.map((plugin) =>
          plugin.id === "computer-use"
            ? {
                ...plugin,
                apps: plugin.apps.map((app) =>
                  app.id === "computer-use" && app.server
                    ? { ...app, server: { ...app.server, isEnabled: previousEnabled ?? false } }
                    : app,
                ),
              }
            : plugin,
        ),
      );
      toast.danger(error.message);
    },
    onSettled: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: skillQueryKeys.collections() }),
        queryClient.invalidateQueries({ queryKey: skillQueryKeys.lists() }),
      ]),
  });
  const { error, isLoading, revokingComputerUseApp, revokeComputerUseApp, settings } =
    useAppSettings();
  const {
    error: permissionsError,
    isLoading: isLoadingPermissions,
    isRefreshing,
    pendingPermissions,
    permissions,
    openPermissionSettings,
    refreshPermissions,
    requestPermission,
    verifyingPermissions,
  } = useComputerUsePermissions();
  const allowedApps = settings?.computerUseAllowedApps ?? [];
  const sharedPermissionStatus: PermissionStatus | null =
    isLoadingPermissions || isRefreshing ? "loading" : permissionsError ? "error" : null;

  const revoke = (bundleId: string) => {
    void revokeComputerUseApp(bundleId)
      .then(() => toast.success("已撤销应用授权"))
      .catch((cause: unknown) => {
        toast.danger(cause instanceof Error ? cause.message : "撤销应用授权失败");
      });
  };

  const authorize = (permission: ComputerUsePermission) => {
    void requestPermission(permission).catch((cause: unknown) => {
      toast.danger(cause instanceof Error ? cause.message : "发起系统授权失败");
    });
  };

  const openSettings = (permission: ComputerUsePermission) => {
    void openPermissionSettings(permission).catch((cause: unknown) => {
      toast.danger(cause instanceof Error ? cause.message : "打开系统设置失败");
    });
  };

  return (
    <section aria-label="电脑操控设置" className="w-full max-w-[720px]">
      <SettingsPanelHeader
        description="管理电脑操控所需的 macOS 系统权限和可观察的本机应用。具体点击、输入和拖拽仍会在执行前单独确认。"
        title="电脑操控"
      />

      {pluginQuery.isPending ? (
        <div aria-busy="true" className="mt-5" role="status">
          <span className="sr-only">正在读取 Computer Use 插件状态</span>
          <Skeleton className="h-20 w-full rounded-xl" />
        </div>
      ) : pluginQuery.isError || !computerUsePlugin ? (
        <Alert className="mt-5" status="danger">
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Title>无法确认 Computer Use 插件状态</Alert.Title>
            <Alert.Description>请重试，确认插件可用后再使用电脑操控。</Alert.Description>
            <Button size="sm" variant="tertiary" onPress={() => void pluginQuery.refetch()}>
              重试
            </Button>
          </Alert.Content>
        </Alert>
      ) : (
        <div className="mt-5">
          <p className="text-sm text-muted">
            {computerUsePlugin.isInstalled
              ? !computerUseApp?.server
                ? "暂时无法读取 Computer Use 应用状态，请刷新后重试。"
                : computerUseApp.server.isEnabled
                  ? "Computer Use 已开启。电脑操控还需下方系统权限。"
                  : "请开启 Computer Use 应用，才能使用电脑操控。"
              : "电脑操控需要先安装并开启内置 Computer Use 插件。"}
          </p>
          <ul className="mt-3">
            <SettingsCatalogItem
              action={
                computerUsePlugin.isInstalled && !computerUseApp?.server ? (
                  <Button size="sm" variant="secondary" onPress={() => void pluginQuery.refetch()}>
                    重试
                  </Button>
                ) : computerUsePlugin.isInstalled ? (
                  <Switch
                    aria-label="Computer Use 应用可用状态"
                    isDisabled={updateAppMutation.isPending}
                    isSelected={computerUseApp?.server?.isEnabled ?? false}
                    size="sm"
                    onChange={(isEnabled) => updateAppMutation.mutate(isEnabled)}
                  >
                    <Switch.Content>
                      <Switch.Control>
                        <Switch.Thumb />
                      </Switch.Control>
                    </Switch.Content>
                  </Switch>
                ) : (
                  <PluginInstallButton plugin={computerUsePlugin} />
                )
              }
              icon={
                <SkillIcon
                  fillRaster
                  className="size-5 shrink-0 text-muted"
                  icon={computerUsePlugin.logo}
                />
              }
              name={computerUsePlugin.name}
              secondary={
                <span className="min-w-0 flex-1 truncate">{computerUsePlugin.description}</span>
              }
            />
          </ul>
        </div>
      )}

      <div className="mt-8">
        <div className="flex items-center justify-between gap-3">
          <h3 className="font-medium text-foreground">系统权限</h3>
          <Button
            isPending={isRefreshing}
            size="sm"
            variant="ghost"
            onPress={() => void refreshPermissions()}
          >
            刷新状态
          </Button>
        </div>

        {sharedPermissionStatus !== "loading" && permissionsError ? (
          <Alert className="mt-4" status="danger">
            <Alert.Indicator />
            <Alert.Content>
              <Alert.Title>无法读取系统权限</Alert.Title>
              <Alert.Description>{permissionsError.message}</Alert.Description>
            </Alert.Content>
          </Alert>
        ) : null}
        {sharedPermissionStatus !== "loading" && permissions?.supported === false ? (
          <Alert className="mt-4" status="warning">
            <Alert.Indicator />
            <Alert.Content>
              <Alert.Title>当前系统不支持电脑操控</Alert.Title>
              <Alert.Description>电脑操控目前仅支持 macOS。</Alert.Description>
            </Alert.Content>
          </Alert>
        ) : (
          <ul className="mt-4 flex flex-col gap-1 rounded-xl bg-default p-1">
            <SettingsCatalogItem
              action={
                <SystemPermissionAction
                  pendingPermissions={pendingPermissions}
                  permission={ComputerUsePermission.ACCESSIBILITY}
                  status={
                    sharedPermissionStatus ??
                    (verifyingPermissions.has(ComputerUsePermission.ACCESSIBILITY)
                      ? "verifying"
                      : permissions?.accessibility
                        ? "granted"
                        : "denied")
                  }
                  onAuthorize={authorize}
                  onOpenSettings={openSettings}
                />
              }
              icon={<UniversalAccess aria-hidden className="size-5 text-muted" />}
              name="辅助功能"
              secondary="读取界面结构并执行点击、输入和键盘操作"
            />
            <SettingsCatalogItem
              action={
                <SystemPermissionAction
                  pendingPermissions={pendingPermissions}
                  permission={ComputerUsePermission.SCREEN_RECORDING}
                  status={
                    sharedPermissionStatus ??
                    (verifyingPermissions.has(ComputerUsePermission.SCREEN_RECORDING)
                      ? "verifying"
                      : permissions?.screenRecording
                        ? "granted"
                        : "denied")
                  }
                  onAuthorize={authorize}
                  onOpenSettings={openSettings}
                />
              }
              icon={<Display aria-hidden className="size-5 text-muted" />}
              name="屏幕与系统录制"
              secondary="获取当前目标窗口的静态截图"
            />
          </ul>
        )}
      </div>

      <div className="mt-8">
        <h3 className="font-medium text-foreground">始终允许的应用</h3>

        {error ? (
          <Alert className="mt-4" status="danger">
            <Alert.Indicator />
            <Alert.Content>
              <Alert.Title>无法读取应用授权</Alert.Title>
              <Alert.Description>{error.message}</Alert.Description>
            </Alert.Content>
          </Alert>
        ) : isLoading ? (
          <div aria-busy="true" className="mt-4 space-y-2" role="status">
            <span className="sr-only">正在加载应用授权</span>
            <Skeleton className="h-16 w-full rounded-xl" />
            <Skeleton className="h-16 w-full rounded-xl" />
          </div>
        ) : allowedApps.length ? (
          <ul className="mt-4 flex flex-col gap-1">
            {allowedApps.map((app) => (
              <SettingsCatalogItem
                action={
                  <Tooltip delay={0}>
                    <Button
                      isIconOnly
                      aria-label={`撤销 ${app.name} 的电脑操控授权`}
                      isPending={revokingComputerUseApp === app.bundleId}
                      size="sm"
                      variant="ghost"
                      onPress={() => revoke(app.bundleId)}
                    >
                      <TrashBin aria-hidden className="size-4 text-danger" />
                    </Button>
                    <Tooltip.Content>撤销授权</Tooltip.Content>
                  </Tooltip>
                }
                hasIconBackground={false}
                icon={<AllowedApplicationIcon bundleId={app.bundleId} />}
                key={app.bundleId}
                name={app.name}
                secondary={<span className="truncate">{app.bundleId}</span>}
              />
            ))}
          </ul>
        ) : (
          <p className="mt-4 rounded-xl bg-default p-6 text-center text-sm text-muted">
            暂无始终允许的应用
          </p>
        )}
      </div>
    </section>
  );
}

function SystemPermissionAction({
  pendingPermissions,
  permission,
  status,
  onAuthorize,
  onOpenSettings,
}: {
  pendingPermissions: ReadonlySet<ComputerUsePermission>;
  permission: ComputerUsePermission;
  status: PermissionStatus;
  onAuthorize: (permission: ComputerUsePermission) => void;
  onOpenSettings: (permission: ComputerUsePermission) => void;
}) {
  if (status === "loading") {
    return (
      <Chip color="default" role="status" size="sm" variant="soft">
        <span className="inline-flex items-center gap-1">
          <Spinner aria-hidden color="current" size="sm" />
          {PERMISSION_STATUS_TEXT.loading}
        </span>
      </Chip>
    );
  }

  const chipColor = PERMISSION_STATUS_COLOR[status];

  return (
    <div className="flex flex-col items-end gap-1 sm:flex-row sm:items-center sm:gap-2">
      <Chip
        color={chipColor}
        size="sm"
        style={
          {
            "--chip-bg": `var(--${chipColor}-soft)`,
            "--chip-fg": `var(--${chipColor}-soft-foreground)`,
          } as CSSProperties
        }
        variant="soft"
      >
        {PERMISSION_STATUS_TEXT[status]}
      </Chip>
      <Button
        isDisabled={status === "error"}
        isPending={pendingPermissions.has(permission)}
        size="sm"
        variant="tertiary"
        onPress={() =>
          status === "granted" || status === "verifying"
            ? onOpenSettings(permission)
            : onAuthorize(permission)
        }
      >
        {status === "verifying" ? "打开设置…" : status === "granted" ? "取消授权…" : "去授权"}
      </Button>
    </div>
  );
}

function AllowedApplicationIcon({ bundleId }: { bundleId: string }) {
  const [hasError, setHasError] = useState(false);
  return hasError ? (
    <Display aria-hidden className="size-6 text-muted" />
  ) : (
    <img
      alt=""
      aria-hidden
      className="size-10 shrink-0 object-contain"
      src={getComputerUseAppIconUrl(bundleId)}
      onError={() => setHasError(true)}
    />
  );
}
