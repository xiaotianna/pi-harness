# MCP Client + Host 实现目标与任务跟踪

> 创建日期：2026-09-10。最后更新：2026-09-10。
> 文档性质：目标设计与实施台账。除标为已完成且给出证据的任务外，本文描述均为待实现能力。
> 本文是 MCP 工作的任务状态唯一来源；架构文档只维护职责和约束，不复制任务进度。

## 1. 目标与完成边界

用户目标：为 PI Harness 实现完整的 MCP Client + Host 功能，并持续标识全部任务及当前任务状态。

MCP 服务器配置、凭据、信任及启用状态在当前 daemon 内全局共用，不按项目划分。所有会话在下一轮准备时读取相同的已启用且受信任服务器；连接测试不要求创建或选择项目。Client 仍按会话隔离，stdio 调用沿用会话固定目录，管理测试使用独立临时目录并及时回收。

PI Harness 整体承担 Host 职责，由本地 daemon 管理 MCP Client、外部服务器、授权、上下文和生命周期，Web 提供配置、人工交互与可观测性。每个 Client 对应一个外部 MCP Server；本项目本轮不向其他应用提供 MCP Server 接口。

完整交付必须覆盖：协议基础与版本兼容、stdio/Streamable HTTP、Tools、Resources、Prompts、Completion、Elicitation、OAuth、权限与隔离、工具选择和上下文预算、持久化与恢复、管理和会话 UI、诊断及联调验收。旧版服务器所需的 HTTP+SSE、Roots、Sampling、Logging 与生命周期作为明确的兼容任务交付，不能用一个 Tools 演示替代完整目标。

分阶段只规定执行顺序，不缩小最终目标。核心清单 MCP-001 至 MCP-044 全部完成并通过证据审查，才可以宣称本轮 Client + Host 完整交付。

Tasks、MCP Apps、Skills over MCP 是独立、可选的协议扩展，单列 EXT 台账，当前不计入核心交付；它们没有被视为已支持，也不因未实现就伪造 capability。纳入交付范围时必须增加实现与验收子任务，并更新完成口径。这里排除的是可选扩展，不排除核心能力、旧版兼容和 Host 产品闭环。

## 2. 当前状态

| 项目 | 当前值 |
|---|---|
| 总体状态 | 实施中；已接入设置入口和 Agent Tools 闭环，完整协议与生产验收尚未交付 |
| 当前任务 | MCP-038：会话 MCP 准备失败隔离与 Tool 状态展示 |
| 当前任务状态 | 单服务器连接或目录发现失败的 Run 降级、会话失败状态与 MCP 图标已完成；MCP-038 完整账号来源和浏览器验收仍待完善 |
| 核心任务统计 | 共 44 项：已完成 17、进行中 10、待开始 17、阻塞 0 |
| 扩展任务统计 | 共 3 项，均待规划，不计入核心完成率 |
| 当前产出 | 设置 → MCP 服务器；全局连接、静态凭据、Switch 启停、测试与能力详情；Run 工具冻结、逐次审批、调用与来源快照；单服务器准备失败不再中断对话 |
| 下一任务 | 补齐工具级选择/授权、完整结果与恢复，再推进 OAuth、资源/模板及其 UI |
| 已知阻塞 | 无；真实服务器、凭据及运行环境在联调阶段逐项记录，不提前标为阻塞 |
| 功能完成判断 | 未完成；本次已交付 Tools 基础闭环，仍不能代表完整 MCP Client + Host 生产验收 |

状态定义：

- **待开始**：尚未执行；有前置依赖不等于阻塞。
- **进行中**：正在执行的具体任务，记录已完成部分、下一动作和剩余验收。
- **阻塞**：已执行但有具体障碍，记录原因、解除条件及可继续的独立工作。
- **已完成**：交付物存在，验收证据符合本项范围；仅有代码、设计或未执行的验证命令不能代表功能已验证。
- **待规划**：仅用于可选扩展，尚未纳入核心实施承诺。

更新规则：开始工作先更新当前任务；完成一项时同时更新任务行、顶部统计、当前/下一任务与执行记录。没有活动实现任务时明确写“无进行中的实现任务”，不要为显示进度而把下一项标为进行中。中断后先核实文件与运行状态，不依据上一次文字声明推断任务完成。

## 3. 基线与依据

### 3.1 当前项目证据

初始基线（2026-09-10 开始实施前）：未发现 MCP 业务实现或直接 MCP SDK 依赖。当前 SDK 与后续能力进度以任务台账为准。可复用入口如下。

| 入口 | 已有能力 | MCP 所需改造 |
|---|---|---|
| [AgentManager](../packages/agent-runtime/src/agent-manager.ts) | 创建 Session Agent 时组装工具 | 每次 Run 开始前准备 MCP 工具，避免仅首次创建时生效 |
| [RunCoordinator](../packages/agent-runtime/src/run-coordinator.ts) | before/after tool、审批后复查、Run 状态 | 注入工具快照、MCP 权限与人工交互，处理配置撤销 |
| [ToolRegistry](../packages/tools/src/lib/tool-registry.ts) | 来源、策略、schema、执行模式、超时 | 接收外部注册项；动态 schema 的有界校验与来源元数据 |
| [ToolExecutionGuard](../packages/tools/src/tool-execution-guard.ts) | 并发上限、超时、重复副作用保护 | 嵌套参数稳定指纹，明确请求幂等和循环检测的差异 |
| [ToolPolicy](../packages/policy/src/tool-policy.ts) | allow/ask/deny、路径与命令策略 | 外部调用分类、授权范围、撤销及 Plan 模式限制 |
| [HarnessEvent](../packages/agent-runtime/src/harness-event.ts) | Run 工具快照、调用与人工交互事件 | MCP 来源、资源与模板上下文、未知结果等可恢复语义 |
| [HumanInteractionService](../apps/daemon/src/services/human-interaction-service.ts) | 人工输入与审批服务 | 承接 Elicitation，不新增平行的人工交互系统 |
| [SkillCredentialStore](../apps/daemon/src/storage/skill-credential-store.ts) | 私有凭据存储与原子写入模式 | 复用存储原则，MCP 独立命名空间，不挪用 Skill Token |

### 3.2 协议基线

本次核对官方 latest 指向 `2026-07-28`。目标主版本采用该规范；兼容矩阵覆盖 `2025-11-25`、`2025-06-18`、`2025-03-26`，HTTP+SSE 场景额外验证 `2024-11-05`。不承诺兼容任意自定义方言。

