# Sub Agent 核心设计与实现

对话入口见 [对话中的 Sub Agent](./对话Sub-Agent设计.md)，任务投影见 [任务看板](./任务看板与Sub-Agent设计.md)。

## 1. 身份与所有权

Sub Agent 已接入 Agent Runtime。它是当前 Session、顶层 Run 内的独立执行分支，使用自己的 `pi-agent-core Agent`，不创建新的 Session、顶层 Run 或 SQLite 子消息表。

```text
Session（固定 workspaceRoot、同一个 Session JSONL）
└── 顶层 Run（runId，同一 Session 只有一个活动 Run）
    ├── 父 Agent（AgentManager 中的 RunCoordinator）
    ├── 子 Agent A（executionId、parentToolCallId）
    │   └── 孙 Agent A.1（executionId、parentExecutionId）
    └── 子 Agent B（executionId、parentToolCallId）
```

`AgentManager` 持有 Session Runtime 与 daemon 总并发计数；`RunCoordinator` 在启用子 Agent 的 Run 中创建 `SubAgentTree`。执行树保存子 Agent、独立注册表、完成 Promise、直接子 ID、终态与结果是否已交付等进程内对象。Run 清理后不恢复这些对象，历史继续保存在 Session JSONL。

每次新委派生成 UUID `executionId`。同一直接父执行下，角色、模型、名称、任务都相同的活动委派返回已有 ID；并发启动中的相同请求也会合并。终态后再委派会创建新 ID。外部事件继续使用父 `sessionId`、根 `runId`；子工具执行通过 `executionId` 分区。嵌套关系由 `parentExecutionId` 保存，具体事件中的该字段按事件类型可选。

源码：[AgentManager](../packages/agent-runtime/src/agent-manager.ts)、[RunCoordinator](../packages/agent-runtime/src/run-coordinator.ts)、[SubAgentTree](../packages/agent-runtime/src/sub-agent-tree.ts)。

## 2. 开关与协作工具

`app_settings` 的 `sub_agent_enabled` 默认开启。daemon 在新 Run 启动时读取；关闭后该 Run 不向模型提供四个子 Agent 控制工具，也不创建执行树。切换设置不改变已经开始的 Run。

工具 schema 和声明在 [sub-agent.ts](../packages/tools/src/tools/sub-agent.ts)，Runtime 注入回调。工具均支持 `AbortSignal`，声明为 `parallel`，仍占用所属 Agent 的工具槽位。控制工具只接受直接子执行，daemon 的单任务停止 API 可以定位当前树中的任一活动执行。

| 工具 | 参数 | 当前行为 |
|---|---|---|
| `spawn_agent` | `name`、`task`、`agentType: explorer / worker`、可选 `modelId` | 持久化 `subagent.started`、创建独立 Agent 后返回 `executionId`；子任务继续后台执行。 |
| `wait_agents` | `executionIds`、`returnOn: all / any` | `all` 等待全部指定任务；`any` 等到至少一个终态。返回 `results` 与仍运行的 ID；已结束任务立即返回。 |
| `send_agent_message` | 活动 `executionId`、`message`、`delivery: steer / follow_up` | `steer` 调用子 Agent 的 `steer()` 与 `abort()`，后续继续消费新指令；`follow_up` 排入后续轮。终态执行拒绝新消息。 |
| `stop_agent` | `executionId` | 递归中止该执行及后代，等待目标完成并返回终态；重复停止已结束执行返回已有结果。 |

`name` 最长 80 字符，任务和消息最长 8,000 字符，工具 ID 最长 64 字符；schema 禁止空字符串并要求等待 ID 不重复。`wait_agents` 当前使用固定 31 分钟工具超时，其他三个控制工具使用 30 秒工具超时。子执行自身另有 30 分钟计时器；等待超时不会自动停止子树。

