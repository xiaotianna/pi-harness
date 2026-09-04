# PI Harness 前端项目映射

每次使用本 Skill 时完整阅读本文件。这里记录当前代码结构、依赖边界和已验证的场景选择；实际 API 仍以仓库源码、组件文档和已安装类型为准。

## 目录职责

| 目录 | 职责 | 禁止事项 |
|---|---|---|
| `apps/web/src/app` | 应用入口、Provider、Router、全局初始化 | 放入业务页面逻辑 |
| `apps/web/src/pages` | 路由级装配、布局、feature 组合 | 底层 fetch、可复用业务逻辑、大段业务 JSX |
| `apps/web/src/features` | 按领域组织组件、Hook、API、状态、类型和常量 | 跨 feature 深层导入、无边界共享 |
| `apps/web/src/components/ui` | 无业务语义的通用 UI | session、run、provider 等领域逻辑 |
| `apps/web/src/components/ai` | 不持有 daemon/API 状态的 AI 展示原语 | 会话编排、服务端状态复制 |
| `apps/web/src/shared` | 跨 feature 的稳定常量、参数、类型和小型工具 | 大杂烩、一次性字面量抽取 |
| `apps/web/src/api` | HTTP 与 SSE 基础客户端 | React 组件和业务页面 |

## 数据与状态归属

| 数据类型 | 使用方式 | 示例 |
|---|---|---|
| daemon/服务端数据 | TanStack Query | Provider 列表、连接状态 |
| 全局审批策略 | TanStack Query 读写 daemon `app_settings` | 设置页与消息输入器共享权限模式 |
| 繁忙发送偏好 | TanStack Query 读写 daemon `app_settings` | 运行中 Enter 使用排队或插话，Cmd/Ctrl+Enter 临时反转 |
| 文件打开偏好 | TanStack Query 读写 daemon `app_settings`；应用选择弹窗开关使用 Zustand | daemon 私有保存应用路径，Web 只读取打开模式、应用名称与可选图标 |
| 跨组件纯 UI 状态 | Zustand | 当前页面视图、会话模型切换的短暂 UI 状态 |
| 全局默认模型 | TanStack Query 读写 daemon `app_settings` | 设置页与新会话输入器共享模型和推理强度 |
| 局部交互状态 | React 组件状态 | 弹窗开关、输入草稿、展开状态 |
| 路由与搜索参数 | TanStack Router 加集中 schema | 页面、筛选、排序和选中项 |
| Agent 增量事件 | SSE 客户端转换后的 `HarnessEvent` | 消息、工具、审批、运行状态 |

不要把服务端数据复制到 Zustand，也不要在组件内直接拼接 Query Key、URL、API 路径或事件名。

## 组件场景映射

