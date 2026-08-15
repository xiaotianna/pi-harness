"use client";

import { Button, Tooltip } from "@heroui/react";
import { ChevronDown, GitCompareArrows } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { useId, useState } from "react";

const INSPECTOR_MOTION_TRANSITION = {
  duration: 0.22,
  ease: [0.22, 1, 0.36, 1],
} as const;

const DiffLineType = {
  ADDED: "added",
  CONTEXT: "context",
  REMOVED: "removed",
} as const;

type DiffLineType = (typeof DiffLineType)[keyof typeof DiffLineType];

interface DiffLine {
  content: string;
  newLineNumber: number | null;
  oldLineNumber: number | null;
  type: DiffLineType;
}

interface WorkspaceDiffFileData {
  additions: number;
  deletions: number;
  id: string;
  lines: readonly DiffLine[];
  path: string;
  shortPath: string;
}

const DIFF_LINE_CLASS_NAMES: Record<DiffLineType, string> = {
  [DiffLineType.ADDED]: "bg-success/10",
  [DiffLineType.CONTEXT]: "bg-background",
  [DiffLineType.REMOVED]: "bg-danger/10",
};

const DIFF_LINE_GUTTER_CLASS_NAMES: Record<DiffLineType, string> = {
  [DiffLineType.ADDED]: "border-success/20 text-success",
  [DiffLineType.CONTEXT]: "border-separator text-muted",
  [DiffLineType.REMOVED]: "border-danger/20 text-danger",
};

const DIFF_LINE_MARKERS: Record<DiffLineType, string> = {
  [DiffLineType.ADDED]: "+",
  [DiffLineType.CONTEXT]: " ",
  [DiffLineType.REMOVED]: "-",
};

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

function createAddedDiffLines(content: string): DiffLine[] {
  return content.split("\n").map((line, index) => ({
    content: line,
    newLineNumber: index + 1,
    oldLineNumber: null,
    type: DiffLineType.ADDED,
  }));
}

const README_DIFF_LINES = createAddedDiffLines(README_DIFF);

const WORKSPACE_DIFF_FILES = [
  {
    additions: README_DIFF_LINES.length,
    deletions: 0,
    id: "aicss-readme",
    lines: README_DIFF_LINES,
    path: "apps/web/src/components/ai/aicss/README.md",
    shortPath: "…components/ai/aicss/README.md",
  },
  {
    additions: 3,
    deletions: 2,
    id: "workspace-inspector",
    lines: [
      {
        content: '"use client";',
        newLineNumber: 1,
        oldLineNumber: 1,
        type: DiffLineType.CONTEXT,
      },
      {
        content: "",
        newLineNumber: 2,
        oldLineNumber: 2,
        type: DiffLineType.CONTEXT,
      },
      {
        content: 'import { GitCompareArrows } from "lucide-react";',
        newLineNumber: null,
        oldLineNumber: 3,
        type: DiffLineType.REMOVED,
      },
      {
        content: 'import { Button, Tooltip } from "@heroui/react";',
        newLineNumber: 3,
        oldLineNumber: null,
        type: DiffLineType.ADDED,
      },
      {
        content: 'import { ChevronDown, GitCompareArrows } from "lucide-react";',
        newLineNumber: 4,
        oldLineNumber: null,
        type: DiffLineType.ADDED,
      },
      {
        content: 'import { motion, useReducedMotion } from "motion/react";',
        newLineNumber: 5,
        oldLineNumber: 4,
        type: DiffLineType.CONTEXT,
      },
      {
        content: "",
        newLineNumber: 6,
        oldLineNumber: 5,
        type: DiffLineType.CONTEXT,
      },
      {
        content: "const DIFF_MAX_HEIGHT = 640;",
        newLineNumber: null,
        oldLineNumber: 6,
        type: DiffLineType.REMOVED,
      },
      {
        content: 'const DIFF_MAX_HEIGHT = "min(70dvh, 48rem)";',
        newLineNumber: 7,
        oldLineNumber: null,
        type: DiffLineType.ADDED,
      },
      {
        content: "",
        newLineNumber: 8,
        oldLineNumber: 7,
        type: DiffLineType.CONTEXT,
      },
      {
        content: "function WorkspaceDiff() {",
        newLineNumber: 9,
        oldLineNumber: 8,
        type: DiffLineType.CONTEXT,
      },
    ],
    path: "apps/web/src/features/chat/components/workspace-inspector.tsx",
    shortPath: "…features/chat/components/workspace-inspector.tsx",
  },
] as const satisfies readonly WorkspaceDiffFileData[];

