# Runtime Setup

本文档只记录 Agent Runtime 的实施顺序、执行过程、完成进度和验证结果。稳定的模块职责、数据协议、安全边界与演进原则以 [`架构设计.md`](./架构设计.md) 为准。

## 进度说明

- `已完成`：代码已落地，并通过对应静态检查或冒烟验证。
- `进行中`：已经开始实现，但尚未形成完整闭环。
- `待开始`：保持在架构计划中，尚未进入实现。

## 当前总进度

| 步骤 | 内容 | 状态 |
|---|---|---|
| 1 | Provider 到 Runtime 的模型解析入口 | 已完成 |
| 2 | 无工具 Agent 创建与最小 System Prompt | 已完成 |
| 3 | Pi 事件到 HarnessEvent 的适配 | 已完成 |
| 4 | RunCoordinator 与 AgentManager | 已完成 |
| 5 | Session SQLite 索引与 Session JSONL | 已完成 |
| 6 | Session/Run HTTP API 与 SSE | 已完成 |
| 7 | daemon 运行时装配、关闭与 Provider 占用保护 | 已完成 |
| 8 | Web 对话页接入真实 Session/Run/SSE | 已完成 |
| 9 | Tool Registry、Policy、HITL、Sandbox | 已完成 |
| 10 | AGENTS.md 与 Skill Registry | 已完成 |
| 11 | 消息附件与 `@` Workspace 上下文 | 已完成 |
| 12 | Context 预算、裁剪与压缩 | 已完成 |
| 13 | 基础 Trace 与真实 Run 数据 | 已完成 |

当前已完成真实 Web 对话、workspace 工具、审批、文件变化、AGENTS.md、两级 Skill Registry、消息附件与 `@` Workspace 上下文、Context 管理，以及基础 Trace 闭环。Trace 界面已从 mock 数据切换到真实 Session/Run 事件。

## 2026-08-24：无工具 Runtime 后端闭环

### 步骤 1：Provider 运行时解析

状态：`已完成`

目标：Runtime 只获得已解析的 Model 和绑定到同一 `Models` 实例的 `streamSimple`，不接触 API Key，也不创建额外的 Provider/Model Registry。

执行内容：

- 在 `ProviderService` 增加 `resolveRunModel(providerId, modelId)`。
- 启动 run 前校验 Provider 是否存在、是否启用、Model 是否存在以及认证是否完整。
- Provider 配置、凭据或 OAuth 正在变化时拒绝启动新 run。
- 活动 run 或启动中的 run 占用 Provider 时，阻止修改配置、删除 Provider 或替换凭据。

涉及文件：

- `apps/daemon/src/services/provider-service.ts`
- `apps/daemon/src/controllers/provider-controller.ts`
- `apps/daemon/src/routes/provider-routes.ts`

### 步骤 2：创建无工具 Agent

状态：`已完成`

目标：先跑通最小模型对话，不提前接入 Tool、Policy、Context 压缩、AGENTS.md 或 Skill。

执行内容：

- `create-agent.ts` 注入恢复后的消息、Model、`streamFn`、`sessionId` 和由独立片段组合的 System Prompt。
- 初始 `tools` 为空，thinking level 使用 `off`。
- System Prompt 明确当前运行时没有文件和 Shell 工具，避免模型声称执行了本地操作。

涉及文件：

- `packages/agent-runtime/src/create-agent.ts`
- `packages/agent-runtime/src/prompts/system-prompt.ts`
- `packages/agent-runtime/src/prompts/rich-content-prompt.ts`

### 步骤 3：适配 HarnessEvent

状态：`已完成`

目标：Pi 原始事件不离开 `agent-runtime`，daemon 和 Web 只识别项目自己的事件协议。

执行内容：

- 建立 `HarnessEventType`、Session/Run ID、消息增量和工具事件的数据类型。
- 将 `agent_start`、`message_start/update/end`、`agent_end` 转换为 `run.*` 和 `message.*`。
- 为后续 Tool 接入预留稳定的 `tool.started/updated/completed/failed` 映射。
- Provider 原始错误在进入 HarnessEvent 前转换为稳定、安全的失败文案。

涉及文件：

- `packages/agent-runtime/src/harness-event.ts`
- `packages/agent-runtime/src/event-adapter.ts`

### 步骤 4：RunCoordinator 与 AgentManager

状态：`已完成`

目标：每个 Session 对应一个 Agent，同一 Session 同时只运行一个 Run，并保持事件序号严格递增。

执行内容：

