# AI 组件映射

`components/ai` 直接承载 AI 对话中的状态展示。组件使用项目指定的 assistant-ui Elements 或 HeroUI Pro 复合组件，并适配 HeroUI v3 和语义化主题变量。

| 本地组件 | 来源组件 | 项目用途 |
| --- | --- | --- |
| `GenerationLoader` | [Loading state](https://www.assistant-ui.com/elements/loading-state) | Agent 尚未产出正文时的加载状态 |
| `ThinkingIndicator` | [Thinking indicator](https://www.assistant-ui.com/elements/thinking-indicator) | 当前思考或流式生成状态 |
| `ReasoningPanel` | [Reasoning panel](https://www.assistant-ui.com/elements/reasoning-panel) | 可展开的分析过程与完成摘要 |
| `AssistantMarkdown` | HeroUI Pro `Markdown` + HeroUI `Table` / `Checkbox` | 统一配置助手 Markdown 块级组件 |
| `ChartBlock` | HeroUI Pro `BarChart` | 渲染 `chart` fenced block 的分类数据 |
| `FormulaBlock` | KaTeX | 渲染 `formula`、`math`、`latex` fenced block |
| `FlowDiagram` | HeroUI `Surface` | 渲染 `flow` fenced block 的线性步骤 |
| `MermaidBlock` | Mermaid + HeroUI `Surface` | 渲染 `mermaid`、`flowchart` fenced block |
| `ToolCall` | [Tool call](https://www.assistant-ui.com/elements/tool-call) | 可展开的工具请求、结果与执行状态 |
| `WebSearch` | [Chat Source：Stacked Favicons + Grouped](https://heroui.pro/docs/react/components/chat-source) | 叠放站点图标与分组来源 |
| `ImageGeneration` | [Image generation](https://www.assistant-ui.com/elements/image-generation) | 图片生成占位与完成结果 |
| `AgentPlan` | [Agent plan](https://www.assistant-ui.com/elements/agent-plan) | 输入器上方当前 Run 的 Plans 左栏 |
| `TodoList` | [Todo list](https://www.assistant-ui.com/elements/todo-list) | 输入器上方当前 Run 的 Todos 右栏 |

每个组件独立成文件。消息状态继续由项目的 `HarnessEvent` 和聊天消息数据驱动，不引入 assistant-ui runtime，也不重复接管现有消息外壳、Markdown 和输入器。