function WorkspaceDiffFile({ file }: { file: WorkspaceDiffFileData }) {
  const [isExpanded, setIsExpanded] = useState(true);
  const contentId = useId();
  const shouldReduceMotion = useReducedMotion();
  const toggleLabel = isExpanded ? "收起文件变更" : "展开文件变更";
  const transition = shouldReduceMotion ? { duration: 0 } : INSPECTOR_MOTION_TRANSITION;

  return (
    <article className="w-full overflow-hidden border-b border-separator" aria-label={file.path}>
      <header className="flex h-10 w-full items-center gap-2 bg-background px-3">
        <span className="shrink-0 font-semibold text-success">M</span>
        <span className="min-w-0 flex-1 truncate" title={file.path}>
          {file.shortPath}
        </span>
        <span className="shrink-0 tabular-nums text-success">+{file.additions}</span>
        <span className="shrink-0 tabular-nums text-danger">-{file.deletions}</span>
        <Tooltip delay={0}>
          <Button
            isIconOnly
            aria-controls={contentId}
            aria-expanded={isExpanded}
            aria-label={`${toggleLabel}：${file.path}`}
            size="sm"
            variant="ghost"
            onPress={() => setIsExpanded((expanded) => !expanded)}
          >
            <motion.span animate={{ rotate: isExpanded ? 0 : -90 }} transition={transition}>
              <ChevronDown className="size-4" />
            </motion.span>
          </Button>
          <Tooltip.Content placement="top">{toggleLabel}</Tooltip.Content>
        </Tooltip>
      </header>
      <motion.section
        animate={isExpanded ? { height: "auto", opacity: 1 } : { height: 0, opacity: 0 }}
        aria-hidden={!isExpanded}
        aria-label={`${file.path} 变更内容`}
        className="overflow-hidden border-t border-separator"
        id={contentId}
        initial={false}
        transition={transition}
      >
        <div className="max-h-[min(70dvh,48rem)] overflow-auto">
          <div className="w-max min-w-full font-mono leading-6">
            {file.lines.map((line, index) => (
              <div
                className={`grid grid-cols-[40px_40px_20px_minmax(520px,1fr)] ${DIFF_LINE_CLASS_NAMES[line.type]}`}
                key={`${file.id}-${index}-${line.content}`}
              >
                <span
                  className={`border-r px-2 text-right tabular-nums select-none ${DIFF_LINE_GUTTER_CLASS_NAMES[line.type]}`}
                >
                  {line.oldLineNumber}
                </span>
                <span
                  className={`border-r px-2 text-right tabular-nums select-none ${DIFF_LINE_GUTTER_CLASS_NAMES[line.type]}`}
                >
                  {line.newLineNumber}
                </span>
                <span
                  className={`text-center select-none ${DIFF_LINE_GUTTER_CLASS_NAMES[line.type]}`}
                >
                  {DIFF_LINE_MARKERS[line.type]}
                </span>
                <code className="pr-3 whitespace-pre text-foreground">{line.content || " "}</code>
              </div>
            ))}
          </div>
        </div>
      </motion.section>
    </article>
  );
}

function WorkspaceDiff() {
  return (
    <div className="min-h-0 flex-1 overflow-y-auto bg-background text-xs">
      {WORKSPACE_DIFF_FILES.map((file) => (
        <WorkspaceDiffFile file={file} key={file.id} />
      ))}
    </div>
  );
}

export interface WorkspaceInspectorProps {
  isOpen: boolean;
}

export function WorkspaceInspector({ isOpen }: WorkspaceInspectorProps) {
  const shouldReduceMotion = useReducedMotion();

  return (
    <motion.aside
      animate={isOpen ? { opacity: 1, x: 0 } : { opacity: 0, x: 24 }}
      className="flex h-full w-full flex-col bg-background"
      initial={false}
      transition={shouldReduceMotion ? { duration: 0 } : INSPECTOR_MOTION_TRANSITION}
    >
      <div className="flex h-12 shrink-0 items-center gap-2 px-4 text-sm font-medium">
        <GitCompareArrows className="size-4 text-muted" />
        <span>变更</span>
      </div>
      <WorkspaceDiff />
    </motion.aside>
  );
}
