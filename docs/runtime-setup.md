# 运行环境与当前实现

稳定职责与安全边界见 [架构设计](./架构设计.md)；MCP 配置与限制见 [MCP 使用说明](./mcp-usage.md)；桌面打包见 [桌面端正式发布](./desktop-release.md)。

## 当前能力

| 能力 | 当前实现 | 主要代码入口 |
|---|---|---|
| Provider 与对话运行 | 内置 Provider 按需加载、自定义 Provider、API Key/OAuth、模型与推理档位、Session 恢复、Run 停止和后续输入 | [ProviderService](../apps/daemon/src/services/provider-service.ts)、[AgentManager](../packages/agent-runtime/src/agent-manager.ts)、[RunCoordinator](../packages/agent-runtime/src/run-coordinator.ts) |
| HTTP、SSE 与 JSONL | 持久化项目 HarnessEvent；普通对话与完整轨迹使用不同投影；初次读取快照，重连按 seq 重放持久化事件并接收实时增量 | [SessionEventService](../apps/daemon/src/services/session-event-service.ts)、[SessionEventStore](../apps/daemon/src/storage/session-event-store.ts)、[Session 路由](../apps/daemon/src/routes/session-routes.ts) |
| Workspace 工具与命令 | 文件、图片、文档/PDF、目录、文本与网络读取，文件修改，以及可等待和停止的受跟踪命令进程 | [Workspace Tool Registry](../packages/tools/src/workspace-tool-registry.ts)、[CommandProcessManager](../packages/tools/src/command-process-manager.ts) |
| Policy 与 Sandbox | 路径/受保护目录检查、审批、命令前缀、Shell/stdio MCP 沙箱及远端网络边界 | [Tool Policy](../packages/policy/src/tool-policy.ts)、[Sandbox](../packages/sandbox/src/index.ts) |
| AGENTS.md、Skill 与插件 | 每个 Run 发现 Workspace 上下文，Skill 正文按需读取；内置插件提供 Skill、MCP App 和连接入口 | [Workspace Agent Context](../packages/agent-runtime/src/context/workspace-agent-context.ts)、[Skill Registry](../packages/tools/src/skill-registry.ts)、[插件目录](../packages/tools/src/plugins) |
| 附件与 Workspace 引用 | 结构化输入支持图片、文本附件及文件/目录引用；daemon 验证边界，Runtime 生成模型上下文 | [User Input](../packages/agent-runtime/src/user-input.ts)、[SessionService](../apps/daemon/src/services/session-service.ts) |
| Plan、Todos 与人工交互 | Plan 模式、计划书、执行步骤、Todos、审批与用户回答通过现有 Run/JSONL 保存 | [Working State](../packages/agent-runtime/src/working-state.ts)、[HumanInteractionService](../apps/daemon/src/services/human-interaction-service.ts) |
| Context | 预算、裁剪、结构化压缩、checkpoint 回退、工作状态重置与用量；已有确定性和真实 Provider eval 入口 | [Context Pipeline](../packages/agent-runtime/src/context/context-pipeline.ts)、[evals](../packages/evals) |
| Session 搜索 | SQLite FTS5 从 JSONL 有效分支派生消息索引；Agent 另有当前 Session 历史搜索工具 | [SessionService](../apps/daemon/src/services/session-service.ts)、[Context Runtime Tools](../packages/tools/src/tools/context-runtime.ts) |
| Trace | Web 从 HarnessEvent 派生主/子 Agent 轨迹；完整消息、模型请求、工具、审批和压缩详情按需加载 | [Agent Trace 投影](../apps/web/src/features/trace/utils/session-events-to-agent-traces.ts) |
| MCP Host | daemon 管理服务器、凭据、信任、能力目录和 Client；调用接入现有执行链 | [MCP 模块](../apps/daemon/src/mcp)、[McpToolService](../apps/daemon/src/services/mcp-tool-service.ts) |
| MCP 工具发现 | tool_search 做精确名称优先、BM25/本地向量混合检索并自动加载匹配定义；默认 8 个、最多 10 个；搜索不授予执行权限 | [工具搜索](../packages/tools/src/tools/tool-search.ts)、[HybridToolSearch](../packages/tools/src/utils/tool-search.ts) |
| Long-term Memory | user/workspace scope、自动学习、编辑/删除、派生用户画像、FTS/本地向量混合召回与请求级 Context | [MemoryService](../packages/memory/src/memory-service.ts)、[SQLite adapter](../apps/daemon/src/storage/memory-repository.ts) |
| Computer Use | macOS 原生 helper、受限脚本、窗口截图、Accessibility Tree 和输入，通过内置 MCP App/权限链接入 | [Computer Use](../packages/computer-use/README.md)、[系统权限服务](../apps/daemon/src/services/computer-use-permission-service.ts) |
| 任务看板与 Sub Agent | 顶层任务关联 Run；成功完成进入待确认，由用户确认完成，失败/中止进入等待；父子执行树、委派/等待/消息/停止、独立轨迹与重启中断恢复 | [BoardTaskService](../apps/daemon/src/services/board-task-service.ts)、[SubAgentTree](../packages/agent-runtime/src/sub-agent-tree.ts) |
| 桌面端 | Tauri 管理动态端口与 Node sidecar；daemon 托管 Web；GitHub 登录使用 Device Flow | [Tauri 入口](../apps/desktop/src-tauri/src/main.rs)、[AuthService](../apps/daemon/src/services/auth-service.ts) |