- `RunCoordinator` 维护活动 run、Provider/Model 关联、事件 ID 与 `seq`。
- 支持 `prompt`、`abort`、`steer` 和 `followUp` 的 Runtime 调用入口。
- `AgentManager` 按 Session 缓存和恢复 Agent，暴露 Session/Provider 占用状态。
- daemon 关闭时中止活动 Agent、等待完成并解除事件订阅。

涉及文件：

- `packages/agent-runtime/src/run-coordinator.ts`
- `packages/agent-runtime/src/agent-manager.ts`
- `packages/agent-runtime/src/index.ts`

### 步骤 5：Session 持久化

状态：`已完成`

目标：SQLite 只保存轻量索引，Session JSONL 保存完整对话和运行事件。

执行内容：

- 新增 `workspaces` 和 `sessions` migration。
- Session 创建时将 workspace 解析为真实目录，并绑定不可变的 `workspaceRoot`。
- JSONL 按 Session 串行追加，写入后执行 `fsync`。
- 恢复时逐行校验 HarnessEvent，并从 `message.completed` 恢复完整 Agent messages。
- 允许修复崩溃留下的不完整末行；中间行损坏继续报错。
- `message.delta` 和 `tool.updated` 只实时广播，不写入 JSONL；因此落盘事件的 `seq` 可以不连续，但必须严格递增。

涉及文件：

- `apps/daemon/src/storage/migrations.ts`
- `apps/daemon/src/storage/database.ts`
- `apps/daemon/src/storage/session-event-store.ts`
- `apps/daemon/src/services/session-event-service.ts`

### 步骤 6：Session、Run 与 SSE

状态：`已完成`

目标：通过 daemon API 创建 Session、启动或中止 Run，并通过 SSE 接收实时 HarnessEvent。

执行内容：

- 增加 Session 列表、创建、快照和模型切换接口。
- 增加 Run 启动和指定 Run 中止接口。
- Run 启动返回 `202 + runId`，模型执行作为受跟踪的后台任务继续运行。
- SSE 先重放 JSONL 中已持久化的事件，再发送进程内实时事件。
- SSE 支持 `afterSeq` 和 `Last-Event-ID`，断开连接不会取消 Agent。
- 状态变更接口复用同源与自定义请求头校验。

涉及文件：

- `apps/daemon/src/dto/session-dto.ts`
- `apps/daemon/src/vo/session-vo.ts`
- `apps/daemon/src/controllers/session-controller.ts`
- `apps/daemon/src/controllers/session-events-controller.ts`
- `apps/daemon/src/routes/session-routes.ts`
- `apps/daemon/src/services/session-service.ts`
- `apps/daemon/src/sse/session-event-broker.ts`
- `apps/daemon/src/utils/request-security.ts`

### 步骤 7：daemon 装配与依赖

状态：`已完成`

执行内容：

- 在 daemon 组装根创建 EventStore、EventBroker、AgentManager、ProviderService 和 SessionService。
- 关闭顺序调整为：中止并等待 Session Run、关闭 Provider OAuth、清理 SSE 订阅、关闭数据库。
- daemon 增加对 `@pi-harness/agent-runtime` 的 workspace 依赖。
- 通过 pnpm 更新 lockfile，没有手动修改 `pnpm-lock.yaml`。

涉及文件：

- `apps/daemon/src/server/create-server.ts`
- `apps/daemon/src/config/index.ts`
- `apps/daemon/package.json`
- `pnpm-lock.yaml`

## 验证记录

状态：`已完成`

- `pnpm typecheck`：全部 workspace package 通过。
- `biome check`：本次 Runtime 与 daemon 相关代码通过；Markdown 位于 Biome 忽略范围，不计入该结果。
- Agent Runtime 冒烟验证：无网络 fake stream 成功产生 `run.started`、消息事件、增量事件和 `run.completed`，事件序号连续。
- 持久化冒烟验证：SQLite migration、Session 创建、JSONL 追加、非连续 `seq` 恢复和 SQLite 索引更新通过。
- Fastify 装配冒烟验证：不监听端口的 server 创建、Session 路由注册、请求注入和优雅关闭通过。
- 未执行 dev 或 build。
- 验证环境显示 Node 22/23 的 engine warning；项目目标运行时仍为 Node.js 24 LTS。

## 2026-08-28：AGENTS.md 与 Skill Registry

状态：`已完成`

