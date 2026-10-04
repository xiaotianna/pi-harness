# 任务看板与 Sub Agent 的当前实现

运行核心见 [Sub Agent 核心设计](./Sub-Agent核心设计.md)，会话入口见 [对话中的 Sub Agent](./对话Sub-Agent设计.md)。

## 1. 定位与数据边界

`/board` 已使用 daemon 的真实任务数据，是一个聚合所有 Workspace 的全局看板。Web 不提供 Workspace 分栏、筛选或看板内搜索；卡片与详情显示 Workspace 归属。底层查询 API 仍支持可选 `workspaceId`，当前 Web 不使用该参数。

`BoardTask` 是可管理和确认的任务对象；`Session` 是对话上下文；顶层 `Run` 是一次执行；Plan/Todos 是工作状态。Sub Agent 是该 Run 内的执行分支。待开始任务尚未绑定 Session/Run，启动后 BoardTask 与顶层 Run 一对一关联。同一 Session 后续新建顶层 Run 会产生新的 BoardTask。

```text
BoardTask
└── Session
    └── Root Run（一个任务关联一次顶层执行）
        ├── Plan / Todos
        ├── 主 Agent
        └── Sub Agent 执行树
```

当前看板仍以 Root Run 为卡片单位，任务详情尚未展示子执行树或子任务摘要。审批、输入与文件变更可以来自该 Run 中的主 Agent 或子 Agent。

## 2. 状态如何更新

| 状态 | 页面列 | 颜色 | 当前触发 |
|---|---|---|---|
| `pending` | 待开始 | 灰 | 用户创建任务，尚未关联 Run。 |
| `in_progress` | 执行中 | 蓝 | 关联/启动 Run、`run.resumed`、审批或输入解决。 |
| `waiting` | 需处理 | 橙 | `run.awaiting_input`、审批/输入请求、输入过期、根 Run 失败或中止。 |
| `confirmation` | 待确认 | 紫 | 根 `run.completed`。 |
| `completed` | 已完成 | 绿 | 用户确认待确认任务。 |

状态由 `BoardTaskService.handleEvent()` 更新，普通看板状态不提供任意改列接口。`PATCH` 中的 `status` 只接受 `completed`，service 只允许待确认或已完成任务确认完成。

跨列拖拽表达操作：待开始 → 执行中会后台启动任务；待确认 → 已完成会确认结果。其他跨列拖拽保持原状态并提示状态由运行过程更新。列内拖动可以由 Kanban 处理，但没有持久化排序 API，重新加载会恢复数据库顺序。

当前状态推进按**最后收到的相关事件**更新，不按所有待审批/待输入事项整体归约。例如两个子任务都等待审批时，解决其中一个会把卡片改为执行中，即使另一个审批仍未解决。`attentionReason` 会继续从待处理事件中投影，因此卡片可能处于执行中同时显示等待原因。根 Run 最终完成才进入待确认；单独 `subagent.completed/failed/aborted` 不直接改卡片状态。

源码：[BoardTaskService](../apps/daemon/src/services/board-task-service.ts)、[Web 看板](../apps/web/src/features/board/views/board-page.tsx)、[状态定义](../apps/web/src/features/board/constants/board-task.ts)。

## 3. 持久化与读取投影

SQLite `board_tasks` 已有显式 migration 和 repository，保存以下任务索引：

| 字段 | 用途 |
|---|---|
| `id`、`workspace_id` | 任务身份与不可跨越的 Workspace。 |
| `session_id`、`root_run_id` | 启动后绑定；Root Run 唯一约束防止重复任务。 |
| `title`、`objective` | 用户可编辑的名称、目标/验收要求。 |
| `status`、`position` | 状态与列内顺序；创建或跨状态更新时排在目标列末尾。 |
| `created_at`、`updated_at`、`completed_at`、`archived_at` | 生命周期索引；`archived_at` 已有字段，尚无任务归档操作。 |

Plan、Todo、审批、输入与文件事件仍以 Session JSONL 为事实来源，不在任务表复制。查询先按 Session 汇集任务 Run ID，再通过 `loadRunEvents()` 只读取看板需要的事件，投影：

- `currentStep`：Todo 的执行中、阻塞或待开始条目，及 Plan 的执行中/待开始步骤。
- `progress`：Todo 排除取消项后的完成数/总数；没有 Todo 进度时使用 Plan。它不是由工具次数或子 Agent 数量推算的百分比。
- `attentionReason`：尚未解决的审批摘要、问题或根 Run 失败/中止原因。
- `fileChangeCount`：该根 Run 下 `file.changed` 的不同路径数量，包含子 Agent 产生的文件事件；它不表示修改次数或 diff 行数。
- `workspaceName`：当前 Workspace 名称，缺省时回退目录名。

