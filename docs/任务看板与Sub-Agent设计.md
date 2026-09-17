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
| `completed` | 已完成 | 绿色 | 用户确认结果 |

红色不作为普通看板列状态色，只用于真正的异常、失败或阻塞提示。

看板列反映真实执行生命周期。拖动“待开始”任务到“执行中”会启动任务，拖动“待确认”任务到“已完成”会确认完成；其他跨列拖动不会改写状态。Runtime 事件负责推进执行中、需处理和待确认。

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
- 任务详情展示只读状态；“更多”菜单提供编辑和删除，删除只移除 BoardTask，关联 Session、Run 事件和工作区文件继续保留；右侧只展示当前状态需要的主操作。

### 2.4 API

- `GET /api/board-tasks`：读取未归档任务及其事件投影。
- `POST /api/board-tasks`：创建待开始任务。
- `PATCH /api/board-tasks/:taskId`：修改标题、目标或状态。
- `DELETE /api/board-tasks/:taskId`：删除任务记录，不删除关联会话或工作区文件。
- `POST /api/sessions/:sessionId/runs`：可选接收 `boardTaskId`；未提供时自动创建任务。

所有写操作继续经过 daemon 的同源与桌面授权检查。Web 不直接访问 SQLite、JSONL 或 Runtime 对象。

## 3. Sub Agent 的后续结构

对话中的子 Agent 运行与查看方式见 [对话中的 Sub Agent 设计](./对话Sub-Agent设计.md)。看板目前仍只以顶层 Run 投影任务状态；会话能力稳定后，再确定看板需要展示的执行摘要。

## 4. 实施进度

### 当前已完成

- [x] 真实 `board_tasks` SQLite 持久化与 migration。
- [x] 看板任务查询、创建和更新 API。
- [x] 新顶层 Run 自动创建任务，从看板发起时关联已有任务。
- [x] Run、审批和人工输入事件自动更新任务状态。
- [x] 从 JSONL 投影 Plan/Todo 当前步骤、进度、等待原因和文件变更数。
- [x] `/board` 替换静态演示数据，以一个全局看板聚合所有 Workspace，并支持创建、编辑、动作型拖拽、人工确认、后台开始执行和主动进入对话。

### 后续阶段

- [ ] 增加任务归档、批量操作和列内排序持久化。
- [ ] 根据已落地的会话子 Agent 事件，确定任务详情所需的执行摘要。