新版使用每请求版本/能力元数据和 `server/discover`；旧版仍按其 initialize 生命周期处理。新版订阅使用 `subscriptions/listen`，人工输入走 MRTR；旧版由 SDK 协调反向请求。业务层不得混用不同版本的请求规则。[规范变更](https://modelcontextprotocol.io/specification/2026-07-28/changelog)

已在 MCP-004 锁定官方 `@modelcontextprotocol/client@2.0.0`，实际安装、导出和 Node 24.19.0 下编译/内存协议探测通过；优先使用 SDK 的自动版本协商，不能只修改版本字符串。所有第三方版本进入 pnpm Catalog，SDK 仅加入 daemon 的运行时依赖。对旧版 transport 的回退必须依据协议探测结果，认证失败、网络拒绝和未知异常不能触发无限回退。

官方依据：

- [MCP Specification](https://modelcontextprotocol.io/specification/2026-07-28)
- [Architecture](https://modelcontextprotocol.io/specification/2026-07-28/architecture)
- [TypeScript SDK](https://github.com/modelcontextprotocol/typescript-sdk)
- [SDK Protocol Versions](https://ts.sdk.modelcontextprotocol.io/v2/protocol-versions.html)
- [Tools](https://modelcontextprotocol.io/specification/2026-07-28/server/tools)
- [Resources](https://modelcontextprotocol.io/specification/2026-07-28/server/resources)
- [Prompts](https://modelcontextprotocol.io/specification/2026-07-28/server/prompts)
- [Streamable HTTP](https://modelcontextprotocol.io/specification/2026-07-28/basic/transports/streamable-http)
- [Authorization](https://modelcontextprotocol.io/specification/2026-07-28/basic/authorization)
- [MRTR](https://modelcontextprotocol.io/specification/2026-07-28/basic/patterns/mrtr)

实施时以已安装 SDK 和对应版本规范为准；发现差异先更新本节、受影响任务和验证矩阵，不静默缩小支持范围。

## 4. 模块与运行架构

```text
React Web（配置、资源/模板选择、授权、调用展示）
  └─ 项目 HTTP API / HarnessEvent SSE
      └─ Fastify daemon（Host 组装根）
          ├─ MCP Service：全局配置、授权、管理流程
          ├─ MCP Runtime：Client、transport、发现、缓存、订阅
          ├─ MCP OAuth：SDK provider、浏览器跳转、刷新与撤销
          ├─ SQLite repositories / MCP Credential Store
          └─ Agent Runtime
              └─ 现有 ToolRegistry + MCP Tool Adapter
                  └─ Policy / Approval / Execution Guard
                      └─ MCP Runtime → 外部 MCP Server
```

建议新增目录在对应任务实际实现时创建：

| 所属位置 | 职责 |
|---|---|
| `apps/daemon/src/mcp` | SDK 适配、Client 实例与 transport、能力与订阅；业务辅助函数置于所属 utils |
| `apps/daemon/src/services` | MCP 全局配置、授权与管理应用服务 |
| `apps/daemon/src/routes`、`controllers`、`dto`、`vo` | 项目管理 API 与边界校验 |
| `apps/daemon/src/storage` | migrations、repositories、独立 MCP Credential Store |
| `packages/tools/src/mcp` | MCP 工具到 AgentTool/ToolRegistration 的转换和执行接口 |
| `packages/policy/src` | 服务器启动/连接和外部工具权限策略 |
| `packages/agent-runtime/src` | Run 前工具准备、快照、上下文与事件适配 |
| `apps/web/src/features/mcp` | 管理、资源和模板浏览等业务能力 |
| `packages/sandbox` | 实际引入隔离执行器时创建；不先建空包 |

SDK 类型和连接对象只在 daemon 内使用。tools 定义实际需要的执行契约，daemon 注入实现；runtime 通过现有工具链调用，不反向导入 daemon。使用者需要稳定的跨模块类型时由实际所有者公开最小接口，不建立无边界的 protocol/shared package。

Web 不访问本地文件、启动进程、保存 Token 或接触 SDK 原始事件。Prompt 片段放所属模块 prompts 目录，原始 MCP 元数据经过校验后才进入领域模型。

## 5. Client 能力设计

### 5.1 连接与协议

- 同一 Client 只对应一个服务器。初始隔离键为 session、server、配置版本与授权身份；管理页面探测连接单独管理，不与活动 Run 互相关闭。
- 按需创建、空闲释放、全局并发和进程数量有上限；daemon 关闭回收全部连接与子进程。请求取消优先按调用处理，必须强杀进程时只影响该实例并标记同实例受影响请求。
- 配置变更、禁用、注销和身份改变使旧 Client、工具缓存与授权失效；凭据刷新但身份不变不能误判为新账号。
- 逻辑连接状态建议为 disabled、disconnected、connecting、ready、reconnecting、auth_required、error、closing，用可辨识状态模型表达；认证状态单独建模，不把已认证等同于已连通。
- stdio 使用 command/args 和固定 cwd，不隐式启动 Shell，不完整继承 daemon 环境；stdout 专用协议，stderr 有界脱敏。SDK 探测可能启动额外进程，须确认其同样受启动授权与回收约束。
- HTTP 支持 JSON/SSE 两类响应、规范要求的 metadata/header、合法 `x-mcp-header` 参数映射、请求/订阅各自的取消与关闭。原始服务器 header 定义不能覆盖 Host 的认证或受保护 header。
- 只声明已实现的 capabilities。版本不支持、方法不支持和能力缺失须返回明确诊断。

### 5.2 Tools 与 schema

- 分页与自动聚合都有数量、总字节和时间上限；缓存按服务器、授权身份与配置隔离，并尊重适用版本的 TTL/cache scope。
- 工具别名稳定且满足 Provider 命名限制，保留 serverId、原始工具名、schema/描述指纹；重名、截断或字符替换后碰撞不得覆盖已有工具。
- 动态 JSON Schema 先按对应协议校验，再适配模型与 Pi。限制 schema 大小、深度、引用和组合复杂度；支持规范要求的本地引用，外部引用按规范与网络策略处理，不能默认联网加载任意 `$ref`。
- 原始 schema 与模型侧表达分离；最终发送参数按原始 schema 校验。转换不得放宽约束；不能可靠表达的工具须明确禁用并给出诊断，不把失败强制断言为合法类型。
- 每次 Run 前准备并固定工具快照。列表变更影响下一 Run；撤销、权限或定义变化即时阻止旧工具继续执行。执行前在可用的服务端版本能力范围内复查；不宣称本地快照能固定远端代码。
- text、image、audio、resource_link、embedded resource 和 structuredContent 均有显式转换/展示策略；模型不支持的内容保留可审计引用并反馈能力限制。校验 outputSchema，`isError` 映射为工具错误，限制二进制、像素、解析和输出大小。
- 不把远端返回的字段解释为内部 file.changed、审批结果或可执行指令。资源链接不自动变成本地文件读取。

### 5.3 Resources、Prompts 与 Completion

- Resources 覆盖列表、模板列表、读取、分页、变更订阅与取消；由用户选择或受控工具读取，经过权限与上下文预算后注入。
- URI 按服务器命名空间解析；MCP 的 file URI 不直接传给 daemon 文件工具。工具返回的资源链接允许不出现在资源列表中，但读取仍需检查来源、权限与大小。
- 已注入 Run 的资源内容使用确定快照，后续资源更新不得悄悄改写历史。重新读取保留来源与版本/时间，失败时不把旧缓存伪装为最新数据。
- Prompts 覆盖列表、参数、获取、内容预览和用户确认后应用；消息角色和多模态内容按协议检查。服务器 Prompt 不获得 System Prompt 权限，不覆盖 Host 安全指令。
- Completion 覆盖资源模板和 Prompt 参数补全，带上下文、取消、去抖和输出上限；参数信息不跨服务器泄露。

### 5.4 Elicitation 与旧版客户端能力

- Form 与 URL Elicitation 都接入现有 Human Interaction 服务，关联原始调用；支持接受、拒绝、取消、超时和并发交互排队。
- MRTR 有总时限、轮数和状态大小上限；requestState 作为不透明状态原样传回，不解释为内部状态，不放入模型上下文。
- 敏感凭据不通过普通表单或模型收集；URL 交互校验目标与来源，避免任意弹窗和跳转，结果按对应协议继续原调用。
- 为兼容旧服务器实现可控 Roots、Sampling、Logging：Roots 仅公布已授权 workspace，不能作为沙箱；Sampling 有独立同意、模型选择、预算、取消与递归限制，默认不向服务器暴露整个会话或其他服务器上下文；Logging 分版本处理并脱敏限量。
- 旧能力仅在兼容配置明确启用后声明；旧版 ping、初始化、会话、订阅与恢复行为由对应 SDK 模式处理，不发送已从新版移除的消息。

## 6. Host、安全与执行设计

### 6.1 授权边界

服务器启动/连接、账号 OAuth 和具体工具执行是三个独立授权对象。添加配置不代表允许执行，测试 stdio 连接也属于运行程序。用户明确批准的启动配置可以复用，但命令、工作目录、环境或程序身份变化必须重新检查。

所有外部调用继续经过项目 Policy：未分类默认 ask 且串行；仅可信分类或用户授权的只读调用可自动执行和并行。服务端 annotations 只是提示，不能成为可信权限。Plan 模式只开放已确认的只读能力。

已有 auto_approve/full_access 保持原定义，不静默扩张为任意远程副作用权限。MCP 授权规则单独支持允许一次、限定工具/账号/workspace 的持久授权和拒绝。授权指纹覆盖服务器身份、配置版本、工具定义、递归规范化参数与范围；批准后再次复查。用户可以立即撤销，过期或变化不得沿用旧批准。

同一 Run 内副作用串行，跨 Session 对同一共享目标由服务端版本条件或 Host 可识别的互斥约束处理。协议未提供事务、ETag 或回滚能力时如实显示限制，不声称通用 MCP 能提供文件工具同等的冲突检测与撤销。

### 6.2 网络、凭据与进程

- 远程默认 HTTPS；回环或企业私网按精确地址单独授权。网络保护覆盖连接、重定向、OAuth discovery/token 端点、资源与图标读取，并防止 DNS rebinding 和云元数据访问。
- 凭据只注入匹配服务，不跨 origin 转发；复用/提取现有地址校验能力，MCP transport 不通过面向网页正文的 web_fetch 工具转发。
- OAuth 采用 SDK 支持的发现、PKCE、state、issuer/resource 绑定与凭据存储接口；预注册/CIMD 为主，DCR 兼容旧服务器。刷新串行，身份或 issuer 变化使旧授权失效，注销清理缓存和连接。
- 凭据位于独立 MCP Credential Store；SQLite 只存非敏感配置和引用。手动录入值只能经写入接口提交一次，不返回明文或放浏览器持久存储。私有文件权限不等于加密，存储级别应如实说明。
- trusted/guarded 本机执行和 isolated 执行明确区分。完整交付包含隔离执行器：受控挂载 workspace、保护 daemon 数据、网络限制、资源限制和进程树回收。平台不具备对应隔离能力时必须明确失败或经用户选择受信模式，不能默默降级后声称已隔离。
- 支持平台及其隔离机制在 MCP-036 固定并逐项验收；未验证的平台不得宣称支持。

### 6.3 上下文与内容安全

从已授权的服务器/工具中选择模型可见集合；工具定义也计入预算。先使用现有选择入口和有界筛选，必要时增加按需发现，不直接注入所有服务器的全部 schemas。

工具描述、服务器 instructions、资源和模板均视为外部内容并标识来源；不提升到 Host 权限，不自动将一个服务的数据发给另一个服务。用户选择的资源、模板和工具集能在 Trace 中追溯。

## 7. 存储、事件与失败恢复

### 7.1 数据所有权

| 数据 | 存储方式 |
|---|---|
| MCP 服务器非敏感配置、版本 | SQLite `mcp_servers` |
| 全局启用状态 | SQLite `mcp_servers.enabled`；015 migration 移除旧项目绑定，保留服务器、启用状态、信任和凭据 |
| 工具开关与可信权限分类 | SQLite `mcp_tool_settings` |
| 持久授权范围、指纹与有效期 | SQLite `mcp_grants` |
| Token、敏感 header/env、OAuth 注册凭据 | 独立 MCP Credential Store，按服务及 issuer/账号隔离 |
| Client、PID、活动请求、临时交互和订阅 | daemon 内存，由生命周期管理器回收 |
| 调用、审批、确定结果、未知结果、上下文来源 | Session JSONL 的 HarnessEvent |
| 列表与资源缓存 | 初期内存；持久化缓存只能为可重建派生数据 |

表通过显式 migration 建立，schema 与 repository 放 daemon。不会创建 tools/calls/messages 的 SQLite 事实副本。配置版本用于并发更新检查，删除先禁用、终止使用并清理凭据，失败保留可重试状态。

### 7.2 事件与审计

复用 tool.*、approval.*、input.* 和 Run 工具快照，增加经过校验的 MCP 来源与版本字段；确有新恢复语义时再增加项目事件。新增字段要兼容旧 JSONL，不泄露 SDK 内部对象。

调用关联包含 sessionId、runId、toolCallId、serverId；JSON-RPC requestId 是可变化的传输 ID，MRTR 多轮不得拆成多次独立用户工具调用。工具进度映射为 tool.updated，仅 SSE；请求日志有界脱敏，不持久化每条协议消息。

副作用请求发出前先持久化执行意图；恢复时没有确定结果的请求按未知处理，不等于失败且可重试。JSONL 中保留经过脱敏与限长处理的最终模型结果；大内容以受控附件或引用保存，不能持久化任意无限原始载荷。

### 7.3 取消、重试与恢复

| 情形 | 必须行为 |
|---|---|
| 列表发现失败 | 有界重试，明确不可用原因 |
| 已确认只读的请求失败 | 按策略有限重试，并保留关联 |
| 副作用请求发送后断线/崩溃 | 标记执行结果未知，禁止自动重放；仅服务端明确提供幂等/查询契约时进行受控恢复 |
| 浏览器项目 SSE 断开 | Agent 与 MCP 调用继续 |
| 用户停止 Run | 取消对应请求和等待交互，不声称外部副作用已撤销 |
| 服务被禁用或账号撤销 | 阻止新请求，取消/收敛现有请求，并记录最终或未知结果 |
| daemon 重启 | 恢复配置和会话事实，按需重建连接，不重放历史工具调用 |
| 订阅断线 | 重建订阅并刷新快照；使用对应协议允许的机制，不套用项目 SSE 的 seq 到 MCP |

普通 JSON HTTP 请求和 SSE 请求的中止按对应版本/transport 处理；不假定断开客户端就能回滚或保证服务器立即停止。未知状态必须在 UI、错误和后续模型上下文中保持一致。

## 8. 管理 API 与界面

以下是拟定资源边界，最终 DTO/VO 在对应任务中落地；所有状态变更继续使用项目 Host/Origin、同源和自定义请求头保护。

| API 资源 | 行为 |
|---|---|
| `/api/mcp-servers`、`/:serverId` | 列出、创建、详情、更新、禁用和删除 |
| `/api/mcp-servers/:serverId/connections` | 建立/关闭管理连接，读取脱敏状态 |
| `/api/mcp-servers/:serverId/connection-tests` | 有界发现与连通性检查；启动进程仍需授权 |
| `/api/mcp-servers/:serverId/credentials` | 写入/移除凭据；不提供明文读取 |
| `/api/mcp-servers/:serverId/authorizations` | 启动、取消 OAuth；受校验的 callback 回到 daemon |
| `/api/mcp-servers/:serverId/tools` | 列举及工具开关、授权设置 |
| `/api/mcp-servers/:serverId/resources` | 资源/模板列表，受控读取与上下文选择 |
| `/api/mcp-servers/:serverId/prompts` | 模板列表、参数与预览 |
| `/api/mcp-servers/:serverId/completions` | 有界参数补全 |
| 现有人工交互 API | 审批与 Elicitation，避免另造输入队列 |

资源读取和 Prompt 预览同样经过权限与限额。若提供手动工具调用诊断，必须创建可审计的执行上下文并复用 Policy，不能用通用 RPC 透传接口绕过审批。

界面交付包括：服务器配置/导入预览与脱敏导出、启停与诊断、账号授权、工具范围和权限、资源浏览与选择、Prompt 参数和预览、Elicitation 表单/URL 交互、会话调用与错误、Trace 来源与耗时。导入配置只创建待启用记录，不自动安装依赖、运行命令或信任服务器。

复用现有设置页、审批卡、人工输入、工具结果和 Trace；具体实现前阅读项目 Web 三项 Skill。基础组件使用 HeroUI，业务状态过渡遵循 Motion 与 reduced-motion 约定。服务端数据只放 TanStack Query，跨组件纯 UI 状态才放 Zustand；跨 feature 通过公开入口复用。

## 9. 全部核心任务

依赖编号表示前置交付，不授权启动子智能体或并行 agent。执行仍遵循用户的单智能体约定。

### A. 目标与架构

| ID | 任务及交付物 | 依赖 | 状态 | 完成证据 / 验收要求 |
|---|---|---|---|---|
| MCP-001 | 核对规范、代码入口和现有实现基线 | 无 | 已完成 | 2026-09-10 官方 latest/变更核对；第 3 节记录实际代码与依赖检查 |
| MCP-002 | 完整目标、方案、任务与验收标准落档 | MCP-001 | 已完成 | 本文；44 项编号连续且依赖有效，关联文档的 16 项本地引用存在，Markdown 围栏与状态检查通过 |
| MCP-003 | 同步架构文档、工程约定与包职责 | MCP-002 | 已完成 | [架构设计](./架构设计.md)、[AGENTS.md](../AGENTS.md)、[包功能划分](../packages/包功能划分.md) 已说明新增 MCP 阶段和未实现状态 |

### B. Client 基础与管理

| ID | 任务及交付物 | 依赖 | 状态 | 完成证据 / 验收要求 |
|---|---|---|---|---|
| MCP-004 | 官方 Client SDK 选型、Catalog 安装及兼容探测 | MCP-003 | 已完成 | 官方 Client 2.0.0、Catalog/锁文件、Node 24.19.0；内存传输 17 项协商/schema/输出/取消断言及 daemon 类型检查通过 |
| MCP-005 | daemon MCP 领域类型、配置 DTO/VO 与错误模型 | MCP-004 | 已完成 | 配置 TypeBox DTO/VO、transport 联合、私有凭据 schema、安全错误已实现；Node 24 配置与存储联合探测通过 |
| MCP-006 | 全局配置 migration 与 repository | MCP-005 | 已完成 | 014/015 migration 与 MCP repository 已接入数据库；015 移除项目绑定且保留配置/启用/信任；全局升级、CAS 与凭据存储 35 项探测通过 |
| MCP-007 | MCP Credential Store 与凭据引用 | MCP-005 | 已完成 | 独立 Credential Store 已实现；串行修改、权限/符号链接/损坏拒绝、失败后重试及内存磁盘一致性探测通过 |
| MCP-008 | 服务器启动/连接 Policy 与信任记录 | MCP-005 | 已完成 | Policy 与 service 实现禁用/信任/隔离检查；变更及凭据替换撤销信任；22 项生命周期联合探测通过 |
| MCP-009 | Client 生命周期、隔离键、限额与关闭管理 | MCP-006, MCP-007, MCP-008 | 已完成 | 32 实例上限、60 秒空闲释放；22 项探测覆盖租约复用/Session 隔离、管理连接定向回收、全局撤销、迟到连接中止和幂等关闭；类型检查通过 |
| MCP-010 | stdio transport 与受控进程执行 | MCP-009 | 已完成 | 14 项真实子进程探测通过：环境隔离、严格 stdout、消息/stderr 限额、启动失败、父子进程组回收；当前仅 trusted/POSIX，OS 沙箱仍由 036 验收 |
| MCP-011 | 网络安全边界与受限请求实现 | MCP-008 | 已完成 | 共享地址分类、DNS 固定、私网显式授权、受保护端口、跳转检查、跨源凭据剥离、有界 fetch；42 项网络/协议探测通过；OAuth 业务在 025 使用该边界 |
| MCP-012 | Streamable HTTP transport | MCP-009, MCP-011 | 已完成 | SDK HTTP + 受限 fetch；JSON/SSE、请求中止、响应限额、独立订阅超时；42 项本地联合探测通过，第三方服务验收仍属 042 |
| MCP-013 | 新旧版本协商与 HTTP+SSE 兼容 | MCP-010, MCP-012 | 已完成 | 2026-07-28、三个 2025 版本和 HTTP+SSE 2024-11-05 在有界 fixture 验证通过；使用 SDK 自动协商，不改写版本号 |
| MCP-014 | capability 发现、分页、缓存、目录订阅管理 | MCP-013 | 已完成 | Client 独享目录、30 秒 TTL、16 页上限、数量/大小限额；12 项新旧目录通知/缓存失效/重新订阅探测通过；具体资源 URI 订阅留在 027 实现 |
| MCP-015 | 服务器管理、配置导入/脱敏导出与诊断 API | MCP-006, MCP-007, MCP-014 | 已完成 | 13 个全局管理操作注册到 daemon；24 项 API/目录/脱敏断言（包含无项目测试、临时目录清理及旧绑定路由 404）与 3 项真实 daemon 装配/Host 校验通过；导入禁用且不执行，诊断只读取目录 |

### C. Tools 与 Agent 闭环

| ID | 任务及交付物 | 依赖 | 状态 | 完成证据 / 验收要求 |
|---|---|---|---|---|
| MCP-016 | 动态 schema 校验与 Provider/Pi 兼容适配 | MCP-004, MCP-014 | 进行中 | 已接入 TypeBox/Pi 与 SDK AJV 双重校验和 outputSchema 校验；安全正则/复杂度/局部引用约束有效；实际 Provider 多协议兼容矩阵待验收 |
| MCP-017 | 工具稳定别名、来源与 ToolRegistration 适配 | MCP-016 | 已完成 | McpToolService 构造 ToolRegistration；别名精确映射、配置版本/定义 hash 来源、模型快照与调用显示名；临时 Host 探测及 JSONL 恢复通过 |
| MCP-018 | 每次 Run 工具准备、选择、预算与冻结 | MCP-017 | 进行中 | 每 Run 准备/冻结/释放，64 工具及 512 KiB 定义预算；同 Session 下一轮移除已撤销工具已验证；工具级选择和 Provider 预算适配待完成 |
| MCP-019 | MCP 工具 Policy、持久授权和 Plan 限制 | MCP-008, MCP-017 | 进行中 | EXTERNAL Policy 独立于 full_access，三种本地策略均逐次审批；Plan 未确认与用户拒绝不发调用已验证；可信分类及持久授权待实现 |
| MCP-020 | 执行 guard、嵌套参数指纹和批准后复查 | MCP-018, MCP-019 | 已完成 | 嵌套参数和配置/身份/定义指纹绑定既有 guard；审批前、批准后、发送前重查全局信任/schema/目录；审批期间定义变更被实际 Agent Loop 拦截 |
| MCP-021 | 多模态/结构化结果、资源引用与 tool error 适配 | MCP-016, MCP-017 | 进行中 | 文本、结构化数据、嵌入文本资源和资源引用有界转换，已保存凭据脱敏；isError 正确失败；二进制/图片/音频明确未展开，完整多模态仍待实现 |
| MCP-022 | MCP 进度、来源、快照与审计事件 | MCP-020, MCP-021 | 进行中 | run.started 保存 source/displayName，tool.started 关联来源，结果保留服务/工具/版本/hash；JSONL 恢复已验证；完整 progress 和请求级审计待补 |
| MCP-023 | 中止、超时、未知结果与副作用恢复 | MCP-020, MCP-022 | 进行中 | 工具调用支持 abort/timeout；调用后异常标记 MCP_RESULT_UNKNOWN，不重试；需补齐写前发送意图、进程崩溃后的未知结果投影及矩阵验收 |
| MCP-024 | 运行中禁用、配置变更与账号撤销 | MCP-018, MCP-019, MCP-023 | 进行中 | 复用 Client 失效与执行前复查；跨项目共用配置但 Client 隔离、全局撤销后两个项目旧工具均失败、下一轮移除已验证；活动调用/审批/账号变更并发矩阵待补 |

### D. 完整协议能力与认证

| ID | 任务及交付物 | 依赖 | 状态 | 完成证据 / 验收要求 |
|---|---|---|---|---|
| MCP-025 | OAuth discovery、注册与授权回调 | MCP-007, MCP-011, MCP-013 | 待开始 | PKCE/state/issuer/resource、预注册/CIMD 和 DCR 兼容、取消/过期验证 |
| MCP-026 | Token 刷新、账号隔离、注销与认证诊断 | MCP-025, MCP-024 | 待开始 | 并发刷新、scope 变化、issuer 变更及清理失败均正确处理 |
| MCP-027 | Resources 列表、模板、读取与订阅 | MCP-014, MCP-019, MCP-022 | 待开始 | URI 隔离、分页、二进制/大小限制、变更和取消，读取不绕过 Policy |
| MCP-028 | Prompts 列表、参数、获取与消息转换 | MCP-014, MCP-021, MCP-022 | 待开始 | 模板参数验证、多模态、权限与来源，无 System 权限提升 |
| MCP-029 | Completion 及资源/模板参数补全 | MCP-027, MCP-028 | 待开始 | 两类补全、上下文、取消、限额和跨服务隔离验证 |
| MCP-030 | Resources/Prompts 注入与快照恢复 | MCP-018, MCP-027, MCP-028 | 待开始 | 选择后注入、预算、来源、更新与会话恢复确定性，无隐式全量注入 |
| MCP-031 | MRTR 与 Form/URL Elicitation | MCP-023, MCP-025 | 待开始 | 复用 HITL；多轮、接受/拒绝/取消、敏感信息限制、关联与过期验证 |
| MCP-032 | Roots 兼容 | MCP-013, MCP-019 | 待开始 | 仅授权根目录、旧版变更通知和新版兼容规则；不当作沙箱 |
| MCP-033 | Sampling 兼容 | MCP-013, MCP-019, MCP-031 | 待开始 | 用户控制、Provider 能力、模型调用预算、工具采样适用特性、递归与取消 |
| MCP-034 | Logging、请求进度与旧版实用能力兼容 | MCP-013, MCP-022 | 待开始 | 日志级别、脱敏限额、适用 ping/通知规则和错误映射 |

### E. Host 完整产品交付

| ID | 任务及交付物 | 依赖 | 状态 | 完成证据 / 验收要求 |
|---|---|---|---|---|
| MCP-035 | 资源/元数据安全与上下文来源隔离 | MCP-021, MCP-030, MCP-031 | 待开始 | 恶意 instructions/URI/图标/结果无法提升权限或伪造内部事件 |
| MCP-036 | 本机 MCP 隔离执行器与平台支持矩阵 | MCP-010, MCP-011, MCP-023 | 待开始 | workspace 挂载、凭据目录保护、程序身份及启动范围复查、进程树、网络/资源限制；不支持的平台明确失败 |
| MCP-037 | MCP 设置管理 UI | MCP-015, MCP-024, MCP-026 | 进行中 | 已有全局设置入口、新增弹窗表单/JSON Tab、标准 `mcpServers` 原子导入、编辑、静态凭据、连接、撤销信任和删除；列表以尾部 Switch 启停并分页展示，不加载能力目录，点击进入详情后才查看工具入参/出参 Schema、资源与模板、提示词参数、服务端说明及能力声明；目录结果、取消信号和启停更新按服务器隔离；品牌图标和重名后缀已实现；OAuth、工具权限与完整管理流程验收待补 |
| MCP-038 | 会话工具范围、调用结果与审批 UI | MCP-022, MCP-023, MCP-037 | 进行中 | 复用会话 Tool/审批卡，新增服务器/工具显示名、结果未知提示；单服务器连接或目录发现失败通过 `tool.started → tool.failed` 展示并继续 Run，MCP 状态统一使用 LobeHub MCP 图标；完整账号来源及登录后浏览器验收待补 |
| MCP-039 | Resources、Prompts 与 Completion UI | MCP-029, MCP-030, MCP-037 | 待开始 | 浏览、填写、预览、明确应用及移除、异步失败和取消 |
| MCP-040 | Elicitation 与 Sampling 人工交互 UI | MCP-031, MCP-033, MCP-038 | 待开始 | 并发问题、Form/URL、接受/拒绝/取消、来源与请求范围清楚 |
| MCP-041 | Trace、诊断、恢复与 MCP 使用文档 | MCP-034, MCP-035, MCP-036, MCP-038, MCP-039, MCP-040 | 进行中 | 新增 mcp-usage.md，记录连接入口、权限、故障排查和当前限制；完整 Trace、恢复诊断仍待后续协议任务 |

### F. 验收与收尾

| ID | 任务及交付物 | 依赖 | 状态 | 完成证据 / 验收要求 |
|---|---|---|---|---|
| MCP-042 | 协议、真实服务与功能矩阵联调 | MCP-041 | 待开始 | 第 10 节功能/版本矩阵逐项记录实际环境、步骤和结果，不用单服务器演示代替 |
| MCP-043 | 安全、隔离、并发、恢复与回归验证 | MCP-042 | 待开始 | 恶意服务、断网/重启/撤销、跨 Session、旧功能回归；失败项修复后复验 |
| MCP-044 | 完成审计、文档同步与最终交付 | MCP-043 | 待开始 | 001–043 均有充分证据，核心验收全通过，剩余扩展与平台限制明确 |

## 10. 验收矩阵与验证约定

### 10.1 核心验收矩阵

| 验收项 | 对应任务 | 必须取得的证据 | 当前状态 |
|---|---|---|---|
| stdio / HTTP / 旧 SSE 与各目标协议版本 | 010–014, 042 | 对应服务器版本、握手/调用结果、回退失败路径 | 未执行 |
| Tools 参数、输出与多模态 | 016–023, 042 | 有效/非法/复杂 schema、碰撞、isError、超限和取消记录 | 未执行 |
| Resources、模板、订阅和上下文 | 027, 029–030, 039 | 快照、权限、变更、读取和恢复记录 | 未执行 |
| Prompts、补全与用户应用 | 028–030, 039 | 参数/角色/多模态检查、预览和实际模型上下文 | 未执行 |
| OAuth 与静态凭据 | 007, 025–026 | discovery、登录、刷新、撤销、issuer/resource 和错误路径 | 未执行 |
| Elicitation / MRTR | 031, 040 | 接受/拒绝/取消、多轮、并发、超时与 URL 交互 | 未执行 |
| Roots / Sampling / Logging 兼容 | 032–034, 040 | 显式开关、版本行为、预算、递归和脱敏记录 | 未执行 |
| Policy、Plan、授权撤销 | 019–020, 024 | annotations 不越权、批准后变化被拦截、三种策略边界 | 未执行 |
| 进程与网络隔离 | 011, 035–036, 043 | 路径/凭据目录越界、DNS/重定向、资源耗尽、子进程回收 | 未执行 |
| 跨 Session 并发与未知结果 | 009, 020, 023, 043 | 停止单 Session、断线/崩溃、重启不重放、外部结果未知 | 未执行 |
| Host UI 与 Trace | 037–041 | loading/empty/ready/error/awaiting-input/aborted/unknown、键盘及 reduced-motion 检查 | 未执行 |
| 现有功能回归 | 043 | 内置工具、Skill、Provider、审批、JSONL/SSE、会话恢复仍有效 | 未执行 |
| 文档与实际交付一致 | 044 | 任务证据、支持矩阵、配置样例与诊断说明复核 | 未执行 |

### 10.2 验证执行约定

- 优先类型检查、受影响文件静态检查和已有验证入口。按项目要求，不自动新增测试文件；增加持久测试文件须有用户明确要求。
- 不自动执行 dev/build/Git 命令。需要运行服务时先检查用户已有实例，所需启动授权或外部条件如实记录，不能写成已验证。
- 真实服务联调记录服务器名/版本、transport、协议版本、SDK 版本、操作步骤、预期/实际结果与脱敏证据位置。可用 MCP Inspector 辅助，不能替代 Host 端到端验收。
- 真实账号、模型 Sampling、写入操作和费用在已授权范围内验证；缺少条件记录为未验证或具体阻塞，不能用 mock 成功声称真实服务通过。
- 临时验证工具与 fixture 仅用于有界验证，不发布新的业务 MCP Server。平台隔离、外部副作用和网络失败必须有相应范围的证据。
- 验证失败关联到原任务，修复后再执行受影响检查。只有方案、文件存在、类型通过或一个演示成功，都不足以关闭完整功能任务。

## 11. 可选扩展台账

| ID | 扩展 | 目标与范围约束 | 状态 |
|---|---|---|---|
| EXT-001 | Tasks | 独立异步任务句柄、进度/输入/取消和恢复；与核心调用结果未知机制协调，按官方扩展单独设计和验收 | 待规划 |
| EXT-002 | MCP Apps | 不可信交互 UI 隔离、资源载入、消息桥与权限；不能在主应用直接执行服务器 HTML/JS | 待规划 |
| EXT-003 | Skills over MCP | 动态 Skill 发现/读取与现有 Skill Registry 集成；加载内容不授予工具执行权 | 待规划 |

扩展来源见 [官方扩展入口](https://modelcontextprotocol.io/extensions/overview)。此台账表示可见的后续范围，不代表当前核心功能允许缺项。

## 12. 当前任务记录与变更日志

### 当前任务执行记录

- 本轮修正已完成：MCP 全局共用（含迁移/API/运行时）、添加弹窗 HeroUI 结构，以及表单/JSON Tab 与标准 `mcpServers` 原子导入。MCP-037 仍有导入预览、OAuth、工具权限等剩余工作，任务总体状态保持进行中。
- MCP 列表已改为 Switch 启停与能力数量摘要；详情展示测试发现的完整目录和服务元数据，响应在进入 Web 前递归移除已知凭据。当前只支持静态请求头与 stdio 环境变量鉴权，OAuth 仍由 MCP-025/026 跟踪。
- MCP 列表不展示能力摘要，也不在打开列表时连接服务器；列表每页渲染 25 台。进入详情后才加载工具、资源、提示词与服务端元数据的完整目录，避免大量服务器同时连接或把全部 Schema 装入列表响应和浏览器内存。
- 已完成：MCP-004 至 MCP-015 的 SDK、存储、连接策略、生命周期、传输、目录和管理 API 基础。
- 当前代码已把 MCP 工具加入 Agent；设置入口为「MCP 服务器」。实际 Agent Loop + 模拟 MCP 服务验证通过；登录后已验证全局入口与添加表单，完整管理流程和第三方服务尚未验收，不能声称完整生产交付。
- 受控 stdio 当前支持 POSIX trusted 模式；isolated 模式与 Windows 明确失败。程序身份的持久授权复查及完整 OS 隔离仍由 036 完成。
- schema 当前保留原始约束，只接受同步校验可安全处理的正则、文档内引用和限定复杂度；动态递归/复杂正则明确报不兼容，不能把这个阶段结果等同于最终 Provider 兼容。
- 后续顺序：工具级选择与授权 → 多模态/审计/恢复 → OAuth 与完整协议及 UI → 第三方服务和生产验收。
- 工作区依赖检查发现 pi-ai 已是 0.85.1，而 Agent Core 仍引用 0.82.1 类型；已将 Core 对齐到 0.85.1，保留现有 pi-ai 升级。tools 类型检查排除 Skill references 模板，未给运行包添加示例项目依赖。
- 会话准备现在按服务器隔离预期内的 MCP 错误：失败服务器释放租约并回滚其工具定义，通过现有 Tool 事件记录失败，其余服务器和对话继续；未吞掉未知程序错误或用户中止。

### 基础阶段验证记录（历史）

全部使用 Node 24.19.0。临时 fixture/探测位于 `/private/tmp/pi-harness-mcp-*-probe.mjs`，不作为新增持久测试文件发布；真实第三方服务验收另行记录。

| 探测 | 断言数 | 覆盖范围 |
|---|---:|---|
| SDK | 17 | 新旧协商、schema、输出校验、中止 |
| 配置与存储 | 31 | migration 升级、CAS、原子绑定、凭据失败恢复、权限/符号链接/损坏拒绝 |
| 生命周期 | 22 | Session 隔离、租约、定向解绑、配置/凭据撤销、迟到连接、shutdown |
| stdio | 14 | 真实子进程、受控环境、严格 stdout、限额、启动失败、进程组回收 |
| HTTP/SSE | 42 | 新旧版本、JSON/SSE、DNS 固定、私网/元数据阻断、重定向/凭据隔离、限额、中止 |
| 管理 API | 21 | Origin、导入不执行、CAS、诊断、分页上限、缓存、脱敏导出 |
| 目录订阅 | 12 | 新版 listen、旧版通知、缓存失效、重新订阅、关闭 |
| 工具基础 | 15 | schema、局部引用、危险正则拒绝、别名、嵌套指纹 |
| daemon 装配 | 3 | 实际 createServer 装配、MCP 路由、Host 校验，无 dev/build 启动 |
| 容量与回收 | 43 | 连续失败不占用名额、32 Client 上限、60 秒空闲回收 |

此前基础阶段累计 220 项断言通过；本次新增 Host 闭环 42 项断言通过（临时 fixture，包含实际 Agent Loop、三种策略、拒绝/Plan、审批中定义变化、schema、结果脱敏、未知结果不重试、下一轮刷新、JSONL 恢复、定义凭据回显拒绝及 Bearer token 脱敏）。管理 API 的 21 项断言已复跑通过。工作区 `pnpm -r typecheck` 全部通过；本轮受影响文件 Biome 检查通过。未运行 dev/build/Git 命令。上述结果不能替代第 10 节尚未完成的生产验收。

### 全局化与弹窗修正验证（本轮）

| 验证 | 断言数 | 结果与覆盖 |
|---|---:|---|
| 管理 API | 24 | 无项目也可测试、版本冲突、旧绑定接口 404、测试目录回收、Origin/凭据脱敏 |
| Host 与 Agent Loop | 43 | 两个不同项目共用同一服务器、Client 隔离、全局撤销、逐次审批、未知结果与快照 |
| 配置与存储 | 35 | 014 → 015 升级、移除绑定表、保留服务器/启用/信任、重复打开、CAS 与凭据保护 |
| Client 生命周期 | 22 | 管理连接定向回收、会话隔离、全局撤销、中止与关闭 |
| daemon 装配 | 3 | 实际 createServer、API 注册与 Host 校验 |

本轮 127 项临时探测断言通过；全仓 TypeScript 与 16 个受影响源码文件 Biome 检查通过。Chrome 登录会话已验证全局设置、HTTP 弹窗截图、Switch 空格切换、本地命令切换、必填校验与关闭；未保存真实服务器配置或执行外部命令。新增 WEB-109 记录用户反馈。未运行 dev/build/Git 或创建持久测试文件。完整生产验收仍按第 10 节继续跟踪。

### 已接入的管理接口

- `/api/mcp-servers`：读取/创建；`/:serverId`：读取、CAS 更新、禁用后删除。
- `/:serverId/trust`：明确授予或撤销连接信任；`/:serverId/credentials`：写入/删除私有凭据，只返回脱敏状态。
- `/api/mcp-servers/import/preview` 与 `/import`：对外使用 `{mcpServers: {name: config}}`；继续兼容旧 `{version: 1, servers: [{name, config}]}` 输入，预览统一返回标准结构且不保存，导入原子创建禁用记录。
- `/:serverId/export`：使用标准 `mcpServers` 结构，只导出非敏感连接配置，不导出凭据、信任、PI Harness 安全默认值或持久工具授权。
- `/:serverId/tests`：只传入 `expectedRevision`；须先全局启用并信任，只执行连接与目录发现，不要求存在项目。测试使用独立 Client/临时目录，结束即回收。
- 旧 `/api/workspaces/:workspaceId/mcp-servers` 绑定接口已移除，返回 404。全部写操作继续遵循现有 Origin 与 `X-PI-Harness-Request: 1` 校验。

### 日志

| 日期 | 任务 | 变化 | 证据 |
|---|---|---|---|
| 2026-09-10 | MCP-001 | 已完成：核对官方规范与项目入口，确认 MCP 仍待实现 | 第 3 节；实际依赖与源文件检查 |
| 2026-09-10 | MCP-002 | 已完成：建立完整目标、能力设计、核心任务与扩展台账，并完成文档结构检查 | 本文第 1–11 节 |
| 2026-09-10 | MCP-003 | 已完成：同步架构、工程约定和包职责，明确文档完成与功能未开始 | 架构设计第 1/6/13 节、根 AGENTS.md、包功能划分 |
| 2026-09-10 | MCP-004 | 进行中：用户授权按完整文档开始生产级实施 | 依赖发布、安装与兼容核查进行中 |
| 2026-09-10 | MCP-004 | 已完成：Client 2.0.0、Catalog、锁文件；17 项内存协议断言和 daemon 类型检查通过 | Node 24.19.0；临时 SDK 探测输出 passed |
| 2026-09-10 | MCP-005 | 进行中：配置 DTO/VO、领域与错误边界 | 尚未接通业务 API |
| 2026-09-10 | MCP-005–007 | 已完成：配置、migration/repository、私有 Credential Store；31 项联合探测通过 | Node 24.19.0，临时存储探测 passed，Biome/类型检查 |
| 2026-09-10 | MCP-008 | 进行中：连接授权和生命周期接入 | 仍未接通工具执行 |

| 2026-09-10 | MCP-008–009 | 已完成：连接 Policy、配置/凭据撤销、Session 租约隔离与生命周期；22 项探测通过 | 临时生命周期探测 passed；类型/Biome 检查 |
| 2026-09-10 | MCP-010 | 进行中：受控 stdio 进程与协议收发 | SDK 默认环境合并及单进程关闭不足以满足项目约束，使用 SDK Transport 接口和解析器实现进程管理 |

| 2026-09-10 | MCP-010 | 已完成：受控 stdio，14 项真实进程断言通过 | SDK ReadBuffer 跳过非法 JSON，已改为严格分帧并保留 SDK 协议结构校验；异常输出回收已复验 |
| 2026-09-10 | MCP-011–013 | 进行中：网络 Policy、固定 DNS、限额 fetch 与 SDK HTTP/SSE | 临时本地 HTTP/SSE 联调中 |

| 2026-09-10 | MCP-011–013 | 已完成：42 项本地 HTTP/SSE 联合断言通过 | 新版 JSON/SSE、旧版 2025-11-25/06-18/03-26 与 SSE 2024-11-05；混合 DNS 拒绝、固定 IP、私网/保留地址、跨源凭据、限额与取消 |
| 2026-09-10 | MCP-014–015 | 进行中：目录发现、缓存与订阅；管理 API 已接入 | 21 项 API/分页上限/缓存隔离/脱敏探测通过；正在验证订阅 |

| 2026-09-10 | MCP-014–015 | 已完成：目录与管理 API 基础，订阅/缓存/API/daemon 装配验证通过 | 将具体资源 URI 订阅统一留在 027，014 负责目录订阅；最终范围不减少 |
| 2026-09-10 | MCP-016/017/020 | 进行中：schema、别名与嵌套参数指纹基础，15 项断言通过 | 尚未接入 Agent、权限与完整输出转换 |
| 2026-09-10 | 回归 | 修复失败连接名额释放、订阅超时及重连计数；依赖类型对齐，工作区类型检查通过 | 220 项累计断言；受影响文件 Biome 检查 |
| 2026-09-10 | MCP-016–024、037/038/041 | 接通设置与 Agent Tools 基础闭环；017/020 完成，其余按表继续完善 | Host 临时探测 42 项；真实 Agent Loop 和 JSONL；浏览器到达登录页，未执行账号授权或修改真实配置 |

| 2026-09-10 | MCP-006/009/015/020/024/037/041 | 本轮完成：全局共用 MCP，015 移除项目绑定；修正 HeroUI 添加弹窗；037 完整范围仍进行中 | 127 项临时探测、全仓类型检查、16 文件 Biome、登录后的 Chrome 表单与键盘验证；WEB-109 |
| 2026-09-10 | MCP-015/037/041 | 新增弹窗加入表单/JSON Tab；JSON 使用标准 `mcpServers` 结构并原子导入，预览与导出统一为同一结构；凭据继续独立保存 | Web/daemon 类型检查、受影响文件 Biome、标准 HTTP 与 stdio schema 探测；WEB-109 |
| 2026-09-10 | MCP-037 | 修正服务器列表状态串色：每项使用独立状态映射，并按条目绑定 HeroUI Chip 语义色变量 | 浏览器 DOM class、计算样式与视觉复验，Web 类型检查、Biome；WEB-109 |
| 2026-09-10 | MCP-038/041 | 单台服务器连接或目录发现失败改为 Tool 失败事件并继续 Run；MCP 工具与连接状态统一使用 LobeHub MCP 图标 | agent-runtime、daemon、Web 类型检查与受影响文件 Biome；WEB-110 |
| 2026-09-10 | MCP-015/037 | 服务器列表按名称或地址匹配常用 LobeHub 品牌图标，保留品牌原始颜色并以默认外观的 MCP 图标兜底；设置导航使用 muted 的 MCP 图标；新增、导入与改名遇到重名 key 时自动使用 `-2`、`-3` 后缀 | daemon/Web 类型检查、重名分配探测、浏览器视觉复验、Biome；WEB-109/110 |
| 2026-09-10 | MCP-014/037/041 | 服务器列表改为尾部 Switch 启停与能力数量摘要；新增能力详情，展示脱敏后的工具 Schema、资源/模板、提示词和服务端元数据；明确静态鉴权与 OAuth 边界 | daemon/Web 类型检查与受影响文件 Biome；WEB-109 |
| 2026-09-10 | MCP-014/037 | 打开服务器列表时自动并行发现全部已启用且受信任、凭据完整的服务器目录；手动测试和进入详情都不再作为列表摘要前置条件，详情复用结果并保留重新加载与取消入口 | Web 类型检查与受影响文件 Biome；WEB-109 |
| 2026-09-10 | MCP-014/037 | 能力摘要改为 SQLite 持久缓存；列表后台刷新限制为 5 台并发并优先当前页，每页渲染 25 台；详情按需加载完整定义，服务器上限调整为 1000 | daemon/Web 类型检查与受影响文件 Biome；WEB-109 |
| 2026-09-10 | MCP-014/037 | 按最终交互收敛：列表移除能力摘要和后台发现，只有进入详情才加载并展示完整目录；保留每页 25 台和 1000 台配置上限 | daemon/Web 类型检查与受影响文件 Biome；WEB-109 |