已软移除 Workspace 的任务不出现在 repository 列表；关联会话归档本身不删除 BoardTask。Web 通过 TanStack Query 每 2 秒重新查询看板，当前没有专属看板 SSE。

源码：[任务 repository](../apps/daemon/src/storage/board-task-repository.ts)、[migrations](../apps/daemon/src/storage/migrations.ts)、[查询配置](../apps/web/src/features/board/api/board-task-queries.ts)。

## 4. 创建、启动与管理

用户在全局 Navbar 的“新建任务”入口选择 Workspace、填写名称与目标；新任务先进入待开始。开始执行时，Web 读取 Provider 与全局默认模型设置，优先选择仍可用的默认模型，否则回退首个已启用、已配置且有模型的 Provider/Model；没有可用模型则显示错误。

`useStartBoardTask()` 创建 Session，以任务目标（空目标时使用标题）作为首条消息，使用 `RunMode.DEFAULT`，并把 `boardTaskId` 提交到启动 Run API。任务在后台启动，页面继续停留在看板；用户主动“进入对话”才导航。已关联任务的详情进入原 Session，不从此入口重复启动第二个根 Run。

普通新对话和已有 Session 的新顶层 Run 同样经过 `SessionService.launchRun()`，未指定任务 ID 时自动创建 BoardTask。继续当前 Run 的排队消息/插话不创建新的任务。关联已有任务时，daemon 校验 Workspace 一致并拒绝绑定另一个 Run。

详情只读显示状态、目标、当前步骤、进度、等待原因与文件数。“更多”提供编辑和删除；已创建任务只能修改标题/目标，不能修改 Workspace 或手工替换关联 Run。待确认任务提供进入对话与确认完成，其他状态显示对应主操作。

删除前展示确认；daemon 删除 BoardTask 记录，关联 Session、JSONL 和工作区文件保留。删除正在执行的任务也不会中止运行。删除不是归档，当前没有撤销或恢复任务记录入口。

源码：[启动 Hook](../apps/web/src/features/board/hooks/use-start-board-task.ts)、[模型选择](../apps/web/src/features/board/utils/resolve-board-task-model.ts)、[详情](../apps/web/src/features/board/components/board-task-detail.tsx)、[SessionService](../apps/daemon/src/services/session-service.ts)。

## 5. API

| API | 当前能力 |
|---|---|
| `GET /api/board-tasks?workspaceId=<uuid>` | 返回未归档且所属 Workspace 未移除的任务与投影；参数可选，Web 默认全局查询。 |
| `POST /api/board-tasks` | 接收 `workspaceId`、`title`、`objective`，创建待开始任务。 |
| `PATCH /api/board-tasks/:taskId` | 更新标题、目标或确认 `status: completed`；不支持其他状态、归档或 position。 |
| `DELETE /api/board-tasks/:taskId` | 删除任务记录，成功 204；保留关联会话与文件。 |
| `POST /api/sessions/:sessionId/runs` | 可选 `boardTaskId`；未提供时自动创建该 Run 的任务。 |

Route 使用 TypeBox schema，写操作复用 daemon 本地来源/同源与桌面授权检查。任务 ID 和 Workspace ID 使用 UUID；标题最长 200 字符，目标最长 20,000 字符。Web 不接触 SQLite、JSONL 或运行对象。

源码：[routes](../apps/daemon/src/routes/board-task-routes.ts)、[DTO](../apps/daemon/src/dto/board-task-dto.ts)、[controller](../apps/daemon/src/controllers/board-task-controller.ts)。

## 6. 实施状态与当前限制

已落地：任务表及迁移、查询/创建/更新/删除 API、新 Run 自动关联、后台启动、运行事件驱动状态、JSONL 进度/等待/文件投影、全局五列、动作型拖拽、编辑、人工确认和进入原对话。空数据继续显示五列和各列的“暂无任务”，加载与读取错误单独呈现。

以下能力尚未实现：

- 任务归档/恢复、批量操作、列内排序持久化。
- 任务详情内的子执行树、子任务用量或结果摘要。
- 基于全部未解决审批/输入和活动子执行的统一状态归约。
- 已关联失败/中止任务的专用重试/重新绑定流程；当前从原会话发起新的顶层 Run 会产生新任务。

这些边界不影响 Sub Agent 在会话中的运行与 Trace；相关实际行为见 [对话中的 Sub Agent](./对话Sub-Agent设计.md)。
