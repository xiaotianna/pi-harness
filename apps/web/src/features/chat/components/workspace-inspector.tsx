"use client";

import { CodeBlock } from "@agile-avocation/ui-pro/code-block";
import { EmptyState } from "@agile-avocation/ui-pro/empty-state";
import { FileTree } from "@agile-avocation/ui-pro/file-tree";
import { Button, Input, Tabs, TextField, Tooltip } from "@heroui/react";
import {
  FileCode2,
  FileJson2,
  FileText,
  Folder,
  FolderOpen,
  GitCompareArrows,
  Info,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";
import type { ChatThread } from "../data/chat";

export const WorkspaceInspectorTab = {
  CHANGES: "changes",
  FILES: "files",
  INFO: "info",
} as const;

export type WorkspaceInspectorTab =
  (typeof WorkspaceInspectorTab)[keyof typeof WorkspaceInspectorTab];

interface WorkspaceTreeNode {
  id: string;
  kind: "file" | "folder";
  title: string;
  children?: readonly WorkspaceTreeNode[];
}

const FILE_PREVIEWS = {
  "biome.json": {
    code: `{
  "files": {
    "includes": ["**", "!!**/dist", "!!**/node_modules"]
  },
  "formatter": {
    "enabled": true,
    "indentStyle": "space",
    "indentWidth": 2,
    "lineWidth": 100
  },
  "css": {
    "parser": {
      "tailwindDirectives": true
    }
  },
  "linter": {
    "enabled": true,
    "rules": {
      "preset": "recommended"
    }
  },
  "javascript": {
    "formatter": {
      "quoteStyle": "double",
      "semicolons": "always",
      "trailingCommas": "all"
    }
  }
}`,
    language: "json",
  },
  "apps/web/src/features/chat/components/chat-shell.tsx": {
    code: `export function ChatShell({ children }: ChatShellProps) {
  return (
    <AppLayout navbar={<ChatNavbar />} sidebar={<ChatSidebar />}>
      {children}
    </AppLayout>
  );
}`,
    language: "tsx",
  },
  "apps/web/src/features/chat/components/thread-message.tsx": {
    code: `export function ThreadMessage({ message }: ThreadMessageProps) {
  return MESSAGE_RENDER_STRATEGIES[message.type](message);
}`,
    language: "tsx",
  },
  "apps/web/src/features/chat/data/chat-message.ts": {
    code: `export const ChatMessageType = {
  ASSISTANT: "assistant",
  REASONING: "reasoning",
  TOOL: "tool",
  USER: "user",
} as const;`,
    language: "ts",
  },
  "apps/web/package.json": {
    code: `{
  "name": "@pi-workbench/web",
  "dependencies": {
    "@agile-avocation/ui-pro": "catalog:",
    "@heroui/react": "catalog:"
  }
}`,
    language: "json",
  },
} as const;

const WORKSPACE_TREE = [
  {
    id: ".agents",
    kind: "folder",
    title: ".agents",
    children: [
      {
        id: ".agents/skills",
        kind: "folder",
        title: "skills",
        children: [{ id: ".agents/skills/heroui-react/SKILL.md", kind: "file", title: "SKILL.md" }],
      },
    ],
  },
  {
    id: ".git",
    kind: "folder",
    title: ".git",
    children: [{ id: ".git/HEAD", kind: "file", title: "HEAD" }],
  },
  {
    id: ".pi-workbench",
    kind: "folder",
    title: ".pi-workbench",
    children: [{ id: ".pi-workbench/workspace.json", kind: "file", title: "workspace.json" }],
  },
  {
    id: "apps",
    kind: "folder",
    title: "apps",
    children: [
      {
        id: "apps/web",
        kind: "folder",
        title: "web",
        children: [
          {
            id: "apps/web/src",
            kind: "folder",
            title: "src",
            children: [
              {
                id: "apps/web/src/features",
                kind: "folder",
                title: "features",
                children: [
                  {
                    id: "apps/web/src/features/chat",
                    kind: "folder",
                    title: "chat",
                    children: [
                      {
                        id: "apps/web/src/features/chat/components",
                        kind: "folder",
                        title: "components",
                        children: [
                          {
                            id: "apps/web/src/features/chat/components/chat-shell.tsx",
                            kind: "file",
                            title: "chat-shell.tsx",
                          },
                          {
                            id: "apps/web/src/features/chat/components/thread-message.tsx",
                            kind: "file",
                            title: "thread-message.tsx",
                          },
                        ],
                      },
                      {
                        id: "apps/web/src/features/chat/data",
                        kind: "folder",
                        title: "data",
                        children: [
                          {
                            id: "apps/web/src/features/chat/data/chat-message.ts",
                            kind: "file",
                            title: "chat-message.ts",
                          },
                        ],
                      },
                    ],
                  },
                ],
              },
            ],
          },
          { id: "apps/web/package.json", kind: "file", title: "package.json" },
        ],
      },
    ],
  },
  {
    id: "docs",
    kind: "folder",
    title: "docs",
    children: [{ id: "docs/architecture.md", kind: "file", title: "architecture.md" }],
  },
  {
    id: "node_modules",
    kind: "folder",
    title: "node_modules",
    children: [{ id: "node_modules/.pnpm", kind: "folder", title: ".pnpm", children: [] }],
  },
  {
    id: "packages",
    kind: "folder",
    title: "packages",
    children: [
      {
        id: "packages/agent-runtime",
        kind: "folder",
        title: "agent-runtime",
        children: [
          { id: "packages/agent-runtime/package.json", kind: "file", title: "package.json" },
        ],
      },
    ],
  },
  { id: ".editorconfig", kind: "file", title: ".editorconfig" },
  { id: ".env", kind: "file", title: ".env" },
  { id: ".gitignore", kind: "file", title: ".gitignore" },
  { id: ".node-version", kind: "file", title: ".node-version" },
  { id: ".npmrc", kind: "file", title: ".npmrc" },
  { id: ".nvmrc", kind: "file", title: ".nvmrc" },
  { id: "AGENTS.md", kind: "file", title: "AGENTS.md" },
  { id: "biome.json", kind: "file", title: "biome.json" },
  { id: "package.json", kind: "file", title: "package.json" },
  { id: "pnpm-lock.yaml", kind: "file", title: "pnpm-lock.yaml" },
  { id: "pnpm-workspace.yaml", kind: "file", title: "pnpm-workspace.yaml" },
  { id: "skills-lock.json", kind: "file", title: "skills-lock.json" },
  { id: "tsconfig.base.json", kind: "file", title: "tsconfig.base.json" },
] as const satisfies readonly WorkspaceTreeNode[];

const README_DIFF = `# AIcss 组件映射

本目录承载 AI 对话中的状态展示，基础交互继续使用 HeroUI Pro。

## 当前使用 AIcss 的组件

| 本地导出 | AIcss 规范 | 项目用途 |
| --- | --- | --- |
| \`ThinkingState\` | Thinking State | 思考中的等待状态 |
| \`ThinkingReasoning\` | Thinking + Reasoning | 可展开的推理过程 |
| \`Orbs\` | Orbs | S3 资源生成进度 |
| \`WebSearch\` | Web Search | 搜索过程与来源摘要 |
| \`ImageGeneration\` | Image Generation | 图片生成状态 |
| \`TaskList\` | To-do List | 多步骤任务进度 |

## 不使用 AIcss 的消息组件

- 用户与助手消息外壳、附件、Markdown、来源和消息操作使用 HeroUI Pro。
- \`CodeBlock\` 使用 HeroUI Pro 的代码块组件。
- 单个与分组工具调用使用 HeroUI Pro 的工具调用组件。
- 输入框继续使用 HeroUI Pro \`PromptInput\`。

## 实现约定

- AIcss 免费组件按公开规范适配为受控 React 组件。
- 颜色映射到 HeroUI 语义 token。
- 动画遵循 prefers-reduced-motion。`;

function collectFiles(nodes: readonly WorkspaceTreeNode[]): WorkspaceTreeNode[] {
  return nodes.flatMap((node) =>
    node.kind === "file" ? [node] : collectFiles(node.children ?? []),
  );
}

const WORKSPACE_FILES = collectFiles(WORKSPACE_TREE);

function FolderIcon({ isExpanded }: { isExpanded: boolean }) {
  return isExpanded ? (
    <FolderOpen className="size-4 text-accent" />
  ) : (
    <Folder className="size-4 text-accent" />
  );
}

function getFileIcon(title: string) {
  if (title.endsWith(".json")) return <FileJson2 className="size-4 text-warning" />;
  if (/\.(ts|tsx)$/.test(title)) return <FileCode2 className="size-4 text-muted" />;
  return <FileText className="size-4 text-muted" />;
}

function renderTreeNode(node: WorkspaceTreeNode) {
  if (node.kind === "file") {
    return (
      <FileTree.Item key={node.id} id={node.id} icon={getFileIcon(node.title)} title={node.title} />
    );
  }

  return (
    <FileTree.Item key={node.id} id={node.id} icon={FolderIcon} title={node.title}>
      {node.children?.map(renderTreeNode)}
    </FileTree.Item>
  );
}

function FilePreview({ fileId }: { fileId: string | null }) {
  if (!fileId) {
    return (
      <div className="grid min-h-0 flex-1 place-items-center">
        <EmptyState className="px-6" size="sm">
          <EmptyState.Header>
            <EmptyState.Media variant="icon">
              <FolderOpen className="size-5" />
            </EmptyState.Media>
            <EmptyState.Title>打开文件</EmptyState.Title>
            <EmptyState.Description>从工作区目录树中选择文件</EmptyState.Description>
          </EmptyState.Header>
        </EmptyState>
      </div>
    );
  }

  const preview = FILE_PREVIEWS[fileId as keyof typeof FILE_PREVIEWS];
  const file = preview ?? { code: fileId, language: "text" };
  const fileName = fileId.split("/").at(-1) ?? fileId;

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="flex h-9 shrink-0 items-center gap-2 px-3 text-xs text-muted">
        <FileCode2 className="size-3.5" />
        <span className="truncate">{fileId}</span>
      </div>
      <CodeBlock className="min-h-0 flex-1 rounded-none! border-0!">
        <CodeBlock.Header>
          <span>{fileName}</span>
          <CodeBlock.CopyButton aria-label="复制文件内容" code={file.code} />
        </CodeBlock.Header>
        <CodeBlock.Code code={file.code} language={file.language} />
      </CodeBlock>
    </div>
  );
}

