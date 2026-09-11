import {
  ArrowRotateRight,
  Flask,
  Key,
  LinkSlash,
  Pencil,
  Plus,
  TrashBin,
  Xmark,
} from "@gravity-ui/icons";
import {
  Alert,
  AlertDialog,
  Button,
  Dropdown,
  Pagination,
  Separator,
  Skeleton,
  Spinner,
  Switch,
  Tooltip,
  toast,
} from "@heroui/react";
import {
  McpAuthMode,
  McpAuthRequirement,
  McpCatalogStatus,
  McpTransport,
} from "@pi-harness/agent-runtime/mcp-contract";
import { useEffect, useMemo, useRef, useState } from "react";
import { getMcpOAuthLaunchUrl, type McpServer } from "../api/mcp-api";
import { McpAction, useMcpServers } from "../hooks/use-mcp-servers";
import { needsMcpCredential } from "../utils/mcp-auth";
import { McpCredentialEditor } from "./mcp-credential-editor";
import { McpServerDetail } from "./mcp-server-detail";
import { McpServerEditor } from "./mcp-server-editor";
import { McpServerIcon } from "./mcp-server-icon";
import { SettingsCatalogItem } from "./settings-catalog-item";
import { SettingsPanelHeader } from "./settings-panel-header";

const SERVERS_PER_PAGE = 25;

type Dialog =
  | { kind: "create" }
  | { kind: "edit" | "credentials"; server: McpServer }
  | {
      kind: "confirm";
      action: typeof McpAction.CONNECT | typeof McpAction.DELETE;
      server: McpServer;
    };