| 场景 | 首选组件或模式 | 已有示例 |
|---|---|---|
| 应用外壳与响应式导航 | `AppLayout`、`Navbar`、`Sidebar` | `features/chat/components/chat-shell.tsx`、`chat-navbar.tsx`、`chat-sidebar.tsx` |
| 会话视口 | `ChatConversation` 复合组件 | `features/chat/views/chat-page.tsx` |
| 用户与助手消息 | `ChatMessage`、`ChatAttachment`、`AssistantMarkdown`、`CodeBlock`、`ChatSource`；Markdown 表格与任务项映射为 HeroUI `Table`、`Checkbox`，图表、公式、HeroUI Flow 和 Mermaid fenced block 映射为独立 AI 展示组件 | `components/ai/assistant-markdown.tsx`、`components/ai/chart-block.tsx`、`components/ai/formula-block.tsx`、`components/ai/flow-diagram.tsx`、`components/ai/mermaid-block.tsx`、`features/chat/components/thread-message/` |
| Markdown 链接 | HTTP(S) 使用 HeroUI `Link`；本地绝对或相对文件、目录路径使用带 Tooltip 的 `AssistantMarkdownLink`，href 必须是真实且可独立解析。目录链接使用 `local-directory` title 明确类型，旧消息缺少标记时按已知文件名/后缀保守识别，文件使用 `FileIconRender`，目录使用 Gravity UI `FolderOpen`；两者共用相同图标占位，目录图标按实际轮廓做光学缩放。点击由会话 feature 请求 daemon 交给操作系统打开 | `components/ai/assistant-markdown-link.tsx`、`features/chat/components/thread-message-list.tsx` |
| 本地文件打开 | 设置页右侧先展示按内容收缩的 ghost 应用选择器，再使用与相邻设置控件等宽的 HeroUI `Select` 选择“每次询问”或默认应用；应用选择器始终展示 24px 图标和应用名称，使用 HeroUI 按钮自身的 hover 与键盘聚焦反馈，不替换文案，窄屏按相同顺序换行，也不添加下拉指示、独立操作或额外表面。询问流程使用不超过 420px 的紧凑 HeroUI `Modal`，标题下以 secondary `Surface` 展示文件摘要，再单独展示 `Checkbox`；不使用重复装饰图标和系统选择器说明，由 daemon 调用系统应用选择器 | `features/settings/components/settings-dialog.tsx`、`features/chat/components/file-open-dialog.tsx` |
| 文件图标 | 统一使用 `FileIconRender`，由可排序的文件名/扩展名策略选择本地 Iconify VSCode 图标，未匹配时由调用方传入原有 Gravity 文件图标兜底 | `components/ui/file-icon-render.tsx` |
| Tool 调用与分组 | assistant-ui Element `ToolCall`；分组使用紧凑列表 | `components/ai/tool-call.tsx`、`features/chat/components/thread-message/` |
| 消息操作 | `ChatMessageActions` | `features/chat/components/message-actions.tsx` |
| 消息输入 | `PromptInput` 加 `ChatComposerEditor` | `features/chat/components/chat-composer.tsx` |
| 排队消息 | 输入器上方使用约三项后滚动、无独立卡片底色的紧凑单行 `ScrollShadow` 列表；正文可原位编辑、按 ID 删除或“调整方向”立即中止当前步骤并转入 steer 队列 | `features/chat/components/queued-run-inputs.tsx`、`features/chat/views/chat-page.tsx` |
| 上下文与用量 | 发送按钮左侧使用 HeroUI `ProgressCircle` 触发 264px 宽的紧凑 `Popover`，详情取最近一次模型请求实际携带的完整 Session Context，在 HeroUI `ProgressBar` 轨道内按上下文窗口占比无间隙地连续组合 System Prompt、按来源分开的 Run Context、Tool 定义和按顺序累积的消息（含 tool call/result）；每个 Context 来源独立记录和展示，当前包含 `AGENTS.md` 与 `Available Skills`，新增类型不得合并进已有分类；默认只展示当前窗口占用，最近 Run、Session 累计和说明通过 HeroUI `Disclosure` 展开，弹层正文使用限高 HeroUI `ScrollShadow` 适配可用视口；已有 checkpoint 时提供管理入口，使用 HeroUI `Modal` 和两个 `Select` 选择任意版本并排查看，空闲时恢复所选版本 | `features/chat/components/context-usage-popover.tsx`、`context-checkpoint-dialog.tsx`、`features/chat/utils/session-usage.ts` |
| 文件附件 | 隐藏原生 `input[type=file]`，由 HeroUI `Button` 触发；输入框粘贴文件时复用同一套附件校验和提交链路；不使用扩展名 `accept` 白名单，所有普通文件都可作为结构化 Run 附件提交；图片、文本和可解析文档展开到 Context，其他二进制保留元数据并明确降级；附件准备失败时先持久化原始文本和附件元数据，再展示 Run 错误 | `features/chat/components/chat-composer.tsx`、`features/chat/utils/run-input.ts`、`packages/agent-runtime/src/utils/user-input.ts`、`packages/agent-runtime/src/run-coordinator.ts` |
| `@` Workspace 上下文 | `ChatComposerEditor` 输入 `@` 时展示当前 Workspace 的真实图片、文件和文件夹候选；文件夹候选、编辑器内标签和消息 Markdown 恢复出的目录标签统一使用 Gravity UI `FolderOpen`，不经过普通文件图标兜底。候选搜索预建索引，长列表使用 HeroUI 导出的 `Virtualizer`，并通过 Collection `items` 驱动动态分组，确保各候选类型完整参与虚拟布局；选中后保留内联标签并作为结构化引用提交，不改成 Tool Call | `features/chat/components/chat-composer-editor.tsx`、`chat-context-mention.tsx`、`features/chat/api/workspace-queries.ts` |
| 命令与搜索弹窗 | `Command` 复合组件 | `features/chat/components/chat-search-dialog.tsx` |
| 项目任务看板 | HeroUI Pro `Kanban` 与 `useKanban` | `features/chat/views/board-page.tsx` |
| 基础操作 | HeroUI `Button` | `features/chat/components/chat-navbar.tsx` |
| 上下文操作 | HeroUI `Dropdown`；弹层按内容自适应宽度，只设置必要的最小宽度和视口上限 | `features/chat/components/chat-sidebar.tsx`、`chat-composer.tsx` |
| 表单字段 | `Form`、`TextField`、`Label`、`Input`、`FieldError`；自定义 Provider 的模型行逐项编辑 `contextWindow` 与 `maxTokens`，最大输出不得超过上下文窗口 | `features/settings/components/provider-editor-dialog.tsx`、`provider-models-dialog.tsx` |
| 单选 | `Select` 加 `ListBox`；操作菜单使用 `Dropdown` | `features/settings/components/settings-dialog.tsx`、`model-settings-panel.tsx` |
| 平行视图或模式 | `Tabs`；少量偏好使用 detached `ToggleButtonGroup` | `features/chat/components/chat-view-toggle.tsx`、`features/settings/components/settings-dialog.tsx` |
| 布尔设置 | HeroUI `Switch`，放在行尾 | `features/settings/components/model-settings-panel.tsx` |
| 普通工作流 | HeroUI `Modal` | `features/settings/components/provider-editor-dialog.tsx`、`features/skills/components/skill-install-dialog.tsx` |
| 危险确认 | HeroUI `AlertDialog`，明确说明后果 | `features/chat/components/chat-shell-dialogs.tsx`、`features/auth/components/user-menu.tsx` |
| 状态与反馈 | `Alert`、`Chip`、全局 `toast` | `features/auth/views/login-page.tsx`、`features/settings/components/model-settings-panel.tsx` |
| AI 等待与生成状态 | assistant-ui Elements `GenerationLoader`、`ThinkingIndicator` | `components/ai/` |
| 当前 Plans / Todos | assistant-ui Elements `AgentPlan`、`TodoList`；只重放活动 Run 的非空最新状态，在输入器上方左右双栏展示，各自保留固定于顶部的标题、计数和条目状态，移除不一致的进度横线，并只让条目使用隐藏滚动条的独立 `ScrollShadow`；HeroUI `Disclosure` 默认折叠为居中的单个椭圆胶囊，在同一入口内分别概括 Plan 与 Todo 进度，展开内容锚定胶囊向上悬浮且不参与底部布局；桌面端按单项或双项使用稳定最大宽度，移动端 Plan 与 Todo 摘要等分可用空间，浮层与胶囊始终等宽并使用相同 surface 背景，不显示边框或边缘阴影，内部间距保持紧凑一致，Run 终态后隐藏，不加入思考链 | `components/ai/agent-plan.tsx`、`components/ai/todo-list.tsx`、`features/chat/components/working-state-panel.tsx` |
| 页面数据加载 | 骨架屏；不要用于 AI 处理状态 | `features/chat/views/chat-page.tsx` |
| 折叠详情 | HeroUI `Disclosure`；带阴影提示的滚动正文使用 `ScrollShadow` | `components/ai/reasoning-panel.tsx` |
| 设置面板标题 | 复用 `SettingsPanelHeader` | `features/settings/components/settings-panel-header.tsx` |
| 设置项行 | 复用 `SettingsRow` | `features/settings/components/settings-row.tsx` |
| Provider 品牌 | 复用 `ModelProviderIcon`，按 Provider ID 映射直接 SVG | `features/models/components/model-provider-icon.tsx` |
| AI 过程展示 | 思考、图片和任务使用 assistant-ui Elements；Web Search 开始时显示带真实查询的 Shimmer 状态，取得结果后按 assistant-ui Sources Runtime 形态在消息内容区全宽展示 HeroUI Pro `ChatSource`，来源自然换行且每项保留 Hover Preview；Web Fetch 复用 Tool Call，并区分连接、读取和正文提取阶段；多工具组外层占满消息宽度，摘要展示实际工具名称，组内普通 Tool Call 仍保持紧凑宽度 | `components/ai/`、`features/chat/components/thread-message/` |
| Trace 类型 | 复用 `TraceKindChip` | `features/trace/components/trace-kind-chip.tsx` |
| Trace 详情 | 桌面端使用 `clamp(320px, 32%, 400px)` 的右侧面板，移动端复用同一详情内容并改用底部 Drawer；按 Run、System、Context、User、Tool、Approval、Assistant 等记录类型分派独立详情组件和页签；来源 Context 使用 `Summary`、`Preview`、`Raw`、`Source`，其中 Preview 使用项目统一 Markdown 渲染，Raw 直接展示未经渲染的原始 Context 字符串；压缩 Context 使用 `Summary`、`Checkpoint`、`Raw`；Approval 区分审批 decision 与 Tool 执行结果，并展示请求、处理事件、关联 Tool Call 和等待时序；同一 Tool 的审批等待与执行区间前后相接，并在泳道边界显示交接连接，不表现为并行；Run 终态不归入 System，Chip 与时间线按完成、失败、中止分别使用 success、danger、warning 语义色，失败时明确展示真实错误信息与错误码；模型请求每次继续携带完整 System/Context，`run.started` 的 Context 按 `type` 独立比较，只持久化和展示首次、新增、变化或移除的来源，不因同组其他来源变化而重复，并在该 Run 出现真实用户消息时归入其开启的 Turn；System 初始标题为 `Initial System Prompt`，更新标题为 `System Prompt Updated`，Tool 详情沿用截至当前 Run 最近一次有效工具快照 | `features/trace/components/trace-detail-panel.tsx`、`features/trace/components/trace-details/` |
| 长 Trace/事件列表 | `@tanstack/react-virtual` | `features/trace/components/trace-event-list.tsx` |
| 业务状态动画 | Motion 加减少动效处理 | `features/chat/views/chat-page.tsx`、`workspace-inspector.tsx`、`features/trace/components/trace-detail-panel.tsx` |