`wait_agents` 返回项包含 `executionId`、`status` 及已有终态数据（结束时间、请求数、用量、摘要或错误码）。重复等待会再次返回已结束结果；`delivered` 标记仅阻止自动收束重复注入。ID 不存在或不属于直接父执行时返回 `SUBAGENT_NOT_FOUND`，可附相同前缀的 ID 提示。

## 3. 生命周期与结果收束

生命周期是 `running → completed | failed | aborted`。审批和人工输入等待是运行中的活动。运行超时记为 `failed / SUBAGENT_TIMEOUT`；主动停止记为 `aborted / SUBAGENT_ABORTED`；模型错误、没有有效最终文本和上下文投影失败记为失败。

每个 Agent 结束当前工作后，执行树等待其活动直接子任务。尚未通过 `wait_agents` 交付的结果以 `isInternal` 用户消息送回该 Agent，再调用 `continue()` 让其综合；继续委派时再次收束。顶层 `RunCoordinator.settleRun()` 同样等待执行树后才提交根 Run 终态。内部结果消息可恢复模型上下文，普通对话不把它渲染成用户发言。

摘要来自最后一条 Assistant 消息的文本，直接截取前 4,000 字符；没有额外的结构化结论或自动核验步骤。完整回复保存在 `subagent.message.completed`，Web 详情与 Trace 使用完整消息展示。子任务失败不自动取消兄弟任务，也不单独把根 Run 判为失败；父 Agent 根据结果继续工作。

用户中止根 Run、运行准备失败或 daemon 清理会调用 `abortAll()` 并等待子执行。单任务停止仅作用于目标子树。根 Agent 的插话会打断根轮次和等待，已有子任务继续运行；对子 Agent 的 `steer` 也不会自动停止其已启动后代。子执行结束时解除事件订阅、清理计时器并释放槽位。

事件提交成功后才更新执行终态。`RunCoordinator.emit()` 使用同一 Promise 链提交父子事件，先完成持久化/广播回调再推进 `seq`；提交失败沿链路传播。尚未持久化的终态不能当作可靠成功结果。

## 4. 上下文与模型

每个子 Agent 从空消息历史创建。任务是首条用户消息，不自动复制父对话、父工具输出、父 checkpoint 或兄弟历史。System Prompt 由根 Run 的基础 Prompt、非 `memory` 来源 Context 与子角色提示组合，包含工作区/项目指令和执行约束。

默认模型、`streamFn`、响应详细程度和推理摘要偏好都来自**根 Run**。中间子 Agent 使用 `modelId` 覆盖时，其孙 Agent 未传 `modelId` 仍默认根 Run 模型。覆盖仅在根 Provider 中通过 daemon `resolveRunModel(providerId, modelId)` 解析，不支持跨 Provider 参数；推理档位按目标模型能力裁剪，覆盖不修改 Session 设置。创建前确认模型支持文本输入。

子 Agent 独立使用 `projectContext()` 裁剪与压缩，持有自己的 checkpoint，Plan/Todos 传入 `null`。每次普通模型请求发出带完整请求消息的 `subagent.context.usage_snapshot`；压缩发出 `subagent.context.compacted`。父上下文预算不计入未发送给它的子历史。

不自动注入 `memory` Context 不等于禁止记忆工具：当前 `worker` 继承父注册表中未被排除的工作工具，包含父已注册的 memory 工具，仍经过原有工具/Policy 链。必要父对话背景由委派方明确写入 `task`。

源码：[子角色 Prompt](../packages/agent-runtime/src/prompts/sub-agent-prompt.ts)、[SubAgentTree](../packages/agent-runtime/src/sub-agent-tree.ts)、[daemon 装配](../apps/daemon/src/server/create-server.ts)。

## 5. 工具、审批与共享工作区

