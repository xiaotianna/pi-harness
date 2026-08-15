import type { ChatThread } from "./chat";
import { ChatMessageType } from "./chat-message";

const UPDATED_COMPONENT = `export function ThreadMessageList({ messages }: ThreadMessageListProps) {
  return messages.map((message) => (
    <ThreadMessage key={message.id} message={message} />
  ));
}`;

export const AGENT_SESSION_THREAD: ChatThread = {
  id: "agent-session-workflow",
  messages: [
    {
      attachments: [
        {
          mimeType: "image/png",
          name: "conversation-reference.png",
          size: 428_160,
          src: "https://heroui-assets.nyc3.cdn.digitaloceanspaces.com/images/egg.webp",
        },
        {
          mimeType: "text/markdown",
          name: "requirements.md",
          size: 3_584,
        },
      ],
      content:
        "参考附件中的界面，为聊天记录增加完整的 Agent 执行过程。请先检查现有组件，修改前请求审批，最后说明验证结果。",
      id: "agent-1",
      type: ChatMessageType.USER,
    },
    {
      id: "agent-2",
      label: "正在载入会话与工作区上下文",
      type: ChatMessageType.LOADING,
    },
    {
      defaultExpanded: true,
      id: "agent-3",
      steps: [
        {
          content: "读取项目约定，确认消息组件属于 chat feature，页面只负责组合。",
          label: "理解约束",
        },
        {
          content: "检查现有 ChatMessage、ChainOfThought、ChatTool 与 PromptInput 的组合方式。",
          label: "检查实现",
        },
        {
          content: "选择可辨识消息类型和单一策略表，避免在页面中继续堆叠条件分支。",
          label: "确定方案",
        },
      ],
      trigger: "已分析项目上下文",
      type: ChatMessageType.REASONING,
    },
    {
      id: "agent-4",
      label: "3 次只读工具调用",
      tools: [
        {
          input: { path: "apps/web/src/features/chat" },
          output: { entries: 12 },
          state: "output-available",
          toolCallId: "tool-list-files",
          toolName: "list_files",
        },
        {
          input: { path: "apps/web/src/features/chat", query: "ThreadMessage" },
          output: { matches: 4 },
          state: "output-available",
          toolCallId: "tool-search-text",
          toolName: "search_text",
        },
        {
          input: { path: "apps/web/src/features/chat/components/thread-message.tsx" },
          output: { lines: 166 },
          state: "output-available",
          toolCallId: "tool-read-file",
          toolName: "read_file",
        },
      ],
      type: ChatMessageType.TOOL_GROUP,
    },
    {
      id: "agent-5",
      tool: {
        argsText: '{"query":"ChatMessageRenderer","path":"apps/web/src"}',
        errorText: "未找到可复用的消息渲染策略。",
        state: "output-error",
        toolCallId: "tool-find-strategy",
        toolName: "search_text",
      },
      type: ChatMessageType.TOOL,
    },
    {
      content:
        "现有代码没有统一的消息渲染策略。我会新增一个消息列表组件，并在同一 feature 内集中注册各消息类型的渲染器。",
      id: "agent-6",
      type: ChatMessageType.ASSISTANT,
    },
    {
      id: "agent-7",
      tool: {
        argsText:
          '{"path":"apps/web/src/features/chat/components/thread-message-list.tsx","change":"新增消息策略与列表组件"}',
        input: {
          path: "apps/web/src/features/chat/components/thread-message-list.tsx",
          risk: "创建文件并调整聊天消息渲染入口",
        },
        state: "requires-action",
        toolCallId: "tool-edit-message-list",
        toolName: "write_file",
      },
      type: ChatMessageType.TOOL,
    },
    {
      content: "允许这次修改。",
      id: "agent-8",
      type: ChatMessageType.USER,
    },
    {
      id: "agent-9",
      label: "正在应用已批准的修改",
      type: ChatMessageType.STREAMING,
    },
    {
      id: "agent-10",
      label: "2 次写入工具调用",
      tools: [
        {
          input: { path: "apps/web/src/features/chat/components/thread-message-list.tsx" },
          output: { addedLines: 31, status: "written" },
          state: "output-available",
          toolCallId: "tool-write-list",
          toolName: "write_file",
        },
        {
          input: { path: "apps/web/src/features/chat/data/agent-session-thread.ts" },
          output: { addedLines: 164, status: "written" },
          state: "output-available",
          toolCallId: "tool-write-mock",
          toolName: "write_file",
        },
      ],
      type: ChatMessageType.TOOL_GROUP,
    },
    {
      code: UPDATED_COMPONENT,
      id: "agent-11",
      label: "thread-message-list.tsx",
      language: "tsx",
      type: ChatMessageType.CODE,
    },
    {
      defaultExpanded: false,
      id: "agent-12",
      label: "3 个参考来源",
      sources: [
        {
          description: "可组合的用户与助手消息布局。",
          sourceType: "url",
          title: "HeroUI Pro · Chat Message",
          url: "https://heroui.pro/docs/react/components/chat-message",
        },
        {
          description: "展示 Agent 工具输入、输出、错误与审批状态。",
          sourceType: "url",
          title: "HeroUI Pro · Chat Tool",
          url: "https://heroui.pro/docs/react/components/chat-tool",
        },
        {
          sourceType: "document",
          title: "docs/架构设计.md",
        },
      ],
      type: ChatMessageType.SOURCES,
    },
    {
      actions: "full",
      content: `已完成完整 Agent 会话 mock：

- 用户消息与附件使用 \`ChatMessage\`、\`ChatAttachment\`
- 分析过程使用 \`ChainOfThought\`
- 只读、失败、审批和写入过程使用 \`ChatTool\`、\`ChatToolGroup\`
- 代码、来源、流式状态与最终回答分别使用对应的 Pro AI 组件
- 消息列表通过统一策略表选择渲染器，页面不再识别具体消息类型

静态检查已通过，没有新增依赖。`,
      id: "agent-13",
      type: ChatMessageType.ASSISTANT,
    },
  ],
  modelId: "gpt-5.4",
  preview: "从读取上下文、工具调用、审批、写入到最终交付的完整 Agent 会话。",
  searchModeId: "deep-search",
  title: "实现 Agent 会话时间线",
  updatedAt: new Date().toISOString(),
  user: {
    avatar: "https://heroui-assets.nyc3.cdn.digitaloceanspaces.com/avatars/blue-light.jpg",
    email: "darnell@email.com",
    name: "达内尔·豪",
  },
  workspaceId: "pi-workbench",
};