Memory 混合检索、MCP 工具混合检索和 Session 搜索分别服务具体场景。通用文档 RAG、独立 Retrieval package、多 sink 追踪仍是演进方向；当前没有 `apps/daemon/src/observability`，也没有统一 `spanId/parentSpanId` 链路实现。

## 环境与命令入口

仓库要求 Node.js 24 或更高版本，包管理器为根 package.json 指定的 pnpm 10.33.2。第三方版本由 [pnpm-workspace.yaml](../pnpm-workspace.yaml) 的严格 Catalog 管理，内部包使用 workspace:*。按需执行 pnpm install 安装依赖。

以下命令可按需执行。

| 命令 | 行为与前提 |
|---|---|
| `pnpm dev` | 并行启动 daemon 的 tsx watch 与 Web 的 Vite；默认端口分别为 4310、5173 |
| `pnpm dev:daemon` / `pnpm dev:web` | 单独启动对应应用 |
| `pnpm dev:desktop` | Tauri 开发窗口；脚本检查默认端口，仅在不可达时启动对应 daemon/Web 开发进程 |
| `pnpm dev:docker` | 启动 [开发 Compose](../docker-compose.dev.yml) 中的 SearXNG，绑定 127.0.0.1:8888 |
| `pnpm dev:oauth` | 运行 [emulate 配置](../emulate.config.yaml) 的本地 GitHub、Google、Vercel OAuth/API fixture |
| `pnpm dev:mcp` | 打开 MCP Inspector 开发诊断工具 |
| `pnpm build` | 构建 daemon dist 与 Web dist |
| `pnpm start` | 运行已有 daemon dist/bootstrap.js 与 Vite preview，不会补做构建 |
| `pnpm build:desktop` | 本机打包，构建 Web 并准备 daemon、Node 和 helper；不执行正式发布脚本的完整校验 |
| `pnpm release:desktop` | macOS 正式发布，见 [桌面发布说明](./desktop-release.md) |
| `pnpm typecheck` / `pnpm check` | workspace TypeScript 检查 / Biome 静态检查 |
| `pnpm eval:context` | 运行既有确定性 Context 与 JSONL 恢复评估 |
| `pnpm eval:context:live` | 调用真实 Provider 评估压缩，需要进程环境中的认证，会产生模型费用 |
| `pnpm env:encrypt` / `pnpm env:decrypt` / `pnpm env:check` | 根 `.env` 手动加密备份、恢复与自检，见 [加密备份说明](./env-encryption.md) |

准确参数以 [根 package.json](../package.json)、[daemon package.json](../apps/daemon/package.json) 和 [Web Vite 配置](../apps/web/vite.config.ts) 为准。Web 开发和 preview 都通过 `/api` 代理默认 daemon；改变 daemon 端口时需同步代理和 OAuth 回调配置。