| 角色 | 当前工作工具范围 |
|---|---|
| `explorer` | 只继承 `read_file`、`view_image`、`read_document`、`view_pdf_page`、`list_files`、`search_text`、`web_search`、`web_fetch` 中声明为只读的工具；另获得普通 `request_user_input` 和子 Agent 控制工具。不能用 MCP、Shell、文件写入或 Skill 发现/加载工具，只能委派 `explorer`。 |
| `worker` | 继承直接父 `rawRegistrations` 中未排除的工作工具与已注册 MCP 工具；重建 `search_tools` / `load_tools` 按需公开 MCP；fork SkillRegistry 并提供 `find_skill` / `get_skill` / `load_skill`；另获得普通用户输入和子 Agent 控制工具。 |

子 Agent 不继承 `update_plan`、`update_todos`、checkpoint 恢复、工作状态重置、会话历史搜索或 `skill_creator`。这些属于父 Run 控制面。Plan 尚未确认时只能创建 `explorer`；工具钩子继续限制未经确认的副作用。子 Agent 只能请求普通问题，不能提交 Plan Review。

子注册表从未包装的 `rawRegistrations` 构造，使用独立 `ToolRegistry` / `ToolExecutionGuard`，复用根 Run 的 Policy、审批和外部 MCP 生命周期。父 Agent 等待时不占子 Agent 的工具槽位；外部工具在所有子执行清理后随根 Run 释放。

审批、输入与文件事件携带可选 `executionId`，沿用根 Session/Run。子请求不额外发出根 `run.awaiting_input` / `run.resumed`；其他分支可以继续工作。Web 在主会话显示带子来源的审批，回答经过原有人工交互 API。

父子 Agent 共用固定 Workspace 与受保护目录边界。`edit_file` / `write_file` 按规范化目标路径使用 daemon 进程内共享门闩；同路径写入串行，不同路径可以并发。审批在获得目标门闩前处理。执行前重新评估 Policy 与指纹，已存在文件必须匹配该执行通过 `read_file` 观察到的内容，否则抛出 `WORKSPACE_CHANGED`。Shell 执行后清除所属执行的读取指纹。

Shell 不持有上述文件门闩，影响范围也不能静态保证；多个 Agent 经 Shell 修改同一文件仍可能冲突。审批与沙箱不提供多进程或多工具事务隔离。

源码：[RunToolHooks](../packages/agent-runtime/src/run-tool-hooks.ts)、[ToolRegistry](../packages/tools/src/lib/tool-registry.ts)、[ToolExecutionGuard](../packages/tools/src/tool-execution-guard.ts)。

## 6. 资源限制与用量

| 边界 | 当前值 |
|---|---|
| 每个 Agent 活动直接子任务 | 3 个 |
| 嵌套深度 | 2 层（子、孙） |
| daemon 活动子 Agent 总数 | 8 个，跨 Session 共享 |
| 子执行持续时间 | Agent 创建后的 30 分钟 |
| 父模型结果摘要 | 4,000 字符 |
| 单 Agent 工具并发槽位 | 4 个 |

槽位在模型解析等异步准备前预占，创建失败或清理时释放。满额返回 `SUBAGENT_LIMIT_REACHED`，没有无限排队器。当前没有累计委派次数或模型请求次数的硬上限。

终态记录子执行 `requestCount` 和 `usage`，包含 Assistant 消息与压缩用量。daemon 设置页统计从父/子完整 Assistant 消息及压缩事件汇总，不重复累加终态汇总值；子模型信息由 `subagent.started` 关联。父 Context 占用与实际模型用量是不同口径。

常见工具/终态错误包括 `SUBAGENT_LIMIT_REACHED`、`SUBAGENT_DEPTH_EXCEEDED`、`SUBAGENT_ROLE_DENIED`、`SUBAGENT_NOT_FOUND`、`SUBAGENT_NOT_ACTIVE`、`SUBAGENT_INPUT_DENIED`、`SUBAGENT_TIMEOUT`、`SUBAGENT_MODEL_FAILED`、`SUBAGENT_CONTEXT_EXCEEDED`、`SUBAGENT_ABORTED`。文件冲突沿用 `WORKSPACE_CHANGED`；工具超时沿用 `TOOL_TIMEOUT`。

