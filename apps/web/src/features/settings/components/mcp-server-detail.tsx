import { ArrowRotateRight, Pencil, Xmark } from "@gravity-ui/icons";
import { Alert, Button, Card, Disclosure, Label, Skeleton, Switch, Tabs } from "@heroui/react";
import {
  McpAuthRequirement,
  McpCatalogStatus,
  McpTransport,
} from "@pi-harness/agent-runtime/mcp-contract";
import type { ReactNode } from "react";
import { AssistantCodeBlock } from "../../../components/ai/assistant-code-block";
import { AssistantMarkdown } from "../../../components/ai/assistant-markdown";
import type { McpServer, McpTestResult } from "../api/mcp-api";
import { mcpAuthLabel, needsMcpCredential } from "../utils/mcp-auth";
import { McpServerIcon } from "./mcp-server-icon";
import { SettingsCatalogDetail } from "./settings-catalog-detail";

function stringify(value: unknown): string {
  try {
    return JSON.stringify(value, null, 2) ?? "null";
  } catch {
    return "无法展示该定义";
  }
}

function JsonDefinition({ label, value }: { label: string; value: unknown }) {
  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-muted">{label}</p>
      <AssistantCodeBlock code={stringify(value)} language="json" />
    </div>
  );
}

function CatalogItem({
  children,
  controls,
  description,
  name,
}: {
  children: ReactNode;
  controls?: ReactNode;
  description: string;
  name: string;
}) {
  return (
    <li>
      <Disclosure>
        <Disclosure.Heading {...(controls ? { className: "relative" } : {})}>
          <Disclosure.Trigger
            className={`relative flex min-h-16 w-full items-center gap-3 px-3 py-2 pr-10 text-start ${controls ? "sm:pr-60" : ""}`}
          >
            <div className="min-w-0 flex-1">
              <p className="break-all text-sm font-medium text-foreground">{name}</p>
              <p className="mt-1 line-clamp-2 text-xs leading-5 text-muted">
                {description || "未提供描述"}
              </p>
            </div>
            <Disclosure.Indicator className="absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
          </Disclosure.Trigger>
          {controls ? (
            <div className="flex flex-wrap items-center gap-4 px-3 pb-3 sm:absolute sm:right-10 sm:top-1/2 sm:-translate-y-1/2 sm:p-0">
              {controls}
            </div>
          ) : null}
        </Disclosure.Heading>
        <Disclosure.Content>
          <Disclosure.Body className="space-y-4 px-3 pb-4 pt-1">{children}</Disclosure.Body>
        </Disclosure.Content>
      </Disclosure>
    </li>
  );
}

function EmptyCatalog({ children }: { children: ReactNode }) {
  return <p className="py-8 text-center text-sm text-muted">{children}</p>;
}

function CatalogSkeleton() {
  return (
    <div aria-busy="true" className="flex flex-col gap-1" role="status">
      <span className="sr-only">正在加载能力目录</span>
      {["first", "second", "third"].map((item, index) => (
        <div className="flex min-h-16 items-center px-3 py-2" key={item}>
          <div className="min-w-0 flex-1">
            <Skeleton
              aria-hidden
              className={index === 1 ? "h-5 w-2/5 rounded-lg" : "h-5 w-1/3 rounded-lg"}
            />
            <Skeleton
              aria-hidden
              className={index === 2 ? "mt-2 h-4 w-3/5 rounded-lg" : "mt-2 h-4 w-4/5 rounded-lg"}
            />
          </div>
          <Skeleton aria-hidden className="ml-3 size-4 shrink-0 rounded-md" />
        </div>
      ))}
    </div>
  );
}

function ServerOverview({ result, server }: { result: McpTestResult | null; server: McpServer }) {
  const endpoint =
    server.config.transport === McpTransport.STDIO ? server.config.command : server.config.url;
  const transport =
    server.config.transport === McpTransport.STREAMABLE_HTTP
      ? "Streamable HTTP"
      : server.config.transport;
  return (
    <Card className="mt-6" variant="secondary">
      <Card.Content>
        <dl className="grid gap-4 text-sm sm:grid-cols-2">
          <div className="min-w-0">
            <dt className="text-xs text-muted">服务器 ID</dt>
            <dd className="mt-1 break-all text-foreground">{server.name}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted">连接方式</dt>
            <dd className="mt-1 text-foreground">{transport}</dd>
          </div>
          <div className="min-w-0">
            <dt className="text-xs text-muted">地址或命令</dt>
            <dd className="mt-1 break-all text-foreground">{endpoint}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted">鉴权</dt>
            <dd className="mt-1 text-foreground">{mcpAuthLabel(server)}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted">信任状态</dt>
            <dd className="mt-1 text-foreground">{server.isTrusted ? "已信任" : "未信任"}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted">协议</dt>
            <dd className="mt-1 text-foreground">
              {result ? `${result.protocolEra === "modern" ? "现代" : "旧版"}协议` : "尚未发现"}
            </dd>
          </div>
        </dl>
      </Card.Content>
    </Card>
  );
}

