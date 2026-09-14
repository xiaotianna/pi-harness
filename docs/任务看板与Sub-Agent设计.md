# 任务看板与 Sub Agent 设计

## 1. 定位

`/board` 是 PI Harness 的任务中心，不是 Session 列表、Todo 列表或 Agent 在线状态页。它回答三个问题：

1. 哪些任务还没开始或正在执行？
2. 哪些任务需要用户处理或确认，哪些已经完成？
3. 一个任务由哪些执行单元完成，产生了什么结果？

任务中心只有一个全局看板，始终聚合所有 Workspace 的任务，不按项目分组、分栏，也不提供 Workspace 筛选或搜索。Workspace 仍是任务执行与安全边界，必须在每张任务卡片和任务详情中明确标注。

顶层 `BoardTask` 是长期可管理的工作对象；`Session` 是对话上下文；顶层 `Run` 是一次任务执行边界；Plan 和 Todo 是该 Run 内的临时工作状态。未来的 Sub Agent 是任务下的执行单元，不直接成为新的看板列。

```text
BoardTask
└── Session
    └── Root Run（当前主执行）
        ├── Plan / Todos
        ├── Primary Agent execution
        └── Sub Agent executions（未来）
```

## 2. 当前实现

### 2.1 看板状态

| 状态 | 页面列 | 状态色 | 进入方式 |
|---|---|---|---|
| `pending` | 待开始 | 灰色 | 用户创建但尚未发起执行 |
| `in_progress` | 执行中 | 蓝色 | Run 开始或从人工交互恢复 |
| `waiting` | 需处理 | 橙色 | 需要补充输入、审批，或处理 Run 失败、中止和输入过期 |
| `confirmation` | 待确认 | 紫色 | Run 正常完成，等待用户确认结果 |
| `completed` | 已完成 | 绿色 | 用户确认结果，或手动标记完成 |

红色不作为普通看板列状态色，只用于真正的异常、失败或阻塞提示。

用户可以拖动任务或在详情中手动调整状态。Runtime 事件自动推进到执行、等待或待确认；只有用户确认后才进入已完成。

### 2.2 数据模型

当前 SQLite `board_tasks` 保存：

- `id`：任务 ID。
- `workspace_id`：不可跨越的工作区边界。
- `session_id`：发起执行后关联的对话。
- `root_run_id`：当前任务对应的顶层 Run；唯一约束避免一个 Run 重复投影为多个任务。
- `title`、`objective`：用户可编辑的任务名称与目标/验收要求。
- `status`、`position`：看板列与列内位置。
- `created_at`、`updated_at`、`completed_at`、`archived_at`：生命周期索引。

Plan、Todo、审批、输入请求和文件变更仍以 Session JSONL 中的 `HarnessEvent` 为事实来源，不在 `board_tasks` 中复制。看板读取任务时投影当前步骤、完成数、等待原因和本次 Run 的文件变更数。

### 2.3 创建与执行

- 用户可以在任务中心先创建任务，再点击“开始执行”。Web 使用全局默认模型在后台创建 Session，把任务目标作为首条用户消息，并把 `boardTaskId` 随首个 Run 请求提交；页面继续停留在看板，不自动进入新建页或对应 Session。
- 用户也可以直接从普通新对话发起工作。daemon 会为每个新的顶层 Run 自动创建一条看板任务。
- 一个 Session 可以拥有多个顶层 Run，因此也可以对应多个 BoardTask；BoardTask 与顶层 Run 是一对一关联。
- 当前已关联 Run 的任务从详情进入原对话，不重复发起第二个 Root Run。
- 待确认任务在详情中提供“确认完成”主操作，同时保留状态选择、编辑和进入对话。

### 2.4 API

- `GET /api/board-tasks`：读取未归档任务及其事件投影。
- `POST /api/board-tasks`：创建待开始任务。
- `PATCH /api/board-tasks/:taskId`：修改标题、目标或状态。
- `POST /api/sessions/:sessionId/runs`：可选接收 `boardTaskId`；未提供时自动创建任务。

所有写操作继续经过 daemon 的同源与桌面授权检查。Web 不直接访问 SQLite、JSONL 或 Runtime 对象。

## 3. Sub Agent 的后续结构

### 3.1 核心原则

