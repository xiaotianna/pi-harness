import type { ChatThread } from "./chat";

export const SHOWCASE_MARKDOWN = `Here is a concise answer with **markdown** support:

\`\`\`ts
export type ChatStatus = "ready" | "streaming" | "submitted";
\`\`\`

- Presentation-only Pro components
- Your app owns the message array and SDK wiring
- Compose \`ChatMessage\`, \`Markdown\`, and \`ChainOfThought\` explicitly`;

export const SHOWCASE_THREAD: ChatThread = {
  id: "pro-ai-showcase",
  messages: [
    {
      id: "showcase-1",
      role: "user",
      text: "Walk me through the HeroUI Pro AI chat components.",
    },
    {
      id: "showcase-2",
      loaderLabel: "Thinking...",
      role: "assistant",
      status: "streaming",
      text: "Thinking...",
    },
    {
      id: "showcase-3",
      role: "user",
      text: "Show me reasoning, markdown, and code highlighting.",
    },
    {
      actions: "full",
      avatar: {
        alt: "Assistant",
        fallback: "AI",
      },
      id: "showcase-4",
      markdown: SHOWCASE_MARKDOWN,
      reasoning: {
        defaultExpanded: false,
        steps: [
          {
            content:
              "Reviewed the Pro demos for Markdown block memoization and Shiki-powered CodeBlock rendering.",
            label: "Search",
          },
          {
            content:
              "Mapped reasoning UI to ChainOfThought and loading states to TextShimmer plus ChatLoader.",
            label: "Plan",
          },
        ],
        trigger: "Thought for 4 seconds",
      },
      role: "assistant",
      showAvatar: true,
    },
    {
      id: "showcase-5",
      role: "user",
      text: "Show me tool calls — streaming, grouped, and approval.",
    },
    {
      id: "showcase-5b",
      role: "assistant",
      toolGroup: {
        label: "2 tool calls",
        tools: [
          {
            argsText: '{"query":"HeroUI Pro chat components"}',
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
      text: "What if a tool needs approval?",
    },
    {
      id: "showcase-5d",
      role: "assistant",
      tools: [
        {
          argsText: '{"to":"team@acme.com","subject":"Launch update"}',
          state: "requires-action",
          toolName: "sendEmail",
        },
      ],
    },
    {
      id: "showcase-6",
      role: "user",
      text: "What do skeleton loaders look like while a reply is pending?",
    },
    {
      id: "showcase-6b",
      loaderLabel: "Loading response",
      role: "assistant",
      status: "skeleton",
    },
    {
      id: "showcase-7",
      role: "user",
      text: "Show media and compact actions too.",
    },
    {
      actions: "minimal",
      id: "showcase-8",
      image: {
        alt: "Component architecture diagram placeholder",
        src: "https://heroui-assets.nyc3.cdn.digitaloceanspaces.com/images/egg.webp",
      },
      role: "assistant",
      showAvatar: true,
      text: "Assistant messages can include media and a minimal action set beneath the body.",
    },
    {
      id: "showcase-9",
      role: "user",
      text: "Show sources and file attachments.",
    },
    {
      attachments: [
        {
          mimeType: "image/png",
          name: "dashboard-wireframe.png",
          src: "https://heroui-assets.nyc3.cdn.digitaloceanspaces.com/images/egg.webp",
        },
      ],
      id: "showcase-9b",
      role: "user",
      text: "What can you tell me about this wireframe?",
    },
    {
      id: "showcase-9c",
      role: "assistant",
      sourceGroup: {
        label: "3 sources",
        sources: [
          {
            description: "HeroUI Pro ships presentation-only AI chat compounds for React.",
            sourceType: "url",
            title: "HeroUI Pro",
            url: "https://heroui.com",
          },
          {
            description: "Slot-based styling utilities used across Pro components.",
            sourceType: "url",
            title: "Tailwind Variants",
            url: "https://tailwind-variants.org",
          },
          {
            sourceType: "document",
            title: "design-system-audit.pdf",
          },
        ],
      },
      text: "The wireframe follows a familiar dashboard shell with a persistent sidebar, top bar, and a scrollable content region for cards and charts.",
    },
  ],
  modelId: "gpt-5.4",
  preview:
    "Demo thread for Markdown, ChainOfThought, ChatTool, sources, attachments, loaders, and message actions.",
  searchModeId: "deep-search",
  title: "Pro AI components showcase",
  updatedAt: "Just now",
  user: {
    avatar: "https://heroui-assets.nyc3.cdn.digitaloceanspaces.com/avatars/blue-light.jpg",
    email: "darnell@email.com",
    name: "Darnell Howe",
  },
};
