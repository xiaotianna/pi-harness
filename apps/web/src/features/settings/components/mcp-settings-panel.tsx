import { Alert, AlertDialog, Button, Chip, ScrollShadow, Skeleton } from "@heroui/react";
import { McpAuthMode, McpTransport } from "@pi-harness/agent-runtime/mcp-contract";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useState } from "react";
import type { McpServer } from "../api/mcp-api";
import { McpAction, useMcpServers } from "../hooks/use-mcp-servers";
import { McpCredentialEditor } from "./mcp-credential-editor";
import { McpServerEditor } from "./mcp-server-editor";
import { SettingsPanelHeader } from "./settings-panel-header";

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
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const shouldReduceMotion = useReducedMotion();
  const { servers, result, action, run, refresh, cancelTest } = useMcpServers(() =>
    setDialog(null),
  );
  return (
    <section className="w-full min-w-0 max-w-[720px]" aria-label="MCP 服务器">
      <SettingsPanelHeader
        title="MCP 服务器"
        description="全局管理外部工具，所有项目共用。连接后从下一轮对话生效，每次工具调用仍需批准。"
        action={
          <Button
            isDisabled={action.isPending}
            variant="secondary"
            onPress={() => setDialog({ kind: "create" })}
          >
            添加服务器
          </Button>
        }
      />
      {servers.error || action.error ? (
        <Alert className="mt-4" status="danger">
          <Alert.Content>
            <Alert.Title>
              {action.error?.name === "AbortError" ? "连接测试已取消" : "MCP 操作未完成"}
            </Alert.Title>
            <Alert.Description>{(action.error ?? servers.error)?.message}</Alert.Description>
            <Button
              size="sm"
              variant="tertiary"
              onPress={() => {
                action.reset();
                void refresh();
              }}
            >
              刷新状态
            </Button>
          </Alert.Content>
        </Alert>
      ) : null}
      {servers.isPending ? (
        <div className="mt-5 space-y-4">
          <Skeleton className="h-20 w-full rounded-lg" />
          <Skeleton className="h-20 w-full rounded-lg" />
        </div>
      ) : servers.data?.length === 0 ? (
        <p className="py-12 text-center text-sm text-muted">暂无 MCP 服务器，添加后即可连接</p>
      ) : (
        <div className="mt-4 space-y-5">
          {servers.data?.map((server) => {
            const canUse = server.enabled && server.isTrusted;
            const isBusy = action.isPending && action.variables.server.id === server.id;
            const test =
              result?.serverId === server.id && result.configRevision === server.revision
                ? result
                : null;
            const needsCredential =
              server.config.transport !== McpTransport.STDIO &&
              server.config.authMode !== McpAuthMode.NONE &&
              !server.hasCredential;
            return (
              <section key={server.id} aria-label={server.name} className="min-w-0">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="truncate text-sm font-medium">{server.name}</h3>
                    <p className="mt-1 break-all text-xs text-muted">
                      {server.config.transport === McpTransport.STDIO
                        ? server.config.command
                        : server.config.url}
                    </p>
                  </div>
                  <Chip size="sm" variant="soft" color={test ? "success" : "default"}>
                    {test ? "测试通过" : canUse ? "已启用" : !server.enabled ? "未启用" : "待信任"}
                  </Chip>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  {canUse ? (
                    <Button
                      size="sm"
                      variant="secondary"
                      isDisabled={action.isPending}
                      onPress={() => run(server, McpAction.TEST)}
                    >
                      {isBusy ? "正在测试…" : "测试连接"}
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      variant="secondary"
                      isDisabled={needsCredential || action.isPending}
                      onPress={() =>
                        setDialog({ kind: "confirm", action: McpAction.CONNECT, server })
                      }
                    >
                      连接服务器
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="tertiary"
                    isDisabled={action.isPending}
                    onPress={() => setDialog({ kind: "edit", server })}
                  >
                    编辑
                  </Button>
                  {server.config.transport === McpTransport.STDIO ||
                  server.config.authMode === McpAuthMode.STATIC ? (
                    <Button
                      size="sm"
                      variant="tertiary"
                      isDisabled={action.isPending}
                      onPress={() => setDialog({ kind: "credentials", server })}
                    >
                      {server.hasCredential ? "替换凭据" : "设置凭据"}
                    </Button>
                  ) : null}
                  {server.enabled ? (
                    <Button
                      size="sm"
                      variant="tertiary"
                      isDisabled={action.isPending}
                      onPress={() => run(server, McpAction.DISABLE)}
                    >
                      停用服务器
                    </Button>
                  ) : null}
                  {server.isTrusted ? (
                    <Button
                      size="sm"
                      variant="tertiary"
                      isDisabled={action.isPending}
                      onPress={() => run(server, McpAction.REVOKE)}
                    >
                      撤销信任
                    </Button>
                  ) : null}
                  <Button
                    size="sm"
                    variant="danger-soft"
                    isDisabled={action.isPending}
                    onPress={() => setDialog({ kind: "confirm", action: McpAction.DELETE, server })}
                  >
                    删除
                  </Button>
                  {isBusy &&
                  (action.variables.kind === McpAction.TEST ||
                    action.variables.kind === McpAction.CONNECT) ? (
                    <Button size="sm" variant="tertiary" onPress={() => cancelTest()}>
                      取消测试
                    </Button>
                  ) : null}
                </div>
                {needsCredential ? (
                  <p className="mt-2 text-xs text-muted">
                    {server.config.transport !== McpTransport.STDIO &&
                    server.config.authMode === McpAuthMode.OAUTH
                      ? "OAuth 授权流程尚未开放"
                      : "请先设置请求头凭据，再连接"}
                  </p>
                ) : null}
                {test ? (
                  <>
                    <Button
                      className="mt-2"
                      size="sm"
                      variant="ghost"
                      onPress={() => setExpandedId(expandedId === server.id ? null : server.id)}
                    >
                      {test.tools.length} 个工具 · {test.resourceCount} 个资源 ·{" "}
                      {test.prompts.length} 个提示模板 · {test.durationMs} ms
                    </Button>
                    <AnimatePresence initial={false}>
                      {expandedId === server.id ? (
                        <motion.div
                          key="catalog"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: shouldReduceMotion ? 0 : 0.15 }}
                        >
                          <ScrollShadow className="max-h-64" size={16}>
                            <div className="space-y-3 py-2">
                              {test.tools.length ? (
                                test.tools.map((tool) => (
                                  <div key={tool.name}>
                                    <p className="break-all text-sm">{tool.name}</p>
                                    <p className="mt-1 text-xs text-muted">{tool.description}</p>
                                  </div>
                                ))
                              ) : (
                                <p className="text-sm text-muted">此服务器没有提供工具</p>
                              )}
                            </div>
                          </ScrollShadow>
                          <p className="mt-2 text-xs text-muted">
                            资源和提示模板当前仅显示发现结果，使用界面仍在开发。
                          </p>
                        </motion.div>
                      ) : null}
                    </AnimatePresence>
                  </>
                ) : null}
              </section>
            );
          })}
        </div>
      )}
      {dialog?.kind === "create" || dialog?.kind === "edit" ? (
        <McpServerEditor
          {...(dialog.kind === "edit" ? { server: dialog.server } : {})}
          onClose={() => setDialog(null)}
          onSaved={refresh}
        />
      ) : null}
      {dialog?.kind === "credentials" ? (
        <McpCredentialEditor
          server={dialog.server}
          onClose={() => setDialog(null)}
          onSaved={refresh}
        />
      ) : null}
      <AlertDialog.Backdrop
        isOpen={dialog?.kind === "confirm"}
        isDismissable={!action.isPending}
        onOpenChange={(open) => !open && !action.isPending && setDialog(null)}
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
              {action.error ? (
                <p className="mt-3 text-sm text-danger">{action.error.message}</p>
              ) : null}
            </AlertDialog.Body>
            <AlertDialog.Footer>
              <Button
                variant="tertiary"
                isDisabled={action.isPending}
                onPress={() => {
                  action.reset();
                  setDialog(null);
                }}
              >
                取消
              </Button>
              <Button
                isPending={action.isPending}
                variant={
                  dialog?.kind === "confirm" && dialog.action === McpAction.DELETE
                    ? "danger"
                    : "primary"
                }
                onPress={() => {
                  if (dialog?.kind === "confirm") run(dialog.server, dialog.action);
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
    </section>
  );
}
