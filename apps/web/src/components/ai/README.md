# AI 组件映射

`components/ai` 提供可复用的 AI 内容与状态展示；Session、Run、审批与子 Agent 的业务投影属于 `features/chat` 或 `features/trace`。当前实现使用本地组件、HeroUI v3 和 `@agile-avocation/ui-pro`，没有安装或接入 assistant-ui runtime。部分组件名称与结构曾参考 assistant-ui Elements，不应将设计来源误认为运行时依赖。

| 本地组件 | 当前实现 | 项目用途 |
| --- | --- | --- |
| `GenerationLoader` | Pro `TextShimmer` | Agent 尚未产出正文时的加载状态 |
| `ThinkingIndicator` | Pro `TextShimmer` 与耗时文本 | 当前思考或流式生成状态 |
| `ReasoningPanel` | HeroUI `Disclosure` / `ScrollShadow`、`AssistantMarkdown` | 可展开的分析过程与完成摘要 |
| `AssistantMarkdown` | Pro `StreamMarkdown` + HeroUI `Table` / `Checkbox` | 助手流式 Markdown、Skill 标签、本地图片和文件链接 |
| `AssistantCodeBlock` | Pro `CodeBlock` | 未闭合或超长代码保留纯文本，完成后按预算高亮与复制 |
| `ChartBlock` | HeroUI Pro `BarChart` | 渲染 `chart` fenced block 的分类数据 |
| `FormulaBlock` | KaTeX | 渲染 `formula`、`math`、`latex` fenced block |
| `FlowDiagram` | HeroUI `Surface` | 渲染 `flow` fenced block 的线性步骤 |
| `MermaidBlock` | Mermaid + HeroUI `Surface` | 渲染 `mermaid`、`flowchart` fenced block |
| `ToolCall` | HeroUI `Disclosure` / `Separator` 与 Pro `TextShimmer` | 可展开的工具请求、结果与执行状态 |
| `WebSearch` | Pro `ChatSource` / `TextShimmer` 与 Motion | 可悬停预览的网页来源与搜索状态 |
| `ImageGeneration` | 本地图片展示与 Pro `TextShimmer` | 图片生成占位与结果展示；组件存在不代表已注册图片生成工具 |
| `AgentPlan` | 本地列表与 HeroUI `ScrollShadow` | 输入器上方当前 Run 的 Plans 左栏 |
| `TodoList` | 本地状态列表与 HeroUI `ScrollShadow` | 输入器上方当前 Run 的 Todos 右栏 |
| `CodeDiff` | 本地 Diff 行展示与 Shiki | 文件变更审核面板的文本差异 |
| `SkillMention` | 本地标签展示 | 正文中的 Skill 引用 |

每个组件独立成文件。消息状态由项目的 `HarnessEvent` 和 feature 投影驱动；组件不接管 Agent、HTTP/SSE、持久化或输入器业务流程。本地 Markdown 的 Workspace 链接上下文由调用方提供，对话与 Trace Preview 共用同一解析方式。Pro 的具体导出以 [本地兼容包](../../../../../hero-ui-pro/package.json) 为准。