源码：[用量统计](../apps/daemon/src/utils/session-usage-statistics.ts)。

## 7. 事件、持久化与恢复

事件来自浏览器安全的 `agent-runtime/harness-event`。Pi 事件只在 Runtime 内适配。

| 事件 | 内容 | JSONL |
|---|---|---|
| `subagent.started` | 名称、任务、角色、父工具 ID、模型与实际 System Prompt/Tool 快照 | 是 |
| `subagent.tools_loaded` | 后续向模型公开的工具定义 | 是 |
| `subagent.message.started/completed` | 独立用户、Assistant 或工具结果消息 | 是 |
| `subagent.message.delta` | 文本、思考与工具参数增量 | 否 |
| `subagent.tool.started/completed/failed/skipped` | 工具参数、结果或跳过原因 | 是 |
| `subagent.tool.updated` | 工具进度 | 否 |
| `subagent.context.usage_snapshot/compacted` | 请求上下文快照与独立压缩记录 | 是 |
| `subagent.completed/failed/aborted` | 摘要或错误、用量、请求数、结束时间 | 是 |
| `approval.*`、`input.*`、`file.changed` | 原有审计事件，增加子执行归属 | 按原有规则 |

父子事件共用单调递增 `seq`，实时事件不落盘，因此 JSONL 序号可以有间隙。恢复父 Agent 只取根 `message.completed`，不混入子消息或 checkpoint。当前有效分支使用 `selectActiveSessionEvents`；回退掉的旧分支子事件留在文件，但不进入当前对话/详情。

重启不能恢复进程内模型调用。`recoverInterruptedRuns()` 对中断 Run 依次记录待审批过期、输入过期、活动子执行 `subagent.aborted`，再记录根 `run.aborted / RUN_INTERRUPTED`。恢复事件可能没有正常终态的用量、结束时间和父执行字段；不自动重放旧工具或续跑旧树。

| API | 当前响应与边界 |
|---|---|
| `GET /api/sessions/:sessionId/subagents/:executionId/events?afterSeq=<seq>&limit=<count>` | 校验当前有效分支中存在该执行，按全局 `seq` 返回所属事件与 `hasMore`；默认 100 条，API 上限 200 条。 |
| `POST /api/sessions/:sessionId/subagents/:executionId/abort` | 停止当前 Run 的活动执行；成功 204，不存在或已结束返回 404。 |

普通 `/conversation` 与轻量 SSE 裁掉子消息正文、工具参数/结果和进度细节，保留活动信号；当前 `subagent.started` 与终态仍原样保留，包括启动快照、任务、摘要与用量。完整详情与 Trace 另按需读取。

源码：[事件协议](../packages/agent-runtime/src/harness-event.ts)、[SessionEventStore](../apps/daemon/src/storage/session-event-store.ts)、[会话事件服务](../apps/daemon/src/services/session-event-service.ts)、[轻量投影](../apps/daemon/src/utils/session-conversation.ts)、[SessionService](../apps/daemon/src/services/session-service.ts)。

## 8. 当前限制与后续核验

已具备委派、等待、消息、嵌套、停止、角色限制、独立上下文、共同事件提交、重启中止恢复、子任务详情和独立 Trace。以下边界尚需保留：

- `wait_agents` 固定 31 分钟超时，重复等待可再次返回结果；没有动态剩余预算或分批结果游标。
- 终态执行不能通过 API 重新启动或接收消息；新的工作使用新委派。
- 右侧详情展示对话过程，完整 Prompt、上下文、输入及其他审计内容在独立 Trace 查看。
- 看板已接收根 Run 下的审批/输入/文件事件，尚无子执行树摘要或全部等待事项的状态归约，见 [任务看板](./任务看板与Sub-Agent设计.md)。

后续运行验证应覆盖并行调查、worker 审批、嵌套与角色拒绝、陈旧写入、单任务/整树停止、插话、超时、daemon 重启、刷新与重连。