function WorkspaceFileTree({
  selectedFile,
  onSelect,
}: {
  selectedFile: string | null;
  onSelect: (fileId: string) => void;
}) {
  const [filter, setFilter] = useState("");
  const nodes = useMemo(() => {
    const query = filter.trim().toLowerCase();
    if (!query) return WORKSPACE_TREE;
    return WORKSPACE_FILES.filter(
      (file) => file.title.toLowerCase().includes(query) || file.id.toLowerCase().includes(query),
    );
  }, [filter]);

  return (
    <div className="flex min-h-0 flex-col border-l border-separator">
      <div className="shrink-0 px-2 pt-2">
        <TextField
          aria-label="筛选工作区文件"
          fullWidth
          value={filter}
          variant="secondary"
          onChange={setFilter}
        >
          <Input className="h-8 text-xs" placeholder="筛选文件..." />
        </TextField>
      </div>
      <FileTree
        aria-label="工作区文件"
        className="min-h-0 flex-1 overflow-y-auto px-1 py-2 [&_.file-tree__checkbox]:hidden"
        selectedKeys={selectedFile ? [selectedFile] : []}
        selectionMode="single"
        showGuideLines={false}
        size="sm"
        onSelectionChange={(keys) => {
          if (keys === "all") return;
          const key = [...keys][0];
          if (key && WORKSPACE_FILES.some((file) => file.id === key)) onSelect(String(key));
        }}
      >
        {nodes.map(renderTreeNode)}
      </FileTree>
    </div>
  );
}

