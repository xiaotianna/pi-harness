# 本机执行与 MCP 沙箱

`run_command` 与 stdio MCP 使用锁定版本的 Anthropic Sandbox Runtime，并直接沿用 SRT 提供的文件系统、网络、凭据代理及平台隔离能力。SRT 初始化或配置失败时拒绝启动。只有 `run_command` 失败且 SRT 明确返回 violation 时，才展示原因并允许用户逐次批准原命令在宿主机无沙箱重跑；stdio MCP 不回退到普通进程。

每次命令和每个 stdio MCP Client 拥有独立 worker、网络代理、HOME 和临时目录。文件读写规则由 SRT 执行：workspace 与明确加载的资源可读，`workspace_write` 下的 workspace 可写，daemon 私有目录保持受保护。用户 HOME 下的工具配置、凭据和未授权文件不可读。

stdio MCP 只通过 worker 转发 JSON-RPC 管道，不能绕过 SRT 直接启动。HTTP、SSE 和 OAuth 没有本机子进程，其 URL、SRT 域名规则、DNS 固定、私网阻断、重定向、凭据目标和流量上限统一由本包的网络边界校验；远端服务器自身的文件系统和副作用不属于本机沙箱，仍由 MCP 信任和逐次工具审批约束。

宿主机重跑不实现第二套操作系统隔离：它只保留固定 workspace cwd、环境变量白名单、超时、输出限制和中止。`full_access`、会话授权和命令前缀都不能自动批准这次提升。批准前会说明 SRT violation 和首次沙箱执行已经产生的可追踪文件变化数量；最终文件变化以首次执行前的 workspace 快照为基准统一统计。用户拒绝、宿主命令失败或普通沙箱命令失败时，已经产生的可追踪文件变化仍进入 Session 事件，不提供事务回滚。

## 网络许可

可在应用设置的“沙箱”菜单中维护 Profile 与联网规则，也可在 daemon 数据目录（SQLite 所在目录）保存 `sandbox-policy.json`：

```json
{
  "profile": "workspace_write",
  "allowedDomains": ["registry.npmjs.org:443", "github.com", "*.githubusercontent.com"],
  "deniedDomains": ["169.254.169.254", "*:22"]
}
```

允许规则直接放行，拒绝规则优先。`allowedDomains` 为空时允许所有未被拒绝的目标；非空时，`run_command` 首次访问其他 host:port 可请求临时审批，MCP 只连接允许列表中的目标。规则支持域名、IP 和端口；allow 不接受全局 `*`，需要允许全部时保持为空；deny 可用 `*` 或 `*:port`。`profile` 可选 `read_only` 或 `workspace_write`。所有审批模式都遵循这些边界。

## Shell 凭据代理

可在 daemon 数据目录创建权限为 0600 的 `sandbox-credentials.json`：

```json
{
  "credentials": [
    {
      "name": "GITHUB_TOKEN",
      "value": "真实 Token",
      "injectHosts": ["api.github.com"]
    }
  ]
}
```

`injectHosts` 使用 SRT 支持的无端口主机规则；`allowedDomains` 非空时必须覆盖这些目标，为空时由沙箱边界把凭据目标交给 SRT 注册，但不会把凭据发送到其他主机。命令读取该变量时只能得到随机哨兵值；SRT TLS 代理仅向指定目标发送请求时替换真实值。该文件不进入 Web、SQLite、Session JSONL 或日志。

stdio MCP 的环境变量凭据同样通过 SRT 哨兵传入，并只会向沙箱允许的目标恢复真实值；daemon 不再把真实值直接放进 MCP 子进程环境。

## 验证

仓库根目录使用 Node.js 24 执行：

```sh
node --import ./apps/daemon/node_modules/tsx/dist/loader.mjs packages/sandbox/scripts/verify-sandbox.mts
pnpm --filter @pi-harness/sandbox --filter @pi-harness/policy typecheck
```

验证脚本只使用临时目录和本机临时 HTTP 服务，检查 workspace 读写、越界和符号链接阻断、凭据保护、策略原子写入、代理许可与直连阻断、进程组清理、超时、中止、输出上限、并发与退出码。

实现依赖：[Anthropic Sandbox Runtime](https://github.com/anthropics/sandbox-runtime)。
