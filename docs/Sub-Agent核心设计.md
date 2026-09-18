# Sub Agent 核心设计

## 1. 目标与设计依据

Sub Agent 是对话中由一个 Agent 委派的执行分支。父 Agent 可以同时交给多个子 Agent 独立任务，继续自己的工作，在需要时等待、补充指令或停止它们。子 Agent 的过程可在[对话中的 Sub Agent 设计](./对话Sub-Agent设计.md)所述的思考链和右侧面板查看；父 Agent 只接收结果摘要，并负责最终综合回答。

本设计以 [Codex Subagents](https://learn.chatgpt.com/docs/agent-configuration/subagents) 的子线程、委派/等待/消息传递、权限继承和并发边界，以及 [Claude Code Subagents](https://code.claude.com/docs/en/sub-agents) 的独立上下文、专门工具集、后台运行、审批回传和嵌套限制为参考。官方资料描述的是公开行为；下文的对象、事件及持久化方式是 PI Harness 基于现有代码作出的实现决定。

设计覆盖只读探索、可写实现、并行协作、子任务追问、嵌套委派、审批、中止和历史查看。Sub Agent 隶属于当前 Session 的顶层 Run，不创建新的 Session 或顶层 Run。

## 2. 身份、所有权与运行结构

```text
Session（固定 workspaceRoot，Session JSONL）
└── 顶层 Run（runId，唯一活动 Run）
    ├── 父 Agent（AgentManager 中常驻的 Agent）
    ├── Sub Agent A（executionId，parentToolCallId）
    │   └── Sub Agent A.1（executionId，parentExecutionId）
    └── Sub Agent B（executionId，parentToolCallId）
```

- `AgentManager` 仍按 `SessionId` 保存常驻父 `RunCoordinator`。一个 Session 同时只有一个活动顶层 Run；子 Agent 是该 Run 内创建和释放的独立 `pi-agent-core Agent`。
- 新委派生成一个不可复用的 `executionId`；同一直接父执行对相同角色、模型、名称与任务的重复调用，如果原执行仍在启动或运行，返回已有 `executionId`，不重复创建。所有子执行记录都包含父 `sessionId`、根 `runId`、`parentToolCallId`；嵌套委派另带 `parentExecutionId`。子工具调用由 `(executionId, toolCallId)` 联合标识，避免不同模型流的工具 ID 撞名。
- 子 `Agent` 内部的 session 标识使用 `executionId`；对外 `HarnessEvent.sessionId` 始终是父 Session。子 Agent 不进入 `AgentManager.runtimes`，活动对象由该 Run 的执行树持有，终态后只保留 JSONL 历史。
- 执行树的父子关系决定权限上限、取消传播和结果归属。直接子 Agent 的结果交给父 Agent；孙 Agent 的结果先交给其直接父 Agent，由后者提炼后交给顶层父 Agent。右侧面板按树展示每个执行。

一次执行的最小记录如下；`status` 只在 `running` 和三个终态之间转换，审批等待等活动由事件投影，不写成互斥状态字段：

```ts
type SubAgentExecution = {
  executionId: string;
  sessionId: SessionId;
  runId: RunId;
  parentExecutionId: string | null;
  parentToolCallId: string;
  name: string;
  task: string;
  agentType: "explorer" | "worker";
  modelId: string;
  status: "running" | "completed" | "failed" | "aborted";
  startedAt: number;
  endedAt?: number;
  resultSummary?: string;
  errorCode?: string;
};
```

## 3. 委派与协作协议

全局设置中的“启用子 Agent”默认开启，并在每个新 Run 启动时读取。关闭时，父 Agent 的本轮工具列表不包含下列四个控制工具，Runtime 不创建子执行树；设置变更不取消已经开始的 Run 或正在运行的子任务。启用时，父 Agent 和可继续委派的子 Agent 获得以下控制工具。`packages/tools` 声明 TypeBox 参数和工具元数据，`packages/agent-runtime` 注入执行回调；工具代码本身不创建 Agent、不写 JSONL。所有 ID 都要核对所属 Session、Run 与直接父子关系。

| 工具 | 输入 | 返回与规则 |
|---|---|---|
| `spawn_agent` | `name`、`task`、`agentType`（`explorer` / `worker`）、可选 `modelId` | 先持久化 `subagent.started`，再返回 `executionId`；子 Agent 后台执行，调用方可继续工作。 |
| `wait_agents` | 一个或多个直接子 `executionId`、`returnOn`（`all` / `any`） | 等到指定子任务全部或任一进入终态，返回状态、短结果与错误码；已结束的任务立即返回。等待可取消。 |
| `send_agent_message` | 活动直接子 `executionId`、`message`、`delivery`（`steer` / `follow_up`） | `steer` 中断子 Agent 当前轮并转向；`follow_up` 排入子 Agent 后续轮。已结束执行返回明确错误。 |
| `stop_agent` | 活动直接子 `executionId` | 中止该执行和它的全部后代；重复停止已结束执行返回当前终态。 |

`spawn_agent` 的任务必须写明目标、范围、必要背景和期望产物；工具 schema 限制空值和长度。不同任务可以在同一轮父模型工具调用中并发执行；完全相同的活动任务返回原 ID。`wait_agents`、`send_agent_message` 和 `stop_agent` 必须使用返回的原始 ID；拼写有误时返回 `SUBAGENT_NOT_FOUND` 和可用的同前缀 ID 提示，父 Agent 应修正 ID 重试调用。一个子任务失败不自动取消兄弟任务，父 Agent 可根据结果决定是否重试；终态后重试会创建新的 `executionId`。

`wait_agents(returnOn: "all")` 返回指定执行的全部终态；`returnOn: "any"` 返回当前已结束的执行和仍在运行的 ID，至少等到一个执行结束。返回项统一包含 `executionId`、`status`、`resultSummary?`、`errorCode?`，不能把失败包装成普通成功文本。一次等待可重复调用，已交付给模型的结果按 `executionId` 去重。

`spawn_agent` 工具在启动记录落盘后即返回；`wait_agents` 的工具超时按所等子任务的剩余截止时间计算，并给终态提交留出余量，不能沿用普通工具的 30 秒默认值。两者都响应调用方的 `AbortSignal`。

控制工具只作用于直接子 Agent。用户可以在主对话里要求父 Agent 补充或停止某个子任务；侧边详情的“停止”操作通过 daemon API 定位 `executionId`，调用同一运行时中止路径。运行中的子 Agent 可以继续接受消息；已完成的执行作为只读历史保留，新的工作使用新的委派记录。

### 3.1 生命周期与父 Run 收束

执行状态是 `running → completed | failed | aborted`，其中等待工具审批/用户输入是 `running` 下的可见活动状态，不另造一个可与终态冲突的生命周期。超时属于 `failed`，主动停止和父 Run 中止属于 `aborted`。`subagent.started` 与唯一终态持久化成功后才对调用方确认相应动作。创建 Agent 失败也必须留下可归属的失败终态；若 `started` 写入失败，直接拒绝启动。

每个 Agent 结束当前轮时，Runtime 检查它的直接子任务：

1. 如果还有活动子任务，先等待它们进入终态；等待期间其他已启动的 Agent 继续工作，界面保持实时更新。
2. 对尚未通过 `wait_agents` 交给该 Agent 的终态结果，注入一条内部结果消息，并调用现有 `Agent.continue()` 让它综合后再结束。
3. 该 Agent 的所有后代均结束、结果已交付，且它完成最后一轮回复后，才写入自己的终态。顶层父 Agent 同理，直到执行树全部收束才写 `run.completed`。

这样即使模型调用 `spawn_agent` 后直接给出答复，也不会把仍在运行的子任务遗留在后台。`wait_agents` 已交付的结果不重复注入；交付标记由当前 Run 持有，父工具结果仍按现有消息机制写入 Session JSONL。自动注入的结果消息标记为 `isInternal`，对模型可见，但不在 Web 中伪装成用户发言。父 Agent 的中途文字可以流式显示，但 Run 完成和最终答案以收束后的回复为准。

## 4. 上下文、模型与结果

- 每个子 Agent 从空消息历史创建，拥有自己的 system prompt、模型上下文和 `transformContext`。它不自动看到父对话全文、父工具输出、父 checkpoint、其他子 Agent 的历史或用户个人记忆。父 Agent 在 `task` 中明确传递必要背景与用户约束。
- 子 system prompt 位于 `packages/agent-runtime/src/prompts/`：包含角色职责、输出契约、适用的工作区/项目指令和当前 Run 的执行模式约束。委派任务是子 Agent 的用户消息，文件与网页内容仍按不可信工具输出处理，不得覆盖 system/Policy 规则。
- 默认使用当前父 Agent 已解析的 `Model`、`streamFn` 和响应偏好；`modelId` 只能从 daemon 已注册且已认证、具备所需工具/输入能力的模型中选择。模型覆盖只影响该子执行，不修改 Session 的模型设置，Provider 凭据始终留在 daemon。
- 子上下文按自己的模型窗口裁剪长工具输出并进行必要压缩；checkpoint 和 token 预算归子执行所有，不得写进父 Agent 的 checkpoint。上下文无法安全容纳当前任务时明确失败。
- `wait_agents` 和自动收束交给父模型的是长度受限的摘要：结论、已完成的操作、必要文件路径/行号、未解决问题以及 `executionId`。详细消息、工具输入输出和用量留在子执行历史里。父 Agent 不把子摘要当成已验证的授权或无条件正确的事实。

## 5. 工具能力、审批与并发写入

### 5.1 角色能力

`explorer` 用于代码和资料调查，工作工具白名单为 `read_file`、`view_image`、`read_document`、`view_pdf_page`、`list_files`、`search_text`、`web_search`、`web_fetch`。它可使用第 3 节的控制工具委派 `explorer`，不能委派 `worker`，也不能调用文件写入、Shell、会改变授权的 Skill 工具或有副作用的 MCP 工具。

`worker` 用于修改与验证，使用当前父 Run 已准备的、允许子执行的内置工具及 MCP 工具，再与其直接父 Agent 的能力取交集。文件写入、Shell、网络访问、Skill 激活和 MCP 工具仍由现有 Policy、审批和工具执行链逐次判定。子 Agent 不获得父 Agent 没有的工具或更宽松的审批策略。Plan 模式尚未确认执行时，只能委派 `explorer`；已批准执行后，`worker` 仍遵守该 Run 的审批策略。

子 Agent 不持有父 Run 的 `update_plan`、`update_todos`、checkpoint 恢复与工作状态重置等控制工具；这些状态只由顶层父 Agent 修改。子 Agent 请求用户澄清时，沿用现有人工输入服务并标记 `executionId`，问题显示在父 Session 中。工具或 Skill 动态带来的能力仍要经过角色与父能力交集，不能借加载流程升级权限。

子 Agent 的只读工具复用现有工具实现，但使用独立的 `ToolRegistry` 和 `ToolExecutionGuard` 实例。构造子注册表时使用未被父 Guard 包装的工具声明，不能复制父 `ToolRegistry.get()` 中已包装的工具；父 `wait_agents` 占用工具槽位时，子工具仍能正常执行。每个 Agent 的 `beforeToolCall`/`afterToolCall` 使用自己的工具注册表与身份，随后进入统一 Policy 和审计流程。外部 MCP 连接仍由父 Run 生命周期持有，所有后代退出后才释放。

### 5.2 可写任务的共同边界

- 审批请求沿用父 `sessionId`、根 `runId`，并加入 `executionId`、子 `toolCallId`、工具名、规范化目标、参数摘要和风险说明。用户在主会话看到是哪个子 Agent 请求操作；工具执行前的审批等待不阻塞其他 Agent，也不占用文件目标的执行门闩。拒绝、超时、中止均返回该子 Agent 的工具错误。
- 父 Agent、子 Agent 和不同 Session 的工具可以并行。`edit_file`、`write_file` 只在规范化后的目标路径相同时串行，并且进入该目标的执行阶段后复查状态；不同文件、Shell 和其他非文件工具不受这个门闩阻塞。同一 Agent 批次内的 `sequential` 调度仍保留。
- 文件读取要向 Runtime 留下该 Agent 看到的存在状态与内容指纹；文件编辑/覆盖在执行前比对这一快照，目标变化则拒绝，让 Agent 重新读取。新文件写入要求目标仍不存在。`run_command` 沿用审批、固定 cwd、执行前状态复查和命令前后文件变化审计；其影响范围不能完全静态推断，与其他工具并发修改同一文件时无法保证无冲突，检测到变化后应重新读取。
- `full_access` 与 `auto_approve` 只影响是否需要人工批准，不绕过工作区边界、受保护路径、固定 cwd、环境白名单、超时、输出限制、重新校验与中止信号。子 Agent 的模型或提示词不能直接调用未注册工具。

## 6. 并发、预算、取消与故障

资源边界：每个 Agent 同时最多 3 个直接子 Agent；嵌套最多 2 层；daemon 同时最多 8 个活动子 Agent。每个子执行最多运行 30 分钟，结果摘要最多 4,000 字符。模型请求次数与顶层 Run 的累计委派次数仅记录用量，不作为失败条件。活动槽位在 `spawn_agent` 首次异步操作前预占，执行结束时释放；并发满额时返回稳定工具错误，不无限排队或自动重试。`AgentManager` 持有 daemon 总并发计数，根 `RunCoordinator` 持有执行树。

每个子 Agent 的模型用量单独记录，同时计入根 Run / Session 汇总；同一条 assistant 用量只统计一次。父 Agent 的当前上下文占用只计算父模型实际发送的内容，子历史不会放大父上下文。日志关联 `sessionId`、`runId`、`executionId` 和 `toolCallId`，继续脱敏凭据与敏感参数。

- 用户中止顶层 Run 或 daemon 关闭：取消整棵执行树，调用所有子 `Agent.abort()`，终结模型流、工具与待处理审批，等待清理后写父 Run 终态。
- `stop_agent`：只取消目标子树；兄弟任务和父 Run 继续。子 Agent 的结果向其直接父 Agent 报告 `aborted`。
- 用户对顶层父 Agent 使用 `steer()`：中断父 Agent 当前轮和当前 `wait_agents`，活动子 Agent 继续运行；父 Agent 可根据新指令发送消息或停止它们。`followUp()` 继续排队，不改变子执行。
- 子 Agent 的 `send_agent_message(..., steer)` 中断该子 Agent 当前轮；它已启动的子任务继续运行，直到收到明确停止或其父执行最终收束。`follow_up` 只排队。
- 模型错误、无有效结果、超时、无法恢复的工具错误，映射为带稳定错误码的 `subagent.failed`；单次工具失败可以由子 Agent 处理并继续。取消与失败不伪装为成功摘要。

所有取消信号通过 `AbortSignal` 传到模型流、工具、审批和等待操作。终态提交与活动槽位释放都在受控清理路径中完成，终态只允许一次；持久化终态失败时不能对父 Agent 报告成功，顶层 Run 转入失败处理。关闭子 Agent 后解除事件订阅与外部资源引用。

工具与事件使用稳定错误码：`SUBAGENT_LIMIT_REACHED`、`SUBAGENT_DEPTH_EXCEEDED`、`SUBAGENT_NOT_FOUND`、`SUBAGENT_NOT_ACTIVE`、`SUBAGENT_TIMEOUT`、`SUBAGENT_MODEL_FAILED`、`SUBAGENT_CONTEXT_EXCEEDED`、`WORKSPACE_CHANGED`。取消使用 `SUBAGENT_ABORTED`。错误响应只包含安全消息，堆栈和敏感工具参数留在脱敏 daemon 日志中。

## 7. 事件、持久化与恢复

Pi 原始事件只在 `agent-runtime` 内转换；Web 和 daemon 只消费 `HarnessEvent`。所有子事件沿用根 `sessionId`、`runId`，`data` 至少携带 `executionId`，嵌套事件带 `parentExecutionId`。具体事件如下：

| 事件 | 必需数据与用途 | JSONL |
|---|---|---|
| `subagent.started` | `executionId`、`parentExecutionId?`、`parentToolCallId`、角色、名称、任务、模型及实际 System Prompt/Tool 定义快照；创建条目和独立轨迹 | 是 |
| `subagent.message.started/delta/completed` | 子消息身份、增量或完整 `AgentMessage`；展示过程 | `started`、`completed` |
| `subagent.tool.started/updated/completed/failed/skipped` | `(executionId, toolCallId)`、工具名、受控参数/结果；展示工具轨迹 | 除 `updated` 外 |
| `subagent.context.usage_snapshot/compacted` | 子 Agent 自己的上下文预算、每次模型请求的完整消息快照与压缩记录；恢复时不进入父 checkpoint | 是 |
| `approval.requested/resolved`、`input.requested/resolved/expired`、`file.changed` | 现有事件增加可选 `executionId`，关联子 Agent；保留原有审批/文件审计 | 按现有规则 |
| `subagent.completed/failed/aborted` | 唯一终态、短结果或安全错误码、用量、结束时间 | 是 |

子 Agent 的审批或输入等待只改变该子任务的活动状态；父 Run 可继续执行其他分支，不因一个子任务等待而整体进入 `run.awaiting_input`。SSE 增量仅用于实时显示，`subagent.message.delta` 与 `subagent.tool.updated` 不写 JSONL。完整消息、工具结果、审批和文件变化按现有 Session JSONL 规则顺序追加，SQLite 只更新 Session 轻量索引，不建子消息副本表。

父子事件共用**同一个串行提交入口**：`RunCoordinator.emit()` 按入队顺序分配 `seq`，等待 `SessionEventService` 完成该条提交后再处理下一条，避免后发事件先落盘。SSE 断线与重连仍以同一 Session 的 `seq` 去重和补齐。

`event-adapter.ts` 将根 `agent_end` 映射为 `run.completed/failed/aborted` 草稿；`RunCoordinator` 先执行第 3.1 节的收束逻辑，再提交根 Run 终态。子 Agent 的 `agent_end` 只映射为子终态，不触发顶层 Run 终态。Plan 模式和顶层 `steer` 的续轮判断仍在根 Run 上执行。

`SessionEventStore.load()` 只从根 `message.completed` 恢复父 Agent 消息。`subagent.message.completed` 单独读取，绝不进入父 `Agent.state.messages`、父上下文压缩或会话主消息链。当前分支由现有 `selectActiveSessionEvents` 确定；分支回退后，旧分支的子事件仍在 JSONL，但不出现在当前对话及子详情中。`GET /api/sessions/:sessionId/subagents/:executionId/events?afterSeq=<seq>&limit=<count>` 按 Session `seq` 分页返回该执行在当前分支的事件，`POST /api/sessions/:sessionId/subagents/:executionId/abort` 只允许停止该 Session 当前 Run 的活动执行。两条 API 均沿用本地来源、同源和输入校验。对话快照仅给出身份、状态和简短活动摘要。

daemon 重启时不能继续原进程中的模型调用。恢复流程先从 JSONL 找到未结束的子执行和待处理审批/输入，依次写入过期处理事件、`subagent.aborted`，最后按现有机制写入中断的根 `run.aborted`。这使 UI 刷新后没有永久“运行中”的子任务；后续新 Run 可读取历史结果，但不会自动重放旧工具操作。

## 8. 模块落点与完成条件

| 模块 | 职责变化 |
|---|---|
| `packages/tools` | 声明四个控制工具、参数 schema；保留现有工作区工具实现与 Guard。 |
| `packages/agent-runtime` | `RunCoordinator` 持有执行树与收束规则；独立子 Agent 创建、上下文、消息投递、取消和 Pi 事件适配；统一事件提交。现有 `handleBeforeToolCall` 的通用 Policy/审批部分供父子 Agent 共用，顶层 Plan/工作状态逻辑仍归父 Run。 |
| `packages/policy` 与 daemon 组装 | 继续判定所有工具调用；在工具执行前复查 Policy 与目标状态。 |
| `apps/daemon` | JSONL 校验、重启恢复、子详情读取、单个子任务中止 API、审批/输入归属和 SSE 投影。 |
| `apps/web` | 按[交互设计](./对话Sub-Agent设计.md)展示父子树、状态、详情和停止操作，只消费 HarnessEvent。 |

完成时用实际对话验证以下情形：两个 `explorer` 同时调查并分别回报；父 Agent 在子任务运行时继续工作并在最终答复前收齐结果；一个 `worker` 修改文件触发带子身份的审批与文件审计；两个写入同一目标时后执行者得到冲突并重新读取；子 Agent 嵌套委派但不能升级权限；单独停止、父 Run 停止、`steer`、超时和 daemon 重启都产生正确终态；刷新和断线后仍可分别查看过程；父 Session 恢复时没有子消息混入父模型历史。
