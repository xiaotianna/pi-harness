import { Flask, Key, LinkSlash, Plus, TrashBin, Xmark } from "@gravity-ui/icons";
import {
  Alert,
  AlertDialog,
  Button,
  Card,
  Dropdown,
  Pagination,
  Separator,
  Skeleton,
  Switch,
  toast,
} from "@heroui/react";
import {
  McpAuthMode,
  McpAuthRequirement,
  McpTransport,
} from "@pi-harness/agent-runtime/mcp-contract";
import { useEffect, useMemo, useRef, useState } from "react";
import { getMcpOAuthLaunchUrl, type McpServer } from "../api/mcp-api";
import { McpAction, useMcpServers } from "../hooks/use-mcp-servers";
import { mcpAuthLabel, needsMcpCredential } from "../utils/mcp-auth";
import { McpCredentialEditor } from "./mcp-credential-editor";
import { McpServerDetail } from "./mcp-server-detail";
import { McpServerEditor } from "./mcp-server-editor";
import { McpServerIcon } from "./mcp-server-icon";
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
  const detailDiscoveries = useRef(new Set<string>());
  const oauthPopups = useRef(new Map<string, Window>());
  const oauthPollers = useRef(new Map<string, number>());
  const { servers, results, pendingActions, run, refresh, cancelTest } = useMcpServers();
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
      : null
    : null;
  const refreshServers = async () => {
    detailDiscoveries.current.clear();
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
          detailDiscoveries.current.clear();
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
  useEffect(() => {
    if (
      !selectedServer ||
      selectedResult ||
      selectedPendingAction !== undefined ||
      !selectedServer.enabled ||
      !selectedServer.isTrusted
    )
      return;
    const discoveryKey = `${selectedServer.id}:${selectedServer.revision}`;
    if (detailDiscoveries.current.has(discoveryKey)) return;
    detailDiscoveries.current.add(discoveryKey);
    run(selectedServer, McpAction.DISCOVER);
  }, [run, selectedPendingAction, selectedResult, selectedServer]);
  const dialogPendingAction =
    dialog?.kind === "confirm" ? pendingActions.get(dialog.server.id) : undefined;
  const isDialogPending = dialog?.kind === "confirm" && dialogPendingAction === dialog.action;
  return (
    <>
      {selectedServer ? (
        <McpServerDetail
          isBusy={selectedPendingAction !== undefined}
          isLoading={
            selectedPendingAction === McpAction.DISCOVER ||
            selectedPendingAction === McpAction.TEST ||
            selectedPendingAction === McpAction.CONNECT
          }
          result={selectedResult}
          server={selectedServer}
          onBack={() => setSelectedServerId(null)}
          onAuthorize={() => authorize(selectedServer)}
          onCancelTest={() => {
            detailDiscoveries.current.add(`${selectedServer.id}:${selectedServer.revision}`);
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
        />
      ) : (
        <section className="w-full min-w-0 max-w-[720px]" aria-label="MCP 服务器">
          <SettingsPanelHeader
            title="MCP 服务器"
            description="全局管理外部工具，所有项目共用。连接后从下一轮对话生效，每次工具调用仍需批准。"
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
            <div aria-busy="true" className="mt-4 flex flex-col gap-3" role="status">
              <span className="sr-only">正在加载 MCP 服务器</span>
              {["first", "second"].map((item) => (
                <Card key={item} variant="secondary">
                  <Card.Header className="flex-row items-center gap-4">
                    <Skeleton aria-hidden className="size-10 shrink-0 rounded-xl" />
                    <div className="min-w-0 flex-1">
                      <Skeleton aria-hidden className="h-5 w-28 rounded-full" />
                      <Skeleton aria-hidden className="mt-2 h-4 w-48 rounded-full" />
                    </div>
                    <Skeleton aria-hidden className="h-6 w-14 rounded-full" />
                  </Card.Header>
                </Card>
              ))}
            </div>
          ) : servers.data?.length === 0 ? (
            <p className="py-12 text-center text-sm text-muted">暂无 MCP 服务器，添加后即可连接</p>
          ) : (
            <div className="mt-4 flex flex-col gap-3">
              {visibleServers.map((server) => {
                const result = results.get(server.id);
                const serverIcons =
                  result?.configRevision === server.revision ? result.serverInfo.icons : undefined;
                const pendingAction = pendingActions.get(server.id);
                const isBusy = pendingAction !== undefined;
                const isConnectionPending =
                  pendingAction === McpAction.DISCOVER ||
                  pendingAction === McpAction.TEST ||
                  pendingAction === McpAction.CONNECT;
                const pendingConnectionLabel =
                  pendingAction === McpAction.DISCOVER
                    ? "取消加载"
                    : pendingAction === McpAction.CONNECT
                      ? "取消连接"
                      : "取消测试";
                const endpoint =
                  server.config.transport === McpTransport.STDIO
                    ? server.config.command
                    : server.config.url;
                const needsCredential = needsMcpCredential(server);
                const needsOAuth =
                  !server.hasCredential && server.authRequirement === McpAuthRequirement.OAUTH;
                const canAuthorize = needsOAuth && server.enabled;
                const needsConnection = server.enabled && !server.isTrusted && !needsOAuth;
                const canEditCredential =
                  server.config.transport === McpTransport.STDIO ||
                  server.config.authMode !== McpAuthMode.OAUTH;
                const canManageOAuth =
                  server.enabled &&
                  server.config.transport !== McpTransport.STDIO &&
                  (server.config.authMode === McpAuthMode.OAUTH ||
                    server.authRequirement === McpAuthRequirement.OAUTH);
                const openDetails = () => {
                  setSelectedServerId(server.id);
                };
                const cancelConnection = () => {
                  cancelTest(server.id);
                };
                return (
                  <Card
                    key={server.id}
                    aria-label={server.name}
                    className="hover:bg-default"
                    variant="secondary"
                  >
                    <Card.Header className="flex-row items-center gap-4">
                      <Button
                        className="h-auto min-w-0 flex-1 justify-start gap-4 p-0 text-start hover:bg-transparent data-[hovered]:bg-transparent data-[pressed]:bg-transparent"
                        variant="ghost"
                        onPress={openDetails}
                      >
                        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-default">
                          <McpServerIcon endpoint={endpoint} icons={serverIcons} />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block break-all text-base font-medium text-foreground">
                            {server.name}
                          </span>
                          <span className="mt-1 block break-all text-sm text-muted">
                            {endpoint}
                          </span>
                        </span>
                      </Button>
                      <div className="flex shrink-0 items-center gap-2">
                        <span className="text-sm text-muted">
                          {!server.enabled
                            ? "未启用"
                            : needsCredential
                              ? "待鉴权"
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
                            setDialog({ kind: "confirm", action: McpAction.CONNECT, server });
                          }}
                        >
                          <Switch.Content>
                            <Switch.Control>
                              <Switch.Thumb />
                            </Switch.Control>
                          </Switch.Content>
                        </Switch>
                      </div>
                    </Card.Header>
                    <Card.Content className="mt-4 flex flex-col gap-4">
                      {needsCredential ? (
                        <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
                          <Key aria-hidden className="size-3.5 shrink-0" />
                          <span>{mcpAuthLabel(server)}</span>
                          {!needsOAuth ? (
                            <Button
                              size="sm"
                              variant="tertiary"
                              onPress={() => setDialog({ kind: "credentials", server })}
                            >
                              设置凭据
                            </Button>
                          ) : null}
                        </div>
                      ) : null}
                      <div className="flex items-center justify-between gap-4">
                        <Button
                          size="sm"
                          variant={
                            isConnectionPending
                              ? "tertiary"
                              : canAuthorize || needsConnection
                                ? "primary"
                                : "secondary"
                          }
                          isDisabled={!isConnectionPending && (isBusy || !server.enabled)}
                          onPress={() => {
                            if (isConnectionPending) {
                              cancelConnection();
                              return;
                            }
                            if (canAuthorize) {
                              authorize(server);
                              return;
                            }
                            if (needsConnection) {
                              setDialog({ kind: "confirm", action: McpAction.CONNECT, server });
                              return;
                            }
                            run(server, McpAction.TEST);
                          }}
                        >
                          {isConnectionPending ? (
                            <Xmark aria-hidden className="size-4" />
                          ) : canAuthorize ? (
                            <Key aria-hidden className="size-4" />
                          ) : needsConnection ? null : (
                            <Flask aria-hidden className="size-4" />
                          )}
                          {isConnectionPending
                            ? pendingConnectionLabel
                            : canAuthorize
                              ? "OAuth 授权"
                              : needsConnection
                                ? "连接服务器"
                                : "测试连接"}
                        </Button>
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="tertiary"
                            isDisabled={isBusy}
                            onPress={() => setDialog({ kind: "edit", server })}
                          >
                            编辑
                          </Button>
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
                                {canEditCredential || canManageOAuth || server.isTrusted ? (
                                  <Separator className="my-1" />
                                ) : null}
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
                      </div>
                    </Card.Content>
                  </Card>
                );
              })}
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
          onSaved={refreshServers}
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