## 依赖边界

### HeroUI

使用 `@heroui/react` 提供基础无障碍组件及其复合结构。当前使用范围包括 Alert、AlertDialog、Avatar、Button、Card、Chip、Description、Disclosure、Dropdown、Fieldset、Form、Header、Input、Kbd、Label、ListBox、Modal、Popover、ProgressBar、ProgressCircle、ScrollShadow、Select、Separator、Surface、Switch、Tabs、TextField、ToggleButtonGroup、Tooltip 和 toast。

### HeroUI Pro 兼容包

使用 `@agile-avocation/ui-pro` 提供 AppLayout、Navbar、Sidebar、PromptInput、ChatConversation、ChatMessage、ChatMessageActions、ChatSource、ChatSources、Command、PromptSuggestion、Markdown、CodeBlock 和图表等复合场景。不得替换为 `@heroui-pro/react`。

### 其他前端依赖

- 使用 TanStack Router 管理路由，TanStack Query 管理服务端数据，Zustand 管理共享 UI 状态。
- 使用 `@tanstack/react-virtual` 处理普通长列表；HeroUI `ListBox`、`Dropdown.Menu` 等 Collection 长列表使用 `react-aria-components` 的 `Virtualizer` 与 `ListLayout`，保留集合语义、选中状态和键盘交互。
- `HarnessEventType`、`HarnessEvent` 和 `MessageDeltaKind` 从浏览器安全的 `@pi-harness/agent-runtime/harness-event` 子路径复用，内部消息判断从 `@pi-harness/agent-runtime/agent-message` 复用；不要导入 `agent-runtime` 主入口或在 Web 重复定义事件协议。
- 使用 Motion 表达业务状态变化，普通图标优先使用 Gravity UI Icons，没有语义等价图标时才使用 Lucide React；替换图标时保留现有 HeroUI 语义色和业务状态 class。同级操作显式统一图标视觉尺寸与颜色，填充路径图标通过尺寸和语义色控制视觉重量。
- 文件类型图标是普通图标规则的专用入口：使用 `@iconify/react` 渲染 `@iconify-icons/vscode-icons` 的本地图标数据，不依赖运行时 Iconify API；所有文件名驱动的图标选择收口到 `FileIconRender`。
- 使用 KaTeX 渲染公式 fenced block，使用 Mermaid 严格安全模式渲染流程图 DSL。
- 使用项目既有 AppLayout 或 `react-resizable-panels` 处理可调面板。
- 使用 Tailwind CSS v4 和主题 token；不要为同一职责增加第二套依赖。

## 原生元素例外

标题、段落、section、列表、链接、code、figure 和布局 wrapper 可以使用语义化原生元素。原生交互元素只有在浏览器平台能力确实需要、且没有重做组件库能力时才允许使用。当前已确认的例外是消息输入器中由 HeroUI Button 触发的隐藏文件输入框。