- 全局 Skill 使用 daemon 数据目录下的 `skills/`，项目 Skill 使用 workspace `.agents/skills`，同名时项目优先。
- 按 Skill 结构规范校验目录名、`SKILL.md`、YAML frontmatter、description 和正文，并限制入口及资源文件大小。
- 每次 Run 有界读取根目录 `AGENTS.md` 并发现 Skill，只将名称、description 和 scope 作为目录注入 System Prompt。
- Agent 根据用户意图选择 Skill，确定使用后再调用 `load_skill` 读取正文；Runtime 不做关键词预加载。
- 消息输入器从当前 Workspace 的真实 Skill 目录生成“+ → Skills”菜单，选中标签在提交时序列化为 `$skill-name`。
- 增加 `find_skill`、`get_skill`、`load_skill` 和 `skill_creator`；资源加载执行真实路径边界检查。
- `skill_creator` 只创建新 Skill 并复用通用文件写入权限；项目 Skill 跟随 workspace 写入策略，全局 Skill 作为 workspace 外写入仅在 `full_access` 下自动放行，且全局 Skill 目录仍是 daemon 受保护路径。

验证：`@pi-harness/tools` 和 `@pi-harness/agent-runtime` typecheck 通过。未执行 dev 或 build。

## 2026-08-30：消息附件与 `@` Workspace 上下文

状态：`已完成`

- Run 与 Follow-up 输入从单一 prompt 扩展为结构化 `RunUserInput`，同时携带文本、附件和 Workspace 引用。
- 消息输入器支持选择图片与常用文本/代码文件；支持在运行中的 Session 继续添加附件并排队 Follow-up。
- 输入 `@` 时从当前 Workspace 的真实目录生成图片、文件和文件夹候选，选中后以可见标签保留在编辑器和历史用户消息中。
- daemon 的候选列表排除忽略目录并验证 Workspace 真实路径边界，实际读取时再校验受保护目录；文件夹引用只注入有界目录清单。
- Runtime 将图片转换为模型图片内容，将文本附件和文件引用放入带不可信数据边界的上下文段；当前模型不支持图片时返回明确错误。
- `transformContext` 只对历史消息中已展开的附件与 `@` 引用应用同一总量限制，避免失败请求留下的超大参考内容污染后续重试；该投影不修改 JSONL，也不裁剪普通会话历史。
- 完整模型消息、附件展示元数据和 `@` 引用元数据随 `message.completed` 写入 Session JSONL；恢复后仍可展示原始用户输入和图片附件。
- Web 限制单个附件 5 MB、最多 8 个、单次合计 10 MB；Runtime 对单个文本来源最多读取 64 KiB，并将本次附件与引用的总文本限制在模型窗口的 25%（最少 8 KiB、最多 64 KiB 字符），文件夹清单最多 200 项。

验证：`@pi-harness/tools`、`@pi-harness/agent-runtime`、`@pi-harness/daemon` 和 `@pi-harness/web` typecheck 通过，本次相关文件通过 Biome。未执行 dev 或 build；当前验证环境为 Node.js 22，存在项目要求 Node.js 24 LTS 的 engine warning。

## 2026-09-02：基础 Trace

状态：`已完成`

- Web 将同一 Session 的全部 `HarnessEvent` 投影为一条连续 Trace，不按 `runId` 拆分选择器；Run 边界、消息编辑、排队追加和调整方向直接进入记录列表。
- 时间线只累计各 Run 的活动时长，压缩 Run 之间的 Session 空闲间隔；零时长生命周期事件保留在记录列表，不绘制为时间条。顶部 Session 状态和记录总数使用稳定的中性展示，不随所选记录变色。
- Turn 由真实用户消息切分，从当前用户消息持续到下一条用户消息之前；中间模型请求数和 Run 边界不改变 Turn。
- 模型、Tool、审批和 Context 压缩事件分别配对为耗时记录；未结束记录会随当前时间更新，Run 结束后缺少闭合事件则显示稳定错误状态。
- Runtime 在用户消息中保留排队追加或调整方向的提交语义，供 JSONL 恢复后的 Trace 准确展示；两者继续在同一活动 Run 内顺序执行。
- Trace 汇总模型与压缩请求的 Token，用稳定错误码标记 Run、模型、Tool 和审批失败，并限制原始数据预览长度。
- 现有时间线、记录列表、搜索、范围筛选和详情面板全部改为消费真实 Trace 数据，移除 mock 数据文件。

验证：`@pi-harness/agent-runtime`、`@pi-harness/web` typecheck 和相关文件 Biome 检查通过；事件投影通过单次可运行断言校验。未执行 dev、build 或 git。

## 下一步

状态：`待开始`

使用已配置的真实 Provider 做发布前 burn-in，覆盖长会话、Tool 审批、Context 压缩、停止与失败恢复；发现可复现问题后再补针对性修复。