export function McpSettingsPanel() {
  const [dialog, setDialog] = useState<Dialog | null>(null);
  const [page, setPage] = useState(1);
  const [selectedServerId, setSelectedServerId] = useState<string | null>(null);
  const oauthPopups = useRef(new Map<string, Window>());
  const oauthPollers = useRef(new Map<string, number>());
  const {
    servers,
    catalog,
    results,
    pendingActions,
    run,
    refresh,
    cancelTest,
    isSavingTool,
    saveTool,
  } = useMcpServers(selectedServerId);
  const totalPages = Math.max(1, Math.ceil((servers.data?.length ?? 0) / SERVERS_PER_PAGE));
  const currentPage = Math.min(page, totalPages);
  const visibleServers = useMemo(
    () =>
      (servers.data ?? []).slice(
        (currentPage - 1) * SERVERS_PER_PAGE,
        currentPage * SERVERS_PER_PAGE,
      ),
    [currentPage, servers.data],
  );
  const selectedServer = servers.data?.find((server) => server.id === selectedServerId);
  const selectedPendingAction = selectedServer ? pendingActions.get(selectedServer.id) : undefined;
  const selectedResult = selectedServer
    ? results.get(selectedServer.id)?.configRevision === selectedServer.revision
      ? (results.get(selectedServer.id) ?? null)
      : catalog.data?.configRevision === selectedServer.revision
        ? catalog.data
        : null
    : null;
  const refreshServers = async () => {
    await refresh();
  };
  useEffect(
    () => () => {
      for (const poller of oauthPollers.current.values()) window.clearInterval(poller);
    },
    [],
  );
  const authorize = (server: McpServer) => {
    const currentPopup = oauthPopups.current.get(server.id);
    if (currentPopup && !currentPopup.closed) {
      currentPopup.focus();
      return;
    }
    oauthPopups.current.delete(server.id);
    const popup = window.open(
      getMcpOAuthLaunchUrl(server),
      `pi-harness-mcp-oauth-${server.id}`,
      "popup,width=720,height=760",
    );
    if (popup === null) {
      toast.danger("浏览器阻止了 OAuth 授权窗口，请允许弹窗后重试");
      return;
    }
    oauthPopups.current.set(server.id, popup);
    const currentPoller = oauthPollers.current.get(server.id);
    if (currentPoller !== undefined) window.clearInterval(currentPoller);
    let attempts = 0;
    const poller = window.setInterval(() => {
      attempts += 1;
      void servers.refetch().then(({ data }) => {
        const updated = data?.find((item) => item.id === server.id);
        const hasNewOAuthCredential =
          updated?.credentialMode === McpAuthMode.OAUTH &&
          updated.credentialRevision !== undefined &&
          (!server.hasCredential ||
            (server.credentialRevision !== undefined &&
              updated.credentialRevision !== server.credentialRevision));
        if (hasNewOAuthCredential) {
          window.clearInterval(poller);
          oauthPollers.current.delete(server.id);
          oauthPopups.current.delete(server.id);
          toast.success(`${server.name} OAuth 授权成功`);
        } else if (popup.closed || attempts >= 120) {
          window.clearInterval(poller);
          oauthPollers.current.delete(server.id);
          oauthPopups.current.delete(server.id);
        }
      });
    }, 1_000);
    oauthPollers.current.set(server.id, poller);
  };
  const dialogPendingAction =
    dialog?.kind === "confirm" ? pendingActions.get(dialog.server.id) : undefined;
  const isDialogPending = dialog?.kind === "confirm" && dialogPendingAction === dialog.action;
  return (
    <>
      {selectedServer ? (
        <McpServerDetail
          isBusy={selectedPendingAction !== undefined}
          isSavingTool={isSavingTool}
          isLoading={
            selectedPendingAction === McpAction.DISCOVER ||
            selectedPendingAction === McpAction.TEST ||
            selectedPendingAction === McpAction.CONNECT ||
            selectedServer.catalogStatus === McpCatalogStatus.LOADING ||
            catalog.isPending
          }
          isLoadingCancelable={selectedPendingAction !== undefined}
          result={selectedResult}
          server={selectedServer}
          onBack={() => setSelectedServerId(null)}
          onAuthorize={() => authorize(selectedServer)}
          onCancelTest={() => {
            cancelTest(selectedServer.id);
          }}
          onEdit={() => setDialog({ kind: "edit", server: selectedServer })}
          onCredentials={() => setDialog({ kind: "credentials", server: selectedServer })}
          onEnabledChange={(isEnabled) => {
            if (!isEnabled) {
              run(selectedServer, McpAction.DISABLE);
              return;
            }
            if (selectedServer.isTrusted) {
              run(selectedServer, McpAction.ENABLE);
              return;
            }
            setDialog({ kind: "confirm", action: McpAction.CONNECT, server: selectedServer });
          }}
          onRefresh={() => run(selectedServer, McpAction.DISCOVER)}
          onToolChange={(tool, enabled, trustedReadOnly) =>
            saveTool(selectedServer, tool, enabled, trustedReadOnly)
          }
        />
      ) : (
        <section className="w-full min-w-0 max-w-[720px]" aria-label="MCP 服务器">
          <SettingsPanelHeader
            title="MCP 服务器"
            description="全局管理外部工具，所有项目共用。能力目录保存在本地，连接按 Session 复用，工具可单独启用和授权。"
            action={
              <Button size="sm" variant="secondary" onPress={() => setDialog({ kind: "create" })}>
                <Plus aria-hidden className="size-4" />
                添加服务器
              </Button>
            }
          />
          {servers.error ? (
            <Alert className="mt-4" status="danger">
              <Alert.Indicator />
              <Alert.Content>
                <Alert.Title>MCP 服务器加载失败</Alert.Title>
                <Alert.Description>{servers.error.message}</Alert.Description>
                <Button size="sm" variant="tertiary" onPress={() => void refresh()}>
                  刷新状态
                </Button>
              </Alert.Content>
            </Alert>
          ) : null}
          {servers.isPending ? (
            <div aria-busy="true" className="mt-4 flex flex-col gap-1" role="status">
              <span className="sr-only">正在加载 MCP 服务器</span>
              {["first", "second", "third"].map((item) => (
                <div className="flex min-h-16 items-center gap-3 px-3 py-2" key={item}>
                  <Skeleton aria-hidden className="size-10 shrink-0 rounded-xl" />
                  <div className="min-w-0 flex-1 space-y-2">
                    <Skeleton aria-hidden className="h-5 w-32 rounded-lg" />
                    <Skeleton aria-hidden className="h-4 w-full rounded-lg" />
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <Skeleton aria-hidden className="h-6 w-10 rounded-full" />
                    <Skeleton aria-hidden className="size-8 rounded-xl" />
                    <Skeleton aria-hidden className="h-8 w-14 rounded-xl" />
                  </div>
                </div>
              ))}
            </div>
          ) : servers.data?.length === 0 ? (
            <p className="py-12 text-center text-sm text-muted">暂无 MCP 服务器，添加后即可连接</p>
          ) : (
            <div className="mt-4">
              <ul aria-label="MCP 服务器列表" className="flex flex-col gap-1">
                {visibleServers.map((server) => {
                  const result = results.get(server.id);
                  const serverIcons =
                    result?.configRevision === server.revision
                      ? result.serverInfo.icons
                      : undefined;
                  const pendingAction = pendingActions.get(server.id);
                  const isCatalogLoading = server.catalogStatus === McpCatalogStatus.LOADING;
                  const isBusy = pendingAction !== undefined || isCatalogLoading;
                  const isConnectionPending =
                    pendingAction === McpAction.DISCOVER ||
                    pendingAction === McpAction.TEST ||
                    pendingAction === McpAction.CONNECT;
                  const endpoint =
                    server.config.transport === McpTransport.STDIO
                      ? server.config.command
                      : server.config.url;
                  const needsCredential = needsMcpCredential(server);
                  const needsOAuth =
                    !server.hasCredential && server.authRequirement === McpAuthRequirement.OAUTH;
                  const needsConnection = server.enabled && !server.isTrusted && !needsOAuth;
                  const canEditCredential =
                    server.config.transport === McpTransport.STDIO ||
                    server.config.authMode !== McpAuthMode.OAUTH;
                  const canManageOAuth =
                    server.enabled &&
                    server.config.transport !== McpTransport.STDIO &&
                    (server.config.authMode === McpAuthMode.OAUTH ||
                      server.authRequirement === McpAuthRequirement.OAUTH);
                  const mainAction =
                    isCatalogLoading && !isConnectionPending
                      ? "loading"
                      : isConnectionPending
                        ? "cancel"
                        : needsOAuth
                          ? "oauth"
                          : needsCredential
                            ? "credentials"
                            : needsConnection
                              ? "connect"
                              : "test";
                  const mainActionLabel =
                    mainAction === "loading"
                      ? "连接中"
                      : mainAction === "cancel"
                        ? "取消连接"
                        : mainAction === "oauth"
                          ? "OAuth 授权"
                          : mainAction === "credentials"
                            ? "设置凭据"
                            : mainAction === "connect"
                              ? "连接服务器"
                              : "测试连接";
                  return (
                    <SettingsCatalogItem
                      action={
                        <div className="flex shrink-0 items-center gap-2">
                          <Tooltip
                            delay={0}
                            isDisabled={mainAction !== "test" && mainAction !== "cancel"}
                          >
                            <Button
                              aria-label={mainActionLabel}
                              {...(mainAction === "cancel" ? { className: "group" } : {})}
                              isIconOnly={mainAction === "test" || mainAction === "cancel"}
                              isPending={mainAction === "loading"}
                              size="sm"
                              variant={
                                mainAction === "cancel"
                                  ? "tertiary"
                                  : mainAction === "oauth" || mainAction === "connect"
                                    ? "primary"
                                    : "secondary"
                              }
                              isDisabled={
                                mainAction === "loading" ||
                                (mainAction !== "cancel" &&
                                  (isBusy || (mainAction !== "credentials" && !server.enabled)))
                              }
                              onPress={() => {
                                if (mainAction === "loading") return;
                                if (mainAction === "cancel") {
                                  cancelTest(server.id);
                                  return;
                                }
                                if (mainAction === "oauth") {
                                  authorize(server);
                                  return;
                                }
                                if (mainAction === "credentials") {
                                  setDialog({ kind: "credentials", server });
                                  return;
                                }
                                if (mainAction === "connect") {
                                  setDialog({
                                    kind: "confirm",
                                    action: McpAction.CONNECT,
                                    server,
                                  });
                                  return;
                                }
                                run(server, McpAction.TEST);
                              }}
                            >
                              {mainAction === "cancel" ? (
                                <>
                                  <Spinner
                                    aria-hidden
                                    className="text-muted group-hover:hidden group-focus-visible:hidden group-data-[focus-visible]:hidden group-data-[hovered]:hidden"
                                    color="current"
                                    size="sm"
                                  />
                                  <Xmark
                                    aria-hidden
                                    className="hidden size-4 group-hover:block group-focus-visible:block group-data-[focus-visible]:block group-data-[hovered]:block"
                                  />
                                </>
                              ) : mainAction === "oauth" || mainAction === "credentials" ? (
                                <Key aria-hidden className="size-4" />
                              ) : mainAction === "test" ? (
                                <Flask aria-hidden className="size-4" />
                              ) : null}
                              {mainAction === "test" || mainAction === "cancel"
                                ? null
                                : mainActionLabel}
                            </Button>
                            <Tooltip.Content>
                              {mainAction === "cancel" ? mainActionLabel : "测试连接"}
                            </Tooltip.Content>
                          </Tooltip>
                          <span className="hidden text-sm text-muted @xl/settings:inline">
                            {!server.enabled
                              ? "未启用"
                              : needsCredential
                                ? "待鉴权"
                                : isCatalogLoading
                                  ? "连接中"
                                  : server.catalogStatus === McpCatalogStatus.ERROR
                                    ? "加载失败"
                                    : server.isTrusted
                                      ? "已启用"
                                      : "待连接"}
                          </span>
                          <Switch
                            aria-label={`${server.name} 启用状态`}
                            isDisabled={isBusy}
                            isSelected={server.enabled}
                            size="sm"
                            onChange={(isEnabled) => {
                              if (!isEnabled) {
                                run(server, McpAction.DISABLE);
                                return;
                              }
                              if (server.isTrusted) {
                                run(server, McpAction.ENABLE);
                                return;
                              }
                              setDialog({
                                kind: "confirm",
                                action: McpAction.CONNECT,
                                server,
                              });
                            }}
                          >
                            <Switch.Content>
                              <Switch.Control>
                                <Switch.Thumb />
                              </Switch.Control>
                            </Switch.Content>
                          </Switch>
                          <Dropdown>
                            <Button isDisabled={isBusy} size="sm" variant="tertiary">
                              更多
                            </Button>
                            <Dropdown.Popover
                              className="max-w-[calc(100vw-2rem)]"
                              placement="bottom end"
                            >
                              <Dropdown.Menu
                                aria-label={`${server.name}操作`}
                                onAction={(key) => {
                                  if (key === "edit") setDialog({ kind: "edit", server });
                                  if (key === McpAction.DISCOVER) run(server, McpAction.DISCOVER);
                                  if (key === "test") run(server, McpAction.TEST);
                                  if (key === "credentials")
                                    setDialog({ kind: "credentials", server });
                                  if (key === "oauth") authorize(server);
                                  if (key === McpAction.REVOKE) run(server, McpAction.REVOKE);
                                  if (key === McpAction.DELETE)
                                    setDialog({
                                      kind: "confirm",
                                      action: McpAction.DELETE,
                                      server,
                                    });
                                }}
                              >
                                <Dropdown.Item id="edit" textValue="编辑服务器">
                                  <Pencil aria-hidden className="size-4 text-muted" />
                                  编辑服务器
                                </Dropdown.Item>
                                <Dropdown.Item
                                  id={McpAction.DISCOVER}
                                  isDisabled={
                                    !server.enabled || !server.isTrusted || needsCredential
                                  }
                                  textValue="刷新状态"
                                >
                                  <ArrowRotateRight aria-hidden className="size-4 text-muted" />
                                  刷新状态
                                </Dropdown.Item>
                                {mainAction !== "test" && server.enabled ? (
                                  <Dropdown.Item id="test" textValue="测试连接">
                                    <Flask aria-hidden className="size-4 text-muted" />
                                    测试连接
                                  </Dropdown.Item>
                                ) : null}
                                {canEditCredential ? (
                                  <Dropdown.Item id="credentials" textValue="设置凭据">
                                    <Key aria-hidden className="size-4 text-muted" />
                                    {server.hasCredential ? "替换凭据" : "设置凭据"}
                                  </Dropdown.Item>
                                ) : null}
                                {canManageOAuth ? (
                                  <Dropdown.Item id="oauth" textValue="OAuth 授权">
                                    <Key aria-hidden className="size-4 text-muted" />
                                    {server.credentialMode === McpAuthMode.OAUTH
                                      ? "重新 OAuth 授权"
                                      : "OAuth 授权"}
                                  </Dropdown.Item>
                                ) : null}
                                {server.isTrusted ? (
                                  <Dropdown.Item id={McpAction.REVOKE} textValue="撤销信任">
                                    <LinkSlash aria-hidden className="size-4 text-muted" />
                                    撤销信任
                                  </Dropdown.Item>
                                ) : null}
                                <Separator className="my-1" />
                                <Dropdown.Item
                                  className="text-danger"
                                  id={McpAction.DELETE}
                                  textValue="删除服务器"
                                >
                                  <TrashBin aria-hidden className="size-4 text-danger" />
                                  删除服务器
                                </Dropdown.Item>
                              </Dropdown.Menu>
                            </Dropdown.Popover>
                          </Dropdown>
                        </div>
                      }
                      ariaLabel={`查看 ${server.name} 详情`}
                      icon={<McpServerIcon endpoint={endpoint} icons={serverIcons} />}
                      key={server.id}
                      name={server.name}
                      secondary={
                        <span className="min-w-0 flex-1 truncate" title={endpoint}>
                          {endpoint}
                        </span>
                      }
                      onPress={() => setSelectedServerId(server.id)}
                    />
                  );
                })}
              </ul>
              {(servers.data?.length ?? 0) > SERVERS_PER_PAGE ? (
                <Pagination aria-label="MCP 服务器分页" className="mt-1" size="sm">
                  <Pagination.Summary>
                    第 {currentPage} / {totalPages} 页 · 共 {servers.data?.length ?? 0} 台
                  </Pagination.Summary>
                  <Pagination.Content>
                    <Pagination.Item>
                      <Pagination.Previous
                        aria-label="上一页"
                        isDisabled={currentPage === 1}
                        onPress={() => setPage(Math.max(1, currentPage - 1))}
                      >
                        <Pagination.PreviousIcon />
                      </Pagination.Previous>
                    </Pagination.Item>
                    <Pagination.Item>
                      <Pagination.Next
                        aria-label="下一页"
                        isDisabled={currentPage === totalPages}
                        onPress={() => setPage(Math.min(totalPages, currentPage + 1))}
                      >
                        <Pagination.NextIcon />
                      </Pagination.Next>
                    </Pagination.Item>
                  </Pagination.Content>
                </Pagination>
              ) : null}
            </div>
          )}
        </section>
      )}
      {dialog?.kind === "create" || dialog?.kind === "edit" ? (
        <McpServerEditor
          {...(dialog.kind === "edit" ? { server: dialog.server } : {})}
          onClose={() => setDialog(null)}
          onSaved={async (savedServers) => {
            await refreshServers();
            const [savedServer] = savedServers;
            if (dialog.kind === "create" && savedServers.length === 1 && savedServer) {
              setSelectedServerId(savedServer.id);
              setDialog({
                kind: "confirm",
                action: McpAction.CONNECT,
                server: savedServer,
              });
              return;
            }
            setDialog(null);
          }}
        />
      ) : null}
      {dialog?.kind === "credentials" ? (
        <McpCredentialEditor
          server={dialog.server}
          onClose={() => setDialog(null)}
          onSaved={refreshServers}
        />
      ) : null}
      <AlertDialog.Backdrop
        isOpen={dialog?.kind === "confirm"}
        isDismissable={!isDialogPending}
        onOpenChange={(open) => !open && !isDialogPending && setDialog(null)}
      >
        <AlertDialog.Container>
          <AlertDialog.Dialog className="sm:max-w-lg">
            <AlertDialog.Header>
              <AlertDialog.Heading>
                {dialog?.kind === "confirm" && dialog.action === McpAction.DELETE
                  ? `删除 ${dialog.server.name}？`
                  : "信任并连接服务器"}
              </AlertDialog.Heading>
            </AlertDialog.Header>
            <AlertDialog.Body>
              {dialog?.kind === "confirm" ? (
                dialog.action === McpAction.DELETE ? (
                  <p>
                    删除全局服务器配置和凭据，并关闭所有会话中的连接。外部服务中的数据不会被删除。
                  </p>
                ) : (
                  <div className="space-y-3">
                    <p>
                      信任并启用 {dialog.server.name}
                      ，允许所有项目的会话使用该服务器。每次工具调用仍需批准。
                    </p>
                    <p className="break-all text-sm">
                      {dialog.server.config.transport === McpTransport.STDIO
                        ? JSON.stringify([
                            dialog.server.config.command,
                            ...dialog.server.config.args,
                          ])
                        : dialog.server.config.url}
                    </p>
                    <p>
                      {dialog.server.config.transport === McpTransport.STDIO
                        ? "该命令将以你的系统账户权限运行，无操作系统沙箱；即使尚未调用工具，进程也可能访问本机文件或网络。"
                        : "连接会发送已保存的请求头凭据；工具参数仅在你批准调用后发送。"}
                    </p>
                  </div>
                )
              ) : null}
            </AlertDialog.Body>
            <AlertDialog.Footer>
              <Button
                variant="tertiary"
                isDisabled={isDialogPending}
                onPress={() => setDialog(null)}
              >
                取消
              </Button>
              <Button
                isPending={isDialogPending}
                variant={
                  dialog?.kind === "confirm" && dialog.action === McpAction.DELETE
                    ? "danger"
                    : "primary"
                }
                onPress={() => {
                  if (dialog?.kind !== "confirm") return;
                  const currentDialog = dialog;
                  if (dialog.action === McpAction.CONNECT) setDialog(null);
                  run(dialog.server, dialog.action, () => {
                    setDialog((activeDialog) =>
                      activeDialog?.kind === "confirm" &&
                      activeDialog.action === currentDialog.action &&
                      activeDialog.server.id === currentDialog.server.id
                        ? null
                        : activeDialog,
                    );
                  });
                }}
              >
                {dialog?.kind === "confirm" && dialog.action === McpAction.DELETE
                  ? "删除服务器"
                  : "信任并测试连接"}
              </Button>
            </AlertDialog.Footer>
          </AlertDialog.Dialog>
        </AlertDialog.Container>
      </AlertDialog.Backdrop>
    </>
  );
}
