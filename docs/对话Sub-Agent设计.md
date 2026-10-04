# 对话中的 Sub Agent：当前交互与数据流

Sub Agent 的对话条目、右侧详情、单任务停止和独立 Trace 均已接入。执行生命周期、模型继承与权限边界见 [Sub Agent 核心设计](./Sub-Agent核心设计.md)；看板能力见 [任务看板](./任务看板与Sub-Agent设计.md)。

## 1. 用户入口

通用设置提供默认开启的“启用子 Agent”开关，daemon 保存到 `app_settings`。设置由新 Run 读取；关闭后从下一 Run 起移除委派、等待、消息与停止工具，已开始的 Run 和历史记录继续保留。

子 Agent 是父 Session、根 Run 内的一次执行，拥有独立模型消息与上下文。它不创建新的聊天，也不成为一张独立看板卡片。用户在当前对话查看它的活动，父 Agent 综合结果后继续当前 Run。

源码：[设置服务](../apps/daemon/src/services/app-settings-service.ts)、[RunCoordinator](../packages/agent-runtime/src/run-coordinator.ts)。

## 2. 主对话中的条目

`session-messages.ts` 以 `subagent.started` 创建 `ChatSubAgentMessage`，按 `executionId` 接收后续消息、工具、审批、输入和终态事件。条目显示任务名、稳定像素头像、最近活动、运行时长及终态；完成/失败图标紧邻名称，运行期间每秒刷新耗时。

增量活动区分正在思考、回复与工具调用；工具进度可显示最近阶段，审批与输入请求显示等待审批/回复。父 Agent 的 `wait_agents` 不覆盖子 Agent 自己的活动。父 Run 的处理提示显示当前活动子任务数量。

孙 Agent 作为自身条目出现在根 Run 的过程链中，用“由某 Agent 委派”标识来源，保持与其他条目相同左侧起点；主对话不绘制嵌套树结构线。条目进入现有 `IntermediateTurn` 过程分组，终态后按主会话的“已处理”折叠规则查看。

四个子 Agent 控制工具属于交互工具，普通对话不额外渲染其常规 ToolCall 卡片；委派由子条目承接。工具调用本身仍保存在 JSONL 和主/子 Trace 中。父 Agent 的文本与最终综合回答保留在主消息链，子完整消息不混入其中。

子 Agent 审批在主会话生成单独的工具审批条目，带 `agentName` 与根 `runId`，经已有审批 API 回答。子问题使用现有人工输入流程，按 `executionId` 关联。投影区分子请求与父等待，因此子 Agent 等待不隐藏父回复的流式展示。

源码：[消息投影](../apps/web/src/features/chat/utils/session-messages.ts)、[条目](../apps/web/src/features/chat/components/thread-message/sub-agent-thread-message.tsx)、[像素头像](../apps/web/src/features/chat/components/sub-agent-avatar.tsx)。

## 3. 右侧列表与详情

### 3.1 面板与列表

`ChatShell` 复用 `AppLayout.aside`，桌面可调整宽度，移动端使用 sheet。文件变更检查器与子 Agent 共用此位置，打开其中一种会切换面板内容；关闭不会改变对话/轨迹/文件视图。

点击主对话条目直接打开对应详情，详情头部返回按钮进入该根 Run 的列表，列表与详情独立呈现。列表按 `parentExecutionId` 把孙 Agent 收进直接父 Agent 的可展开分组，父行显示子任务数量；缺失父记录的历史条目作为顶层项保留。父子行保持相同左侧起点，头像、任务名、角色和状态均可见。

列表从普通会话快照读取身份与终态，随会话 SSE 更新；详情另按需读取所属执行的完整事件。面板身份与导航放在 Zustand 的 `workspace-inspector-store`，事件数据使用 TanStack Query，没有把服务端消息复制进面板状态。

源码：[ChatShell](../apps/web/src/features/chat/components/chat-shell.tsx)、[SubAgentInspector](../apps/web/src/features/chat/components/sub-agent-inspector.tsx)、[面板状态](../apps/web/src/features/chat/state/workspace-inspector-store.ts)、[树投影](../apps/web/src/features/chat/utils/sub-agent-tree.ts)。

### 3.2 详情目前展示什么

详情头部显示名称、状态、探索/执行角色及可选委派来源；运行中显示“停止该子任务”。停止调用单任务 abort API，成功后重新请求详情历史；停止整个 Run 继续使用主对话操作。

正文按事件顺序展示任务说明、完整 Assistant 文本、工具开始与完成/失败结果、文件变化路径、审批等待摘要、实时文本和终态错误码。完整 Assistant 正文使用现有 Markdown，工具使用现有 `ToolCall`。运行中末尾显示处理标识，终态后移除。供父模型使用的 `resultSummary` 不在详情底部重复渲染。

打开详情先请求默认 100 条历史；存在后续页时通过“加载更多过程”追加，当前不是打开即自动拉取全部历史。因此超过首屏页的完整最终回复可能需要加载更多才出现。已加载历史按 `seq` 与实时事件合并去重。

