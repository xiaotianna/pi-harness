"use client";

import { Button, Card, Chip, Switch } from "@heroui/react";
import type { LucideIcon } from "lucide-react";
import { CircleAlert, Database, Folder, Github, Globe2, Plus, ShieldCheck } from "lucide-react";
import { SettingsPanelHeader } from "./settings-panel-header";

const McpServerStatus = {
  CONNECTED: "connected",
  DISCONNECTED: "disconnected",
  ERROR: "error",
} as const;

const MCP_SERVER_STATUS_META = {
  [McpServerStatus.CONNECTED]: {
    color: "success",
    label: "已连接",
  },
  [McpServerStatus.DISCONNECTED]: {
    color: "default",
    label: "未连接",
  },
  [McpServerStatus.ERROR]: {
    color: "danger",
    label: "连接异常",
  },
} as const;

const MCP_SERVERS = [
  {
    id: "filesystem",
    name: "Filesystem",
    description: "在当前工作区内读取文件、目录和元数据。",
    target: "npx -y @modelcontextprotocol/server-filesystem ./",
    transport: "stdio",
    scope: "项目",
    toolCount: 14,
    icon: Folder,
    status: McpServerStatus.CONNECTED,
    isEnabled: true,
    errorMessage: null,
  },
  {
    id: "github",
    name: "GitHub",
    description: "访问仓库、Pull Request、Issue 和 Actions。",
    target: "https://api.githubcopilot.com/mcp/",
    transport: "HTTP",
    scope: "全局",
    toolCount: 23,
    icon: Github,
    status: McpServerStatus.CONNECTED,
    isEnabled: true,
    errorMessage: null,
  },
  {
    id: "postgres",
    name: "Postgres",
    description: "以只读权限查询本地开发数据库。",
    target: "uvx mcp-server-postgres",
    transport: "stdio",
    scope: "项目",
    toolCount: 7,
    icon: Database,
    status: McpServerStatus.ERROR,
    isEnabled: true,
    errorMessage: "启动超时，请检查本地 uvx 是否可用。",
  },
  {
    id: "web-search",
    name: "Web Search",
    description: "从公开网页中检索并提取实时信息。",
    target: "https://mcp.search.example/v1",
    transport: "HTTP",
    scope: "全局",
    toolCount: 5,
    icon: Globe2,
    status: McpServerStatus.DISCONNECTED,
    isEnabled: false,
    errorMessage: null,
  },
] as const satisfies readonly {
  id: string;
  name: string;
  description: string;
  target: string;
  transport: "stdio" | "HTTP";
  scope: "项目" | "全局";
  toolCount: number;
  icon: LucideIcon;
  status: (typeof McpServerStatus)[keyof typeof McpServerStatus];
  isEnabled: boolean;
  errorMessage: string | null;
}[];

export function McpSettingsPanel() {
  return (
    <section aria-label="MCP 设置" className="w-full max-w-[720px]">
      <SettingsPanelHeader
        action={
          <Button size="sm" variant="secondary">
            <Plus className="size-4" />
            添加服务器
          </Button>
        }
        description="连接本地或远程 MCP 服务器，让 Agent 在经过审批后使用外部工具和数据。"
        title="MCP"
      />

      <div className="mt-6 grid grid-cols-3 gap-3">
        <div className="rounded-2xl bg-default p-4">
          <span className="text-2xl font-medium tabular-nums text-foreground">2</span>
          <p className="mt-1 text-xs text-muted">已连接服务器</p>
        </div>
        <div className="rounded-2xl bg-default p-4">
          <span className="text-2xl font-medium tabular-nums text-foreground">42</span>
          <p className="mt-1 text-xs text-muted">当前可用工具</p>
        </div>
        <div className="rounded-2xl bg-default p-4">
          <span className="text-2xl font-medium tabular-nums text-foreground">2</span>
          <p className="mt-1 text-xs text-muted">项目级配置</p>
        </div>
      </div>

      <div className="mt-8 flex items-center justify-between gap-4">
        <div>
          <h3 className="font-medium text-foreground">服务器</h3>
          <p className="mt-1 text-sm text-muted">支持 stdio 与 Streamable HTTP 传输。</p>
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-3">
        {MCP_SERVERS.map((server) => {
          const Icon = server.icon;
          const status = MCP_SERVER_STATUS_META[server.status];

          return (
            <Card key={server.id} variant="secondary">
              <Card.Header className="flex-row items-start gap-4">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-default">
                  <Icon aria-hidden className="size-5 text-muted" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Card.Title>{server.name}</Card.Title>
                    <Chip color={status.color} size="sm" variant="soft">
                      {status.label}
                    </Chip>
                  </div>
                  <Card.Description className="mt-1">{server.description}</Card.Description>
                </div>
                <Switch
                  aria-label={`${server.name} 可用状态`}
                  defaultSelected={server.isEnabled}
                  size="sm"
                >
                  <Switch.Content>
                    <Switch.Control>
                      <Switch.Thumb />
                    </Switch.Control>
                  </Switch.Content>
                </Switch>
              </Card.Header>
              <Card.Content className="mt-4 flex flex-col gap-3">
                <div className="flex min-w-0 items-center gap-2">
                  <code className="min-w-0 flex-1 truncate rounded-lg bg-default px-3 py-2 text-xs text-muted">
                    {server.target}
                  </code>
                  <Button size="sm" variant="tertiary">
                    配置
                  </Button>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Chip size="sm" variant="soft">
                    {server.transport}
                  </Chip>
                  <Chip size="sm" variant="soft">
                    {server.scope}
                  </Chip>
                  <span className="text-xs tabular-nums text-muted">{server.toolCount} 个工具</span>
                </div>
                {server.errorMessage ? (
                  <div className="flex items-center gap-2 text-xs text-danger">
                    <CircleAlert aria-hidden className="size-4 shrink-0" />
                    <span>{server.errorMessage}</span>
                  </div>
                ) : null}
              </Card.Content>
            </Card>
          );
        })}
      </div>

      <div className="mt-4 flex items-start gap-3 rounded-2xl bg-default p-4 text-sm text-muted">
        <ShieldCheck aria-hidden className="mt-0.5 size-4 shrink-0 text-accent" />
        <p>服务器提供的工具仍受工作区边界和审批策略保护；连接成功不代表工具可以绕过用户确认。</p>
      </div>
    </section>
  );
}
