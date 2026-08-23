import { ModelId } from "../../models";
import type { ChatThread } from "./chat";
import { ChatMessageType } from "./chat-message";

export const SHOWCASE_MARKDOWN = `下面是一段支持 **Markdown** 的简洁回答：

\`\`\`ts
export type ChatStatus = "ready" | "streaming" | "submitted";
\`\`\`

- Pro 组件只负责界面呈现
- 消息数组和 SDK 接入由应用自行管理
- 明确组合 \`ChatMessage\`、\`Markdown\` 和 \`ChainOfThought\``;

export const SHOWCASE_THREAD: ChatThread = {
  id: "pro-ai-showcase",
  workspaceId: "pi-harness",
  messages: [
    {
      content: "介绍一下 HeroUI Pro 的 AI 对话组件。",
      id: "showcase-1",
      type: ChatMessageType.USER,
    },
    {
      id: "showcase-2",
      label: "正在思考",
      type: ChatMessageType.STREAMING,
    },
    {
      content: "展示一下推理、Markdown 和代码高亮。",
      id: "showcase-3",
      type: ChatMessageType.USER,
    },
    {
      defaultExpanded: false,
      id: "showcase-4",
      steps: [
        {
          content: "查看了 Pro 示例中 Markdown 区块缓存与 Shiki 代码块渲染的实现。",
          label: "查找资料",
        },
        {
          content: "将推理界面对应到 ChainOfThought，并用 TextShimmer 与 ChatLoader 表达加载状态。",
          label: "制定方案",
        },
      ],
      trigger: "思考了 4 秒",
      type: ChatMessageType.REASONING,
    },
    {
      actions: "full",
      content: SHOWCASE_MARKDOWN,
      id: "showcase-4b",
      type: ChatMessageType.ASSISTANT,
    },
    {
      content: "展示流式、分组和需要审批的工具调用。",
      id: "showcase-5",
      type: ChatMessageType.USER,
    },
    {
      id: "showcase-5b",
      label: "2 次工具调用",
      tools: [
        {
          argsText: '{"query":"HeroUI Pro 对话组件"}',
          output: { hits: 12, top: "ChatTool" },
          state: "output-available",
          toolName: "searchDocs",
        },
        {
          argsText: '{"path":"/components/chat-tool"}',
          output: { title: "ChatTool", words: 420 },
          state: "output-available",
          toolName: "fetchPage",
        },
      ],
      type: ChatMessageType.TOOL_GROUP,
    },
    {
      content: "如果工具需要审批呢？",
      id: "showcase-5c",
      type: ChatMessageType.USER,
    },
    {
      id: "showcase-5d",
      tool: {
        argsText: '{"to":"team@acme.com","subject":"发布进展"}',
        state: "requires-action",
        toolName: "sendEmail",
      },
      type: ChatMessageType.TOOL,
    },
    {
      content: "等待回答时，骨架加载效果是什么样的？",
      id: "showcase-6",
      type: ChatMessageType.USER,
    },
    {
      id: "showcase-6b",
      label: "正在加载回答",
      type: ChatMessageType.LOADING,
    },
    {
      content: "再展示一下媒体内容和精简操作。",
      id: "showcase-7",
      type: ChatMessageType.USER,
    },
    {
      actions: "minimal",
      content: "助手消息可以包含媒体内容，并在正文下方显示一组精简操作。",
      id: "showcase-8",
      image: {
        alt: "组件架构图占位图",
        src: "https://heroui-assets.nyc3.cdn.digitaloceanspaces.com/images/egg.webp",
      },
      type: ChatMessageType.ASSISTANT,
    },
    {
      content: "展示信息来源和文件附件。",
      id: "showcase-9",
      type: ChatMessageType.USER,
    },
    {
      attachments: [
        {
          mimeType: "image/png",
          name: "仪表盘线框图.png",
          src: "https://heroui-assets.nyc3.cdn.digitaloceanspaces.com/images/egg.webp",
        },
      ],
      content: "你能从这张线框图中看出什么？",
      id: "showcase-9b",
      type: ChatMessageType.USER,
    },
    {
      content:
        "这张线框图采用常见的仪表盘结构，包含固定侧边栏、顶部栏，以及可滚动的卡片和图表内容区。",
      id: "showcase-9c",
      type: ChatMessageType.ASSISTANT,
    },
    {
      id: "showcase-9d",
      label: "3 个来源",
      sources: [
        {
          description: "HeroUI Pro 为 React 提供专注于界面呈现的 AI 对话复合组件。",
          sourceType: "url",
          title: "HeroUI Pro",
          url: "https://heroui.com",
        },
        {
          description: "Pro 组件广泛使用的插槽式样式工具。",
          sourceType: "url",
          title: "Tailwind Variants",
          url: "https://tailwind-variants.org",
        },
        {
          sourceType: "document",
          title: "设计系统审查.pdf",
        },
      ],
      type: ChatMessageType.SOURCES,
    },
  ],
  modelId: ModelId.OPENAI_GPT_5_4,
  preview: "展示 Markdown、思维链、工具调用、信息来源、附件、加载状态和消息操作。",
  searchModeId: "deep-search",
  title: "Pro AI 组件展示",
  updatedAt: new Date().toISOString(),
  user: {
    avatar: "https://heroui-assets.nyc3.cdn.digitaloceanspaces.com/avatars/blue-light.jpg",
    email: "darnell@email.com",
    name: "达内尔·豪",
  },
};
