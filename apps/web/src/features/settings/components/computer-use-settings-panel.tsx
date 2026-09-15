import { Display, TrashBin, UniversalAccess } from "@gravity-ui/icons";
import { Alert, Button, Chip, Skeleton, Tooltip, toast } from "@heroui/react";
import { ComputerUsePermission } from "../api/app-settings-api";
import { useAppSettings } from "../hooks/use-app-settings";
import { useComputerUsePermissions } from "../hooks/use-computer-use-permissions";
import { SettingsCatalogItem } from "./settings-catalog-item";
import { SettingsPanelHeader } from "./settings-panel-header";

export function ComputerUseSettingsPanel() {
  const { error, isLoading, revokingComputerUseApp, revokeComputerUseApp, settings } =
    useAppSettings();
  const {
    error: permissionsError,
    isLoading: isLoadingPermissions,
    pendingPermission,
    permissions,
    requestPermission,
  } = useComputerUsePermissions();
  const allowedApps = settings?.computerUseAllowedApps ?? [];

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

  return (
    <section aria-label="电脑操控设置" className="w-full max-w-[720px]">
      <SettingsPanelHeader
        description="管理电脑操控所需的 macOS 系统权限和可观察的本机应用。具体点击、输入和拖拽仍会在执行前单独确认。"
        title="电脑操控"
      />

      <div className="mt-8">
        <h3 className="font-medium text-foreground">系统权限</h3>
        <p className="mt-1 text-sm text-muted">
          由本地 daemon 发起 macOS 授权；系统弹窗中的最终确认必须由你完成。
        </p>

        {permissionsError ? (
          <Alert className="mt-4" status="danger">
            <Alert.Indicator />
            <Alert.Content>
              <Alert.Title>无法读取系统权限</Alert.Title>
              <Alert.Description>{permissionsError.message}</Alert.Description>
            </Alert.Content>
          </Alert>
        ) : isLoadingPermissions ? (
          <div aria-busy="true" className="mt-4 space-y-2" role="status">
            <span className="sr-only">正在读取系统权限</span>
            <Skeleton className="h-16 w-full rounded-xl" />
            <Skeleton className="h-16 w-full rounded-xl" />
          </div>
        ) : permissions?.supported === false ? (
          <Alert className="mt-4" status="warning">
            <Alert.Indicator />
            <Alert.Content>
              <Alert.Title>当前系统不支持电脑操控</Alert.Title>
              <Alert.Description>电脑操控目前仅支持 macOS。</Alert.Description>
            </Alert.Content>
          </Alert>
        ) : permissions ? (
          <ul className="mt-4 flex flex-col gap-1 rounded-xl bg-default p-1">
            <SettingsCatalogItem
              action={
                permissions.accessibility ? (
                  <Chip
                    className="[--chip-bg:var(--success-soft)] [--chip-fg:var(--success-soft-foreground)]"
                    size="sm"
                    variant="soft"
                  >
                    已授权
                  </Chip>
                ) : (
                  <Button
                    isDisabled={pendingPermission !== null}
                    isPending={pendingPermission === ComputerUsePermission.ACCESSIBILITY}
                    size="sm"
                    variant="secondary"
                    onPress={() => authorize(ComputerUsePermission.ACCESSIBILITY)}
                  >
                    去授权
                  </Button>
                )
              }
              icon={<UniversalAccess aria-hidden className="size-5 text-muted" />}
              name="辅助功能"
              secondary="读取界面结构并执行点击、输入和键盘操作"
            />
            <SettingsCatalogItem
              action={
                permissions.screenRecording ? (
                  <Chip
                    className="[--chip-bg:var(--success-soft)] [--chip-fg:var(--success-soft-foreground)]"
                    size="sm"
                    variant="soft"
                  >
                    已授权
                  </Chip>
                ) : (
                  <Button
                    isDisabled={pendingPermission !== null}
                    isPending={pendingPermission === ComputerUsePermission.SCREEN_RECORDING}
                    size="sm"
                    variant="secondary"
                    onPress={() => authorize(ComputerUsePermission.SCREEN_RECORDING)}
                  >
                    去授权
                  </Button>
                )
              }
              icon={<Display aria-hidden className="size-5 text-muted" />}
              name="屏幕与系统录制"
              secondary="获取当前目标窗口的静态截图"
            />
          </ul>
        ) : null}
      </div>

      <div className="mt-8">
        <h3 className="font-medium text-foreground">始终允许的应用</h3>
        <p className="mt-1 text-sm text-muted">应用授权以 macOS bundle ID 保存，可随时撤销。</p>

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
          <ul className="mt-4 flex flex-col gap-1 rounded-xl bg-default p-1">
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
                icon={<Display aria-hidden className="size-5 text-muted" />}
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