- BoardTask 表达用户要交付的结果，AgentExecution 表达由谁、以什么上下文执行其中一部分。
- Sub Agent 默认作为父任务的子执行记录展示，不因为并发执行就占据独立看板卡片。
- 只有用户显式“提升为独立任务”时，子执行目标才生成新的 BoardTask，并通过依赖关系连接原任务。
- Sub Agent 不得绕过父任务的 `workspaceId`、Policy、审批策略、固定 cwd、凭据脱敏或输出限制。
- 父任务只有在主执行和所有必需子执行进入终态后，才允许自动进入 `confirmation`；其中任意必需分支需要用户处理时，父任务进入 `waiting`。

### 3.2 建议新增实体

后续多 Agent 阶段建议新增 `task_executions`，不把执行树塞进 `board_tasks`：

| 字段 | 含义 |
|---|---|
| `id` | 执行记录 ID |
| `task_id` | 所属 BoardTask |
| `parent_execution_id` | 父执行；主 Agent 为 `null` |
| `agent_kind` | `primary`、`subagent` 或后续明确支持的自动执行类型 |
| `session_id` / `run_id` | 对应 Harness 执行上下文 |
| `status` | `queued`、`running`、`waiting`、`completed`、`failed`、`aborted` |
| `assigned_objective` | 父执行分派给该分支的明确目标 |
| `result_summary` | 完成后用于父执行汇总的结果摘要 |
| `required` | 是否阻止父任务进入待确认 |
| 时间字段 | 创建、开始、更新、结束时间 |

跨任务依赖另用 `task_dependencies(task_id, depends_on_task_id, kind)` 表达，避免把执行树和产品任务依赖混为一谈。

### 3.3 事件协议

未来新增项目自己的事件，而不是向 Web 暴露底层 Agent SDK 事件：

- `subagent.started`
- `subagent.progress`
- `subagent.awaiting_input`
- `subagent.completed`
- `subagent.failed`
- `subagent.aborted`

事件至少包含 `taskId`、`executionId`、`parentExecutionId`、`sessionId`、`runId`、时间与安全裁剪后的摘要。执行详情继续进入所属 Session JSONL；SQLite 仅保存需要结构化查询的执行索引。

### 3.4 状态聚合

父任务状态由以下优先级聚合：

1. 任一必需执行等待审批或输入：`waiting`。
2. 任一必需执行仍在排队或运行：`in_progress`。
3. 必需执行失败且需要用户决策：`waiting`。
4. 全部必需执行完成：`confirmation`。
5. 用户确认：`completed`。

可选子执行失败可以保留告警，但不能静默阻止主任务；具体是否重试、忽略或提升为独立任务由用户或 Primary Agent 明确决定。

### 3.5 页面演进

保持五个业务状态列不变。Sub Agent 能力加入后：

- 卡片增加紧凑的执行摘要，例如“1 主执行 · 3 子执行 · 2 完成”。
- 任务详情展示可折叠执行树，每个节点显示目标、状态、耗时和结果摘要。
- 需处理的卡片优先说明具体是哪个执行分支需要输入、审批或决策。
- 同一任务并行分支使用执行树和时间线表达，不新增“Sub Agent”“Agent A”等看板列。
- 只有独立提升的子任务才产生新卡片，并显示与父任务的依赖关系。

## 4. 实施进度

### 当前已完成

- [x] 真实 `board_tasks` SQLite 持久化与 migration。
- [x] 看板任务查询、创建和更新 API。
- [x] 新顶层 Run 自动创建任务，从看板发起时关联已有任务。
- [x] Run、审批和人工输入事件自动更新任务状态。
- [x] 从 JSONL 投影 Plan/Todo 当前步骤、进度、等待原因和文件变更数。
- [x] `/board` 替换静态演示数据，以一个全局看板聚合所有 Workspace，并支持创建、编辑、拖动改状态、人工验收、后台开始执行和主动进入对话。

### 后续阶段

- [ ] 增加任务归档、批量操作和列内排序持久化。
- [ ] 引入 `task_executions` 与 Sub Agent 执行树。
- [ ] 增加 Sub Agent HarnessEvent 适配、父任务状态聚合与恢复机制。
- [ ] 在任务详情加入执行树、分支结果和依赖关系。
- [ ] 增加并发上限、取消传播、失败重试和子任务提升流程。