## daemon 配置

[loadHarnessConfig](../apps/daemon/src/config/index.ts) 读取进程环境。daemon 的开发和 start 脚本用 `--env-file-if-exists=../../.env` 加载仓库根 .env；Context eval 不通过这些脚本加载 .env。

只配置实际使用的可选变量，不要给未使用的 OAuth 字段设置空字符串。当前 [.env.example](../.env.example) 含空 OAuth 占位，直接原样复制会不符合配置 schema 的 `minLength: 1` 约束。

| 环境变量 | 默认值或约束 |
|---|---|
| `PI_HARNESS_HOST` | 默认 127.0.0.1；保持回环监听 |
| `PI_HARNESS_PORT` | 默认 4310，整数 1–65535 |
| `PI_HARNESS_LOG_LEVEL` | 默认 info |
| `PI_HARNESS_WEB_URL` | 默认 http://127.0.0.1:5173；必须为 HTTP(S) 回环 URL，也是变更请求的 Origin |
| `PI_HARNESS_DATABASE_PATH` | 默认 ~/.pi-harness/harness.sqlite；所在目录同时成为凭据、Session、全局 Skill 与模型缓存的数据根 |
| `PI_HARNESS_WEB_SEARCH_URL` | 默认 http://127.0.0.1:8888；必须为 HTTP(S) 回环 URL，只连接本机 SearXNG |
| `PI_HARNESS_SKILL_GATEWAY_URL` | 默认当前 daemon 端口的回环 URL；用于插件 Gateway 与默认 OAuth 回调 |
| `PI_HARNESS_GITHUB_CLIENT_ID` | 启用应用 GitHub 登录时提供；桌面打包必需 |
| `PI_HARNESS_GITHUB_CLIENT_SECRET` | 普通 Web 的授权码登录需要；桌面 Device Flow 不需要 |
| `PI_HARNESS_GITHUB_CALLBACK_URL` | 默认 `http://127.0.0.1:<port>/api/auth/github/callback`，必须为 HTTP(S) 回环 URL |
| `PI_HARNESS_SKILL_<SERVICE>_CLIENT_ID` / `CLIENT_SECRET` | 支持 GITHUB、GOOGLE、NOTION、SUPABASE、VERCEL，每对同时提供；回调与插件配置、服务商登记一致 |
| `PI_HARNESS_DESKTOP_TOKEN` / `PI_HARNESS_WEB_DIST_PATH` | 必须成对配置，由正式 Tauri 壳传入；普通 Web 开发无需设置 |

应用 GitHub 登录、模型 Provider OAuth 和插件 OAuth 用途独立。普通 Web 使用 GitHub 授权码与 PKCE；桌面使用系统浏览器中的 Device Flow，daemon 最多等待 10 分钟，成功后给原 WebView 请求设置本地会话 Cookie。应用登录只保存用户信息与本地令牌哈希，GitHub access token 完成身份读取后丢弃；持续访问凭据保存在 Provider/插件 Credential Store。

## 数据目录与恢复

运行方式决定数据根：

- pnpm dev / dev:daemon 的 daemon 脚本显式设置 ../../.pi-harness/harness.sqlite，使用仓库根 .pi-harness。
- pnpm start 不额外覆盖数据库路径，未配置时使用 ~/.pi-harness。相对路径基于 daemon 工作目录 apps/daemon；自定义生产路径建议使用绝对路径。
- 正式 Tauri 显式使用 ~/.pi-harness/harness.sqlite，并将静态 Web 指向安装包资源目录。

主要文件如下，部分文件按功能使用时才创建：