function WorkspaceDiff() {
  return (
    <div className="h-full overflow-auto bg-background text-xs">
      <div className="sticky top-0 z-10 flex h-10 items-center gap-2 border-b border-separator bg-background px-3">
        <span className="font-semibold text-success">M↓</span>
        <span className="min-w-0 flex-1 truncate">…components/ai/aicss/README.md</span>
        <span className="tabular-nums text-success">+27</span>
        <span className="tabular-nums text-danger">-0</span>
      </div>
      <div className="font-mono leading-6">
        {README_DIFF.split("\n").map((line, index) => (
          <div
            className="grid min-w-max grid-cols-[44px_minmax(520px,1fr)] bg-success/10 text-success"
            key={`${index}-${line}`}
          >
            <span className="border-r border-success/20 px-2 text-right tabular-nums select-none">
              {index + 1}
            </span>
            <code className="px-3 whitespace-pre text-foreground">{line || " "}</code>
          </div>
        ))}
      </div>
    </div>
  );
}

export interface WorkspaceInspectorProps {
  activeTab: WorkspaceInspectorTab;
  thread: ChatThread;
  onClose: () => void;
  onTabChange: (tab: WorkspaceInspectorTab) => void;
}

export function WorkspaceInspector({
  activeTab,
  thread,
  onClose,
  onTabChange,
}: WorkspaceInspectorProps) {
  const [selectedFile, setSelectedFile] = useState<string | null>("biome.json");
  const selectedFileName = selectedFile?.split("/").at(-1) ?? "打开文件";

  return (
    <aside className="relative flex h-full w-full flex-col border-l border-separator bg-background">
      <div className="absolute top-1 right-2 z-20">
        <Tooltip delay={0}>
          <Button
            isIconOnly
            aria-label="关闭右侧面板"
            size="sm"
            variant="tertiary"
            onPress={onClose}
          >
            <X className="size-4" />
          </Button>
          <Tooltip.Content placement="bottom">关闭右侧面板</Tooltip.Content>
        </Tooltip>
      </div>

      <Tabs
        className="flex min-h-0 flex-1 flex-col gap-0!"
        selectedKey={activeTab}
        variant="primary"
        onSelectionChange={(key) => {
          if (Object.values(WorkspaceInspectorTab).includes(key as WorkspaceInspectorTab)) {
            onTabChange(key as WorkspaceInspectorTab);
          }
        }}
      >
        <Tabs.ListContainer className="shrink-0 rounded-none! border-b border-separator bg-transparent! pr-12">
          <Tabs.List aria-label="工作区面板" className="min-w-0! gap-1 p-1!">
            <Tabs.Tab className="w-auto! min-w-20 px-3!" id={WorkspaceInspectorTab.INFO}>
              <Info className="size-3.5" />
              会话
              <Tabs.Indicator />
            </Tabs.Tab>
            <Tabs.Tab className="w-auto! min-w-24 px-3!" id={WorkspaceInspectorTab.FILES}>
              {getFileIcon(selectedFileName)}
              <span className="max-w-24 truncate">{selectedFileName}</span>
              <Tabs.Indicator />
            </Tabs.Tab>
            <Tabs.Tab className="w-auto! min-w-20 px-3!" id={WorkspaceInspectorTab.CHANGES}>
              <GitCompareArrows className="size-3.5" />
              变更
              <Tabs.Indicator />
            </Tabs.Tab>
          </Tabs.List>
        </Tabs.ListContainer>

        <Tabs.Panel
          className="mt-0! min-h-0 flex-1 overflow-y-auto p-4"
          id={WorkspaceInspectorTab.INFO}
        >
          <dl className="grid grid-cols-[88px_1fr] gap-x-3 gap-y-4 text-sm">
            <dt className="text-muted">会话</dt>
            <dd className="min-w-0 truncate">{thread.title}</dd>
            <dt className="text-muted">模型</dt>
            <dd>{thread.modelId}</dd>
            <dt className="text-muted">工作区</dt>
            <dd>pi-workbench</dd>
            <dt className="text-muted">消息</dt>
            <dd className="tabular-nums">{thread.messages.length}</dd>
            <dt className="text-muted">变更</dt>
            <dd>3 个文件 · +42 −11</dd>
          </dl>
        </Tabs.Panel>

        <Tabs.Panel className="mt-0! min-h-0 flex-1 p-0" id={WorkspaceInspectorTab.FILES}>
          <div className="grid h-full min-h-0 grid-cols-[minmax(0,1fr)_180px]">
            <FilePreview fileId={selectedFile} />
            <WorkspaceFileTree selectedFile={selectedFile} onSelect={setSelectedFile} />
          </div>
        </Tabs.Panel>

        <Tabs.Panel className="mt-0! min-h-0 flex-1 p-0" id={WorkspaceInspectorTab.CHANGES}>
          <WorkspaceDiff />
        </Tabs.Panel>
      </Tabs>
    </aside>
  );
}
