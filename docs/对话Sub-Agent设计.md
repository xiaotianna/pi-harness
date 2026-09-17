# 对话中的 Sub Agent 设计

## 1. 目标

父 Agent 可以把明确、独立的工作委派给多个子 Agent。当前对话的思考链显示每次委派的名称、状态和结果；点击任一子 Agent，在现有右侧面板查看它的任务、消息、工具调用和最终结果。父 Agent 汇总子 Agent 的结果后继续当前 Run。

通用设置提供“启用子 Agent”开关，默认开启。关闭后从下一轮 Run 起不提供委派、等待、消息和停止工具；已开始的 Run 和历史子 Agent 记录仍可继续运行或查看。

一个子 Agent 是父 Session、父 Run 内的一次执行，使用独立模型上下文；它不创建新的 Session 或顶层 Run。执行生命周期、安全边界和协作协议见 [Sub Agent 核心设计](./Sub-Agent核心设计.md)。

参考行为：[Codex Subagents](https://learn.chatgpt.com/docs/agent-configuration/subagents)支持在主线程查看子线程活动并打开其详情；[Claude Code Subagents](https://code.claude.com/docs/en/sub-agents)让子 Agent 使用独立上下文和工具范围，完成后把结果交回主对话。两份文档描述产品行为，下面的运行时接法依据 PI Harness 现有代码设计。

## 2. 对话体验

### 2.1 思考链

- 父 Agent 调用 `spawn_agent({ name, task, agentType })` 后，在当前 Run 的思考链出现子 Agent 条目。`name` 是可读的短任务名，`executionId` 是稳定身份；多个同批调用在现有工具组位置形成一组条目。子 Agent 再委派时，在所属条目下展示子级。
- 每个条目前方显示由 `executionId` 确定的圆形像素头像；同一次执行在思考链、列表和详情中使用同一图案与主色。任务名之后显示完成或失败图标，右侧显示状态、耗时和最近一步，例如“正在搜索文件”。状态变化通过 SSE 原位更新。点击条目打开对应子 Agent 的右侧详情。
- 运行中的条目保持可见；Run 结束后沿用现有 `IntermediateTurn` 的“已处理”折叠规则。展开后仍能找到每个子 Agent，不在最终回答中重复展示它们的完整过程。
- `spawn_agent` 的普通 ToolCall 展示由子 Agent 条目承接，避免同一次委派出现两张卡片。`wait_agents` 和消息投递作为该条目的活动记录展示；父 Agent 的最终回答保留在主消息链中。

### 2.2 右侧面板

- 复用 `ChatShell` 的 `AppLayout.aside`、可调整宽度和移动端 sheet。文件变更检查器与子 Agent 详情共用这个位置；打开新内容时切换面板内容。
- 面板分为本次 Run 的子 Agent 列表和单个子 Agent 详情，两个视图不同时展示。思考链条目直接打开对应详情；点击详情头部的返回按钮进入列表，再从列表选择其他子 Agent。列表使用与文字行高协调的小头像，展示任务名、角色与状态，并按父子关系缩进。详情头部将返回按钮、头像、任务名、状态和角色紧凑排列，状态使用内联标记；运行中提供“停止该子任务”。关闭面板返回原对话位置，不切换“对话 / 轨迹 / 文件”视图。
- 详情按时间顺序展示任务说明、子 Agent 消息、工具调用、完整最终回复或错误。`resultSummary` 只交给父 Agent 综合，不在详情底部重复渲染；它有长度上限，不能代替完整回复。复用现有消息、Markdown、ToolCall 和状态展示组件；只为子 Agent 的列表与详情组合增加业务组件。
- 打开面板时按 `executionId` 加载完整历史；运行中根据同一条 Session SSE 的 `seq` 增量刷新。明确呈现加载、空记录、运行、失败、中止和断线恢复状态。移动端通过已有 sheet 交互查看。

示意：

```text
当前对话                                  右侧面板
├─ 用户：检查认证模块                    ┌─ 子 Agent 列表 ───────────┐
├─ 思考与工具                            │ ◉ 检查 Token 刷新 运行中 │
│  ├─ ◉ 检查 Token 刷新  运行中 ────────→ │ ◉ 检查 OAuth 流程 已完成  │
│  └─ ◉ 检查 OAuth 流程  已完成            └───────────┬──────────────┘
└─ 父 Agent 的综合回答                            选择任务或返回列表
                                            ┌─ ← ◉ 检查 Token 刷新 ──┐
                                            │ 任务说明与执行过程      │
                                            │ 当前消息与结果          │
                                            └─────────────────────────┘
```

## 3. 事件如何驱动界面

`spawn_agent` 的父工具调用和 `subagent.started` 通过 `parentToolCallId` 关联；嵌套执行再用 `parentExecutionId` 组成树。对话投影用 `executionId` 维护每个条目的名称、状态、最近活动与耗时；`subagent.completed`、`subagent.failed`、`subagent.aborted` 分别结束对应条目。完整事件种类、顺序和恢复规则见[核心设计](./Sub-Agent核心设计.md)。

现有 `/api/sessions/:sessionId/conversation` 继续提供轻量数据，只保留子 Agent 身份、状态和简短活动信息。新增 `GET /api/sessions/:sessionId/subagents/:executionId/events?afterSeq=<seq>&limit=<count>`，打开侧边面板时按 `seq` 分页读取该执行在当前会话分支的事件。运行中沿用 Session SSE 的 `seq` 去重、排序和增量刷新；断线重连后重新读取快照。

## 4. Web 接点与验收

1. `session-messages.ts` 将子事件投影为当前思考链的父子条目；`thread-message` 渲染状态和打开操作，并用该条目承接 `spawn_agent` 的普通 ToolCall 展示。
2. `ChatShell` 将现有右侧面板的内容状态收敛为“文件变更 / 子 Agent / 关闭”；子 Agent 面板按当前 Run 在列表与详情间导航，详情使用独立 Query Key 按需读取，保留已有可调整宽度与移动端 sheet。停止操作通过 daemon 的单子任务中止 API 执行。
3. 用一次包含并行与嵌套子任务的对话检查：条目分别更新、分别打开；审批能看清来源；刷新和断线重连后仍可查看各自过程；父 Agent 的综合回答留在主消息链中。