```text
<globalRoot>/
├── harness.sqlite               # auth/workspace/session 索引、设置、MCP、Memory、BoardTask
├── harness.sqlite-wal           # SQLite WAL 日志
├── harness.sqlite-shm           # SQLite WAL 共享内存文件
├── sessions/<sessionId>.jsonl   # 完整 HarnessEvent 事实源
├── credentials.json            # Provider API Key / OAuth
├── mcp-credentials.json         # MCP Header、env、OAuth 等敏感配置
├── skill-credentials.json       # 插件 OAuth
├── sandbox-credentials.json     # 可选 Sandbox 运行凭据
├── sandbox-policy.json          # Sandbox Profile 与网络规则
├── allowed-command-prefixes.json # 已允许的命令 argv 前缀
├── skills/                      # 用户全局 Skill
└── models/                      # 本地 embedding 缓存
```

[openHarnessDatabase](../apps/daemon/src/storage/database.ts) 开启 foreign keys/WAL，在事务中应用 [显式 migrations](../apps/daemon/src/storage/migrations.ts)，当前最后一条为 `025-add-board-task-confirmation.sql`。SQLite 保存结构化配置、长期记忆、看板任务和 Session 轻量索引；会话全文搜索、Memory FTS/向量和 MCP 能力目录是可重建派生数据。Sub Agent 的完整运行记录继续放在所属 Session JSONL。

SessionEventStore 串行追加并同步写盘，seq 严格递增但可不连续；`message.delta`、`tool.updated`、`command.updated`、`subagent.message.delta` 和 `subagent.tool.updated` 只实时发送。启动恢复收束中断 Run/子执行。解析只修复不完整末行，中间损坏报错。先写 JSONL 后更新 SQLite 索引，不删除事实记录回滚索引失败。

迁移/备份前关闭使用该目录的 daemon，保存完整数据根。当前没有自动合并旧 Tauri 应用数据目录与 ~/.pi-harness 的逻辑。

## 装配与请求链

[createServer](../apps/daemon/src/server/create-server.ts) 负责统一装配：

1. 打开 SQLite、独立 Credential Store，创建文件打开与系统权限服务。
2. 装配 MCP 配置、Client、OAuth、诊断、插件连接，复用有效本地能力目录；仅对缺失、版本不匹配或损坏的缓存启动可取消的后台补齐。
3. 初始化 JSONL、SSE broker 和 BoardTask 投影，恢复中断执行。
4. 创建 ProviderService、本地 embedding、MemoryService、AgentManager、WorkspaceService、SessionService，初始化搜索索引。
5. 注册 Host/Origin 与桌面 Cookie 检查，以及 auth、settings、board、health、MCP、memory、provider、session、skill、workspace 路由。桌面配置开启时额外托管 Web 与 bootstrap/shutdown。

状态变更由 [request-security](../apps/daemon/src/utils/request-security.ts) 检查配置的 Web Origin 和 `x-pi-harness-request: 1`；桌面启动先用随机令牌换 daemon Cookie。SSE 断开不停止 Agent。关闭时取消预热、关闭选择器与 Workspace 操作、收束 Session/命令执行、关闭 MCP/Provider、清理 broker，最后关闭数据库。

## 评估与待验收范围

packages/evals 使用同一 Context Pipeline。pnpm eval:context 的代码覆盖纠正、失败工具、附件、超时降级、重复压缩、稳定 checkpoint 前缀、prompt cache、任务边界重置和 JSONL 写入/回退/重启恢复；源码成功时输出对应布尔字段。

真实 Provider 入口：

```sh
PI_HARNESS_EVAL_PROVIDER=<provider> PI_HARNESS_EVAL_MODEL=<model> pnpm eval:context:live
```

认证由 pi-ai Models 从进程环境取得，不读取 daemon credentials.json。可选 PI_HARNESS_EVAL_CONTEXT_WINDOW 默认 12000，最小 6000；PI_HARNESS_EVAL_SESSIONS_PATH 和 PI_HARNESS_EVAL_SESSION_ID 必须同时提供，用于读取现有有效 Session 消息再追加评估长任务。该入口检查压缩中的纠正、附件约束和失败保留，不等于整个 Agent 多轮 burn-in。

运行验收范围：真实 Provider 长任务与压缩恢复、MCP 连接/鉴权/重连、Sub Agent 并行/嵌套/审批/写入冲突/停止/重启、看板待确认与完成、embedding 首次下载和离线降级、macOS TCC 授权，以及安装包在目标机器启动。