详情初始跟随到底部，`ResizeObserver` 处理内容高度变化；用户向上滚轮、触摸或拖动时暂停跟随，回到底部阈值内恢复。加载、读取失败、空记录、运行、终态及断线重连都有对应反馈。

详情是对话过程视图，不渲染每种审计事件：System Prompt、工具定义、模型思考正文、每次请求上下文、压缩详情和人工输入原始事件，应到独立 Trace 查看。当前工具 `skipped` 没有和详情中的 `completed/failed` 相同的结果映射，不能声称该面板已完整覆盖所有工具终态。

## 4. 独立 Trace 已实现

会话“轨迹”视图按需加载完整会话快照并建立独立事件订阅，使用 HeroUI Select 在主 Agent 与各子 Agent 间切换。触发器只显示名称，下拉项显示状态。主轨迹保留父控制工具，但过滤 `subagent.*` 以及带子 `executionId` 的审批、输入、文件等事件。

子 Trace 按 `executionId` 分组，复用主轨迹展示能力：启动快照中的实际 System Prompt 与工具定义、委派任务、独立模型请求及完整上下文、后加载工具定义、完整消息、工具/跳过记录、审批、输入、文件变化、压缩和终态。父级 `spawn_agent` 工具详情可直接进入对应子 Trace；孙 Agent 同样可从直接父 Trace 进入。

完成详情优先使用最后一条完整 Assistant 消息正文，保留终态的摘要/用量作为审计数据，不以 4,000 字符结果摘要替代正文。尚无独立 Turn 语义的子 Trace 隐藏轮次统计、时间轴与 Turn/Step 标记。历史启动事件缺少较新的 Prompt/Tool 快照时，只能显示当时实际保存的内容。

Trace 的 Preview 与主对话共用当前 Session 的 Workspace Markdown 链接/图片上下文；Raw 保留原文。右侧对话详情与 Trace 是不同入口，完整审计覆盖以 Trace 和 JSONL 为准。

源码：[ChatTraceView](../apps/web/src/features/chat/components/chat-trace-view.tsx)、[AgentTraceView](../apps/web/src/features/trace/components/agent-trace-view.tsx)、[Trace 投影](../apps/web/src/features/trace/utils/session-events-to-agent-traces.ts)、[工具 Trace 详情](../apps/web/src/features/trace/components/trace-details/tool-trace-details.tsx)。

## 5. 快照、分页与 SSE

| 接口/数据源 | 当前用途 |
|---|---|
| `GET /api/sessions/:sessionId/conversation` | 普通会话快照，子消息只保留角色与活动，工具只保留名称/状态；子启动和终态目前原样保留。 |
| `GET /api/sessions/:sessionId/subagents/:executionId/events?afterSeq=<seq>&limit=<count>` | 当前有效分支中单执行的完整持久化事件，默认 100、上限 200，返回 `hasMore`。 |
| `GET /api/sessions/:sessionId/events` | 原有 Session SSE；详情使用完整事件模式，主对话使用轻量投影。 |
| `POST /api/sessions/:sessionId/subagents/:executionId/abort` | 停止当前 Run 内的活动执行与后代，成功 204；已结束/不存在返回 404。 |
| 完整 Session 快照 | 打开 Trace 时加载全部审计事件，按执行 ID 投影独立轨迹。 |

详情的实时订阅从首次会话快照 `lastSeq` 开始，按全局 `seq` 前进，再筛选目标 `executionId`；断线后每 2 秒从最近序号重连。当前重连依靠 SSE 重放已持久化事件，详情代码不在每次重连后重新抓取完整快照。`subagent.message.delta` / `subagent.tool.updated` 不落盘，断线期间的 token/工具进度不能重放，完整消息结束事件恢复已完成内容。

普通投影已移除子消息正文、工具参数/结果和详细进度，但 `subagent.started` 与终态仍可能携带 Prompt/Tool 快照、任务、摘要与用量；不能把现状描述为仅传身份/状态的纯轻量目录。

源码：[SessionService](../apps/daemon/src/services/session-service.ts)、[轻量投影](../apps/daemon/src/utils/session-conversation.ts)、[session API](../apps/web/src/features/chat/api/session-api.ts)、[Query Key](../apps/web/src/features/chat/api/session-queries.ts)。

## 6. 当前限制与核验范围

已落地的入口是：设置开关 → 主过程条目 → 单执行详情/本轮列表 → 停止子树；另有完整独立 Trace。后续尚需解决或确认：

- 详情首批分页不会自动加载全部历史，完整审计应使用 Trace 或手工加载更多。
- 对话详情中的工具跳过/输入等事件覆盖与 Trace 不完全相同。
- 启动/终态的普通投影仍较重，尚未把快照和摘要全部下沉到按需读取。
- 任务看板没有子执行摘要入口；已结束子执行没有重新打开执行或直接发消息的用户入口。

后续实际运行检查应覆盖并行与嵌套条目、审批/提问时父回复持续显示、详情流式滚动、超过 100 条历史、停止子树、刷新、断线和 daemon 重启。
