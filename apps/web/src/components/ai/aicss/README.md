# AIcss 组件映射

本目录只承载 AI 对话中的状态展示，基础交互继续使用 HeroUI v3，代码块与工具调用继续使用 HeroUI Pro 兼容包 `@agile-avocation/ui-pro`。

## 当前使用 AIcss 的组件

| 本地导出 | AIcss 规范 | 项目用途 |
| --- | --- | --- |
| `ThinkingState` | [Thinking State](https://www.aicss.dev/components/thinking-state) | Agent 尚未产出正文时的轻量思考状态 |
| `ThinkingReasoning` | [Thinking + Reasoning](https://www.aicss.dev/components/thinking-reasoning) | 可展开的分析过程与完成摘要 |
| `Orbs` | [Orbs](https://www.aicss.dev/components/orbs) | Agent 扫描、协调等紧凑活动状态 |
| `WebSearch` | [Web Search](https://www.aicss.dev/components/web-search) | 搜索查询与逐项解析的来源 |
| `ImageGeneration` | [Image Generation](https://www.aicss.dev/components/image-generation) | 图片生成占位与完成结果 |
| `TaskList` | [To-do List](https://www.aicss.dev/components/task-list) | 已完成、进行中、待处理任务列表 |

## 不使用 AIcss 的消息组件

- 用户/助手消息外壳、附件、Markdown、来源和消息操作使用 HeroUI Pro。
- `CodeBlock` 使用 `@agile-avocation/ui-pro/code-block`。
- 单个与分组工具调用使用 `@agile-avocation/ui-pro/chat-tool`。
- 输入框继续使用 HeroUI Pro `PromptInput`，不使用 AIcss `ai-agent-input`。

## 实现约定

- AIcss 免费组件按公开规范适配为受控 React 组件，状态由消息数据/SSE 驱动，不内置演示计时器。
- `web-search` 与 `image-generation` 的源码属于 AIcss 受限内容，本项目仅依据公开交互说明独立实现，不复制受限源码。
- 颜色映射到 HeroUI 语义 token；交互使用 HeroUI `Disclosure`；所有动画尊重 `prefers-reduced-motion`。
