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
| 跨组件纯 UI 状态 | Zustand | 当前页面视图、默认模型偏好 |
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
| Markdown 链接 | HTTP(S) 使用 HeroUI `Link`；本地绝对或相对文件、目录路径使用带 Tooltip 的 `AssistantMarkdownLink`，href 必须是真实且可独立解析的路径，点击由会话 feature 请求 daemon 交给操作系统打开 | `components/ai/assistant-markdown-link.tsx`、`features/chat/components/thread-message-list.tsx` |
| Tool 调用与分组 | assistant-ui Element `ToolCall`；分组使用紧凑列表 | `components/ai/tool-call.tsx`、`features/chat/components/thread-message/` |
| 消息操作 | `ChatMessageActions` | `features/chat/components/message-actions.tsx` |
| 消息输入 | `PromptInput` 加 `ChatComposerEditor` | `features/chat/components/chat-composer.tsx` |
| 文件选择 | 隐藏原生 `input[type=file]`，由 HeroUI `Button` 触发 | `features/chat/components/chat-composer.tsx` |
| 命令与搜索弹窗 | `Command` 复合组件 | `features/chat/components/chat-search-dialog.tsx` |
| 提示词建议 | `PromptSuggestion` | `features/chat/views/explore-page.tsx` |
| 项目任务看板 | HeroUI Pro `Kanban` 与 `useKanban` | `features/chat/views/library-page.tsx` |
| 基础操作 | HeroUI `Button` | `features/chat/components/chat-navbar.tsx` |
| 上下文操作 | HeroUI `Dropdown`；弹层按内容自适应宽度，只设置必要的最小宽度和视口上限 | `features/chat/components/chat-sidebar.tsx`、`chat-composer.tsx` |
| 表单字段 | `Form`、`TextField`、`Label`、`Input`、`FieldError` | `features/settings/components/provider-editor-dialog.tsx` |
| 单选 | `Select` 加 `ListBox`；操作菜单使用 `Dropdown` | `features/settings/components/settings-dialog.tsx`、`model-settings-panel.tsx` |
| 平行视图或模式 | `Tabs`；少量偏好使用 detached `ToggleButtonGroup` | `features/chat/components/chat-view-toggle.tsx`、`features/settings/components/settings-dialog.tsx` |
| 布尔设置 | HeroUI `Switch`，放在行尾 | `features/settings/components/model-settings-panel.tsx` |
| 普通工作流 | HeroUI `Modal` | `features/settings/components/provider-editor-dialog.tsx` |
| 危险确认 | HeroUI `AlertDialog`，明确说明后果 | `features/chat/components/chat-shell-dialogs.tsx`、`features/auth/components/user-menu.tsx` |
| 状态与反馈 | `Alert`、`Chip`、全局 `toast` | `features/auth/views/login-page.tsx`、`features/settings/components/model-settings-panel.tsx` |
| AI 等待与生成状态 | assistant-ui Elements `GenerationLoader`、`ThinkingIndicator` | `components/ai/` |
| 页面数据加载 | 骨架屏；不要用于 AI 处理状态 | `features/chat/views/chat-page.tsx` |
| 折叠详情 | HeroUI `Disclosure`；带阴影提示的滚动正文使用 `ScrollShadow` | `components/ai/reasoning-panel.tsx` |
| 设置面板标题 | 复用 `SettingsPanelHeader` | `features/settings/components/settings-panel-header.tsx` |
| 设置项行 | 复用 `SettingsRow` | `features/settings/components/settings-row.tsx` |
| Provider 品牌 | 复用 `ModelProviderIcon`，按 Provider ID 映射直接 SVG | `features/models/components/model-provider-icon.tsx` |
| AI 过程展示 | 思考、图片和任务使用 assistant-ui Elements；Web Search 使用 HeroUI Pro `ChatSource` 的 Stacked Favicons + `ChatSources` Grouped | `components/ai/` |
| Trace 类型 | 复用 `TraceKindChip` | `features/trace/components/trace-kind-chip.tsx` |
| 长 Trace/事件列表 | `@tanstack/react-virtual` | `features/trace/components/trace-event-list.tsx` |
| 业务状态动画 | Motion 加减少动效处理 | `features/chat/views/chat-page.tsx`、`workspace-inspector.tsx`、`features/trace/components/trace-detail-panel.tsx` |

## 依赖边界

### HeroUI

使用 `@heroui/react` 提供基础无障碍组件及其复合结构。当前使用范围包括 Alert、AlertDialog、Avatar、Button、Card、Chip、Description、Disclosure、Dropdown、Fieldset、Form、Header、Input、Kbd、Label、ListBox、Modal、ScrollShadow、Select、Separator、Surface、Switch、Tabs、TextField、ToggleButtonGroup、Tooltip 和 toast。

### HeroUI Pro 兼容包

使用 `@agile-avocation/ui-pro` 提供 AppLayout、Navbar、Sidebar、PromptInput、ChatConversation、ChatMessage、ChatMessageActions、ChatSource、ChatSources、Command、PromptSuggestion、Markdown、CodeBlock 和图表等复合场景。不得替换为 `@heroui-pro/react`。

### 其他前端依赖

- 使用 TanStack Router 管理路由，TanStack Query 管理服务端数据，Zustand 管理共享 UI 状态。
- `HarnessEventType`、`HarnessEvent` 和 `MessageDeltaKind` 从浏览器安全的 `@pi-harness/agent-runtime/harness-event` 子路径复用，内部消息判断从 `@pi-harness/agent-runtime/agent-message` 复用；不要导入 `agent-runtime` 主入口或在 Web 重复定义事件协议。
- 使用 Motion 表达业务状态变化，普通图标优先使用 Gravity UI Icons，没有语义等价图标时才使用 Lucide React；替换图标时保留现有 HeroUI 语义色和业务状态 class。同级操作显式统一图标视觉尺寸与颜色，填充路径图标通过尺寸和语义色控制视觉重量。
- 使用 KaTeX 渲染公式 fenced block，使用 Mermaid 严格安全模式渲染流程图 DSL。
- 使用 `@tanstack/react-virtual` 处理长列表，使用项目既有 AppLayout 或 `react-resizable-panels` 处理可调面板。
- 使用 Tailwind CSS v4 和主题 token；不要为同一职责增加第二套依赖。

## 原生元素例外

标题、段落、section、列表、链接、code、figure 和布局 wrapper 可以使用语义化原生元素。原生交互元素只有在浏览器平台能力确实需要、且没有重做组件库能力时才允许使用。当前已确认的例外是消息输入器中由 HeroUI Button 触发的隐藏文件输入框。
