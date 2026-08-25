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
| 用户与助手消息 | `ChatMessage`、`ChatAttachment`、`Markdown`、`CodeBlock`、`ChatSource` | `features/chat/components/thread-message/` |
| Tool 调用与分组 | `ChatTool`、`ChatToolGroup` | `features/chat/components/thread-message/` |
| 消息操作 | `ChatMessageActions` | `features/chat/components/message-actions.tsx` |
| 消息输入 | `PromptInput` 加 `ChatComposerEditor` | `features/chat/components/chat-composer.tsx` |
| 文件选择 | 隐藏原生 `input[type=file]`，由 HeroUI `Button` 触发 | `features/chat/components/chat-composer.tsx` |
| 命令与搜索弹窗 | `Command` 复合组件 | `features/chat/components/chat-search-dialog.tsx` |
| 提示词建议 | `PromptSuggestion` | `features/chat/views/explore-page.tsx`、`library-page.tsx` |
| 基础操作 | HeroUI `Button` | `features/chat/components/chat-navbar.tsx` |
| 上下文操作 | HeroUI `Dropdown` | `features/chat/components/chat-sidebar.tsx`、`chat-composer.tsx` |
| 表单字段 | `Form`、`TextField`、`Label`、`Input`、`FieldError` | `features/settings/components/provider-editor-dialog.tsx` |
| 单选 | `Select` 加 `ListBox`；操作菜单使用 `Dropdown` | `features/settings/components/settings-dialog.tsx`、`model-settings-panel.tsx` |
| 平行视图或模式 | `Tabs`；少量偏好使用 detached `ToggleButtonGroup` | `features/chat/components/chat-view-toggle.tsx`、`features/settings/components/settings-dialog.tsx` |
| 布尔设置 | HeroUI `Switch`，放在行尾 | `features/settings/components/model-settings-panel.tsx` |
| 普通工作流 | HeroUI `Modal` | `features/settings/components/provider-editor-dialog.tsx` |
| 危险确认 | HeroUI `AlertDialog`，明确说明后果 | `features/chat/components/chat-shell-dialogs.tsx`、`features/auth/components/user-menu.tsx` |
| 状态与反馈 | `Alert`、`Chip`、全局 `toast` | `features/auth/views/login-page.tsx`、`features/settings/components/model-settings-panel.tsx` |
| AI 等待与生成状态 | AICSS `Orbs` S2 | `components/ai/aicss/aicss-components.tsx` |
| 页面数据加载 | 骨架屏；不要用于 AI 处理状态 | `features/chat/views/chat-page.tsx` |
| 折叠详情 | HeroUI `Disclosure` | `components/ai/aicss/aicss-components.tsx` |
| 设置面板标题 | 复用 `SettingsPanelHeader` | `features/settings/components/settings-panel-header.tsx` |
| 设置项行 | 复用 `SettingsRow` | `features/settings/components/settings-row.tsx` |
| Provider 品牌 | 复用 `ModelProviderIcon`，按 Provider ID 映射直接 SVG | `features/models/components/model-provider-icon.tsx` |
| AI 过程展示 | 复用已有思考、搜索、图片和任务展示组件 | `components/ai/aicss/aicss-components.tsx` |
| Trace 类型 | 复用 `TraceKindChip` | `features/trace/components/trace-kind-chip.tsx` |
| 长 Trace/事件列表 | `@tanstack/react-virtual` | `features/trace/components/trace-event-list.tsx` |
| 业务状态动画 | Motion 加减少动效处理 | `features/chat/views/chat-page.tsx`、`workspace-inspector.tsx`、`features/trace/components/trace-detail-panel.tsx` |

## 依赖边界

### HeroUI

使用 `@heroui/react` 提供基础无障碍组件及其复合结构。当前使用范围包括 Alert、AlertDialog、Avatar、Button、Card、Chip、Description、Disclosure、Dropdown、Fieldset、Form、Header、Input、Kbd、Label、ListBox、Modal、Select、Separator、Surface、Switch、Tabs、TextField、ToggleButtonGroup、Tooltip 和 toast。

### HeroUI Pro 兼容包

使用 `@agile-avocation/ui-pro` 提供 AppLayout、Navbar、Sidebar、PromptInput、ChatConversation、ChatMessage、ChatMessageActions、Command、PromptSuggestion、Markdown、CodeBlock、ChatTool 和 ChatToolGroup 等复合场景。不得替换为 `@heroui-pro/react`。

### 其他前端依赖

- 使用 TanStack Router 管理路由，TanStack Query 管理服务端数据，Zustand 管理共享 UI 状态。
- `HarnessEventType`、`HarnessEvent` 和 `MessageDeltaKind` 从浏览器安全的 `@pi-harness/agent-runtime/harness-event` 子路径复用，内部消息判断从 `@pi-harness/agent-runtime/agent-message` 复用；不要导入 `agent-runtime` 主入口或在 Web 重复定义事件协议。
- 使用 Motion 表达业务状态变化，使用 Lucide React 作为普通图标库。
- 使用 `@tanstack/react-virtual` 处理长列表，使用项目既有 AppLayout 或 `react-resizable-panels` 处理可调面板。
- 使用 Tailwind CSS v4 和主题 token；不要为同一职责增加第二套依赖。

## 原生元素例外

标题、段落、section、列表、链接、code、figure 和布局 wrapper 可以使用语义化原生元素。原生交互元素只有在浏览器平台能力确实需要、且没有重做组件库能力时才允许使用。当前已确认的例外是消息输入器中由 HeroUI Button 触发的隐藏文件输入框。