export function McpServerDetail({
  isBusy,
  isLoading,
  isLoadingCancelable,
  isSavingTool,
  result,
  server,
  onBack,
  onAuthorize,
  onCancelTest,
  onCredentials,
  onEdit,
  onEnabledChange,
  onRefresh,
  onToolChange,
}: {
  isBusy: boolean;
  isLoading: boolean;
  isLoadingCancelable: boolean;
  isSavingTool: boolean;
  result: McpTestResult | null;
  server: McpServer;
  onBack: () => void;
  onAuthorize: () => void;
  onCancelTest: () => void;
  onCredentials: () => void;
  onEdit: () => void;
  onEnabledChange: (isEnabled: boolean) => void;
  onRefresh: () => void;
  onToolChange: (
    tool: McpTestResult["tools"][number],
    enabled: boolean,
    trustedReadOnly: boolean,
  ) => void;
}) {
  const endpoint =
    server.config.transport === McpTransport.STDIO ? server.config.command : server.config.url;
  const needsCredential = needsMcpCredential(server);
  const needsOAuth = !server.hasCredential && server.authRequirement === McpAuthRequirement.OAUTH;
  const canUse = server.enabled && server.isTrusted;
  const resourceCount = (result?.resources.length ?? 0) + (result?.resourceTemplates.length ?? 0);
  const statusLabel = !server.enabled
    ? "未启用"
    : needsCredential
      ? "待鉴权"
      : isLoading
        ? "连接中"
        : server.catalogStatus === McpCatalogStatus.ERROR
          ? "加载失败"
          : server.isTrusted
            ? "已启用"
            : "待连接";
  const emptyCatalogMessage = !server.enabled
    ? "服务器尚未启用"
    : !server.isTrusted
      ? "服务器尚未完成连接"
      : needsCredential
        ? "服务器尚未配置凭据"
        : "能力目录加载失败";
  return (
    <SettingsCatalogDetail
      action={
        <div className="flex shrink-0 items-center gap-2">
          <span className="text-sm text-muted">{statusLabel}</span>
          <Switch
            aria-label={`${server.name} 启用状态`}
            isDisabled={isBusy}
            isSelected={server.enabled}
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
      }
      ariaLabel={`${server.name} MCP 服务器详情`}
      backLabel="返回 MCP 服务器"
      description={endpoint}
      icon={<McpServerIcon endpoint={endpoint} icons={result?.serverInfo.icons} />}
      name={server.name}
      toolbarAction={
        <Button isDisabled={isBusy} size="sm" variant="secondary" onPress={onEdit}>
          <Pencil aria-hidden className="size-4" />
          编辑
        </Button>
      }
      onBack={onBack}
    >
      <ServerOverview result={result} server={server} />

      {needsCredential ? (
        <Alert className="mt-4" status="warning">
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Title>{mcpAuthLabel(server)}</Alert.Title>
            <Alert.Description>
              {needsOAuth
                ? "服务器声明了 OAuth，授权完成后会自动保存并刷新令牌。"
                : "服务器未声明 OAuth，请填写它文档提供的请求头名称和值。"}
            </Alert.Description>
            <Button
              size="sm"
              variant="tertiary"
              isDisabled={isBusy || (needsOAuth && !server.enabled)}
              onPress={needsOAuth ? onAuthorize : onCredentials}
            >
              {needsOAuth && !server.enabled
                ? "先启用服务器"
                : needsOAuth
                  ? "OAuth 授权"
                  : "设置凭据"}
            </Button>
          </Alert.Content>
        </Alert>
      ) : null}

      {server.enabled && !server.isTrusted && !needsCredential ? (
        <Alert className="mt-4" status="warning">
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Title>需要确认连接</Alert.Title>
            <Alert.Description>确认后，该服务器才会向会话提供工具。</Alert.Description>
            <Button
              size="sm"
              variant="tertiary"
              isDisabled={isBusy}
              onPress={() => onEnabledChange(true)}
            >
              连接服务器
            </Button>
          </Alert.Content>
        </Alert>
      ) : null}

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-medium text-foreground">服务器能力</h3>
          <p className="mt-1 text-sm text-muted">
            {isLoading
              ? "正在读取服务器声明的能力目录"
              : server.catalogError
                ? `${server.catalogError}${result ? "；当前显示上次缓存" : ""}`
                : result
                  ? `${result.tools.length} 个工具 · ${resourceCount} 个资源 · ${result.prompts.length} 个提示词 · ${result.durationMs} ms`
                  : !server.enabled
                    ? "启用服务器后会自动刷新能力目录"
                    : !server.isTrusted
                      ? "连接服务器后会自动刷新能力目录"
                      : needsCredential
                        ? "配置凭据后会自动刷新能力目录"
                        : "能力目录会在启动、重新启用和手动刷新时保存到本地"}
          </p>
        </div>
        <Button
          isDisabled={(isLoading && !isLoadingCancelable) || (!isLoading && (!canUse || isBusy))}
          isPending={isLoading && !isLoadingCancelable}
          size="sm"
          variant={isLoading ? "tertiary" : "secondary"}
          onPress={isLoading && isLoadingCancelable ? onCancelTest : onRefresh}
        >
          {isLoading ? (
            <Xmark aria-hidden className="size-4" />
          ) : (
            <ArrowRotateRight aria-hidden className="size-4" />
          )}
          {isLoading ? (isLoadingCancelable ? "取消刷新" : "连接中") : "刷新状态"}
        </Button>
      </div>

      {result || isLoading ? (
        <Tabs className="mt-5" variant="primary">
          <Tabs.ListContainer>
            <Tabs.List aria-label={`${server.name} MCP 能力`}>
              <Tabs.Tab id="tools">
                工具{result && !isLoading ? ` ${result.tools.length}` : ""}
                <Tabs.Indicator />
              </Tabs.Tab>
              <Tabs.Tab id="resources">
                资源{result && !isLoading ? ` ${resourceCount}` : ""}
                <Tabs.Indicator />
              </Tabs.Tab>
              <Tabs.Tab id="prompts">
                提示词{result && !isLoading ? ` ${result.prompts.length}` : ""}
                <Tabs.Indicator />
              </Tabs.Tab>
              <Tabs.Tab id="server">
                服务信息
                <Tabs.Indicator />
              </Tabs.Tab>
            </Tabs.List>
          </Tabs.ListContainer>

          <Tabs.Panel className="px-0 pb-0" id="tools">
            {isLoading ? (
              <CatalogSkeleton />
            ) : result?.tools.length ? (
              <ul className="flex flex-col gap-1">
                {result.tools.map((tool) => (
                  <CatalogItem
                    controls={
                      <>
                        <Switch
                          aria-label={`${tool.name} 启用状态`}
                          isDisabled={isSavingTool}
                          isSelected={tool.enabled}
                          size="sm"
                          onChange={(enabled) => onToolChange(tool, enabled, tool.trustedReadOnly)}
                        >
                          <Switch.Content className="gap-2">
                            <Label className="text-xs font-normal text-muted">启用</Label>
                            <Switch.Control>
                              <Switch.Thumb />
                            </Switch.Control>
                          </Switch.Content>
                        </Switch>
                        <Switch
                          aria-label={`${tool.name} 可信只读状态`}
                          isDisabled={isSavingTool || !tool.enabled}
                          isSelected={tool.trustedReadOnly}
                          size="sm"
                          onChange={(trustedReadOnly) =>
                            onToolChange(tool, tool.enabled, trustedReadOnly)
                          }
                        >
                          <Switch.Content className="gap-2">
                            <Label className="text-xs font-normal text-muted">只读免审批</Label>
                            <Switch.Control>
                              <Switch.Thumb />
                            </Switch.Control>
                          </Switch.Content>
                        </Switch>
                      </>
                    }
                    description={tool.description}
                    key={tool.name}
                    name={tool.title ? `${tool.title} · ${tool.name}` : tool.name}
                  >
                    <JsonDefinition label="入参 Schema" value={tool.inputSchema} />
                    <JsonDefinition label="出参 Schema" value={tool.outputSchema ?? null} />
                    <JsonDefinition label="完整定义" value={tool.raw} />
                  </CatalogItem>
                ))}
              </ul>
            ) : (
              <EmptyCatalog>此服务器没有提供工具</EmptyCatalog>
            )}
          </Tabs.Panel>

          <Tabs.Panel className="px-0 pb-0" id="resources">
            {isLoading ? (
              <CatalogSkeleton />
            ) : resourceCount && result ? (
              <div className="space-y-6">
                {result.resources.length ? (
                  <section aria-label="资源">
                    <h4 className="px-3 text-sm font-medium text-foreground">资源</h4>
                    <ul className="mt-2 flex flex-col gap-1">
                      {result.resources.map((resource) => (
                        <CatalogItem
                          description={resource.description || resource.uri}
                          key={resource.uri}
                          name={
                            resource.title ? `${resource.title} · ${resource.name}` : resource.name
                          }
                        >
                          <dl className="grid gap-3 text-sm sm:grid-cols-2">
                            <div>
                              <dt className="text-xs text-muted">URI</dt>
                              <dd className="mt-1 break-all">{resource.uri}</dd>
                            </div>
                            <div>
                              <dt className="text-xs text-muted">MIME / 大小</dt>
                              <dd className="mt-1">
                                {resource.mimeType ?? "未提供"}
                                {resource.size === undefined
                                  ? ""
                                  : ` · ${resource.size.toLocaleString()} B`}
                              </dd>
                            </div>
                          </dl>
                          <JsonDefinition label="完整定义" value={resource.raw} />
                        </CatalogItem>
                      ))}
                    </ul>
                  </section>
                ) : null}
                {result.resourceTemplates.length ? (
                  <section aria-label="资源模板">
                    <h4 className="px-3 text-sm font-medium text-foreground">资源模板</h4>
                    <ul className="mt-2 flex flex-col gap-1">
                      {result.resourceTemplates.map((template) => (
                        <CatalogItem
                          description={template.description || template.uriTemplate}
                          key={template.uriTemplate}
                          name={
                            template.title ? `${template.title} · ${template.name}` : template.name
                          }
                        >
                          <p className="break-all text-sm text-foreground">
                            {template.uriTemplate}
                          </p>
                          <JsonDefinition label="完整定义" value={template.raw} />
                        </CatalogItem>
                      ))}
                    </ul>
                  </section>
                ) : null}
              </div>
            ) : (
              <EmptyCatalog>此服务器没有提供资源或资源模板</EmptyCatalog>
            )}
          </Tabs.Panel>

          <Tabs.Panel className="px-0 pb-0" id="prompts">
            {isLoading ? (
              <CatalogSkeleton />
            ) : result?.prompts.length ? (
              <ul className="flex flex-col gap-1">
                {result.prompts.map((prompt) => (
                  <CatalogItem
                    description={prompt.description}
                    key={prompt.name}
                    name={prompt.title ? `${prompt.title} · ${prompt.name}` : prompt.name}
                  >
                    <div>
                      <p className="text-xs font-medium text-muted">参数</p>
                      {prompt.arguments.length ? (
                        <ul className="mt-2 space-y-2">
                          {prompt.arguments.map((argument) => (
                            <li className="text-sm" key={argument.name}>
                              <span className="font-medium text-foreground">{argument.name}</span>
                              <span className="text-muted">
                                {argument.required ? " · 必填" : " · 可选"}
                                {argument.description ? ` · ${argument.description}` : ""}
                              </span>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="mt-1 text-sm text-muted">无参数</p>
                      )}
                    </div>
                    <JsonDefinition label="完整定义" value={prompt.raw} />
                  </CatalogItem>
                ))}
              </ul>
            ) : (
              <EmptyCatalog>此服务器没有提供提示词</EmptyCatalog>
            )}
          </Tabs.Panel>

          <Tabs.Panel className="space-y-5 px-0 pb-0" id="server">
            {isLoading ? (
              <CatalogSkeleton />
            ) : result ? (
              <>
                <dl className="grid gap-4 text-sm sm:grid-cols-2">
                  <div>
                    <dt className="text-xs text-muted">服务端名称</dt>
                    <dd className="mt-1 break-all">{result.serverName || "未提供"}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted">服务端版本</dt>
                    <dd className="mt-1 break-all">{result.serverVersion || "未提供"}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted">发现时间</dt>
                    <dd className="mt-1">{new Date(result.discoveredAt).toLocaleString()}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted">配置版本</dt>
                    <dd className="mt-1 tabular-nums">{result.configRevision}</dd>
                  </div>
                </dl>
                {result.instructions ? (
                  <div>
                    <p className="text-xs font-medium text-muted">服务器说明</p>
                    <div className="mt-2">
                      <AssistantMarkdown>{result.instructions}</AssistantMarkdown>
                    </div>
                  </div>
                ) : null}
                <JsonDefinition label="服务端信息" value={result.serverInfo} />
                <JsonDefinition label="能力声明" value={result.capabilities} />
              </>
            ) : null}
          </Tabs.Panel>
        </Tabs>
      ) : (
        <EmptyCatalog>{emptyCatalogMessage}</EmptyCatalog>
      )}
    </SettingsCatalogDetail>
  );
}
