import type { ChatThread } from "./chat";

export const SHOWCASE_MARKDOWN = `下面是一段支持 **Markdown** 的简洁回答：

\`\`\`ts
export type ChatStatus = "ready" | "streaming" | "submitted";
\`\`\`

- Pro 组件只负责界面呈现
- 消息数组和 SDK 接入由应用自行管理
- 明确组合 \`ChatMessage\`、\`Markdown\` 和 \`ChainOfThought\``;

export const SHOWCASE_THREAD: ChatThread = {
  id: "pro-ai-showcase",
  workspaceId: "pi-workbench",
  messages: [
    {
      id: "showcase-1",
      role: "user",
      text: "介绍一下 HeroUI Pro 的 AI 对话组件。",
    },
    {
      id: "showcase-2",
      loaderLabel: "思考中…",
      role: "assistant",
      status: "streaming",
      text: "思考中…",
    },
    {
      id: "showcase-3",
      role: "user",
      text: "展示一下推理、Markdown 和代码高亮。",
    },
    {
      actions: "full",
      id: "showcase-4",
      markdown: SHOWCASE_MARKDOWN,
      reasoning: {
        defaultExpanded: false,
        steps: [
          {
            content: "查看了 Pro 示例中 Markdown 区块缓存与 Shiki 代码块渲染的实现。",
            label: "查找资料",
          },
          {
            content:
              "将推理界面对应到 ChainOfThought，并用 TextShimmer 与 ChatLoader 表达加载状态。",
            label: "制定方案",
          },
        ],
        trigger: "思考了 4 秒",
      },
      role: "assistant",
    },
    {
      id: "showcase-5",
      role: "user",
      text: "展示流式、分组和需要审批的工具调用。",
    },
    {
      id: "showcase-5b",
      role: "assistant",
      toolGroup: {
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
      },
    },
    {
      id: "showcase-5c",
      role: "user",
      text: "如果工具需要审批呢？",
    },
    {
      id: "showcase-5d",
      role: "assistant",
      tools: [
        {
          argsText: '{"to":"team@acme.com","subject":"发布进展"}',
          state: "requires-action",
          toolName: "sendEmail",
        },
      ],
    },
    {
      id: "showcase-6",
      role: "user",
      text: "等待回答时，骨架加载效果是什么样的？",
    },
    {
      id: "showcase-6b",
      loaderLabel: "正在加载回答",
      role: "assistant",
      status: "skeleton",
    },
    {
      id: "showcase-7",
      role: "user",
      text: "再展示一下媒体内容和精简操作。",
    },
    {
      actions: "minimal",
      id: "showcase-8",
      image: {
        alt: "组件架构图占位图",
        src: "https://heroui-assets.nyc3.cdn.digitaloceanspaces.com/images/egg.webp",
      },
      role: "assistant",
      text: "助手消息可以包含媒体内容，并在正文下方显示一组精简操作。",
    },
    {
      id: "showcase-9",
      role: "user",
      text: "展示信息来源和文件附件。",
    },
    {
      attachments: [
        {
          mimeType: "image/png",
          name: "仪表盘线框图.png",
          src: "https://heroui-assets.nyc3.cdn.digitaloceanspaces.com/images/egg.webp",
        },
      ],
      id: "showcase-9b",
      role: "user",
      text: "你能从这张线框图中看出什么？",
    },
    {
      id: "showcase-9c",
      role: "assistant",
      sourceGroup: {
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
      },
      text: "这张线框图采用常见的仪表盘结构，包含固定侧边栏、顶部栏，以及可滚动的卡片和图表内容区。",
    },
  ],
  modelId: "gpt-5.4",
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
