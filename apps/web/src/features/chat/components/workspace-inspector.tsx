"use client";

import { ChevronDown, CodeCompare as GitCompareArrows } from "@gravity-ui/icons";
import { Button, Tooltip } from "@heroui/react";
import { motion, useReducedMotion } from "motion/react";
import { memo, useId, useState } from "react";
import { CodeDiff, type DiffLine, DiffLineType } from "../../../components/ai/code-diff";

const INSPECTOR_MOTION_TRANSITION = {
  duration: 0.22,
  ease: [0.22, 1, 0.36, 1],
} as const;

interface WorkspaceDiffFileData {
  additions: number;
  deletions: number;
  id: string;
  lines: readonly DiffLine[];
  path: string;
  shortPath: string;
}

const README_DIFF = `# AI 组件映射

本目录承载 AI 对话中的状态展示，并适配项目已有的 HeroUI 与 HeroUI Pro。

| 本地组件 | 来源组件 | 项目用途 |
| --- | --- | --- |
| \`GenerationLoader\` | Loading state | 等待与生成状态 |
| \`ThinkingIndicator\` | Thinking indicator | 当前思考状态 |
| \`ReasoningPanel\` | Reasoning panel | 可展开的推理过程 |
| \`WebSearch\` | Chat Source | Stacked Favicons + Grouped 来源摘要 |
| \`ImageGeneration\` | Image generation | 图片生成状态 |
| \`TodoList\` | Todo list | 多步骤任务进度 |

## 现有消息组件

- 用户与助手消息外壳、附件、Markdown、来源和消息操作使用 HeroUI Pro。
- \`CodeBlock\` 使用 HeroUI Pro 的代码块组件。
- 单个与分组工具调用使用 assistant-ui Tool call。
- 输入框继续使用 HeroUI Pro \`PromptInput\`。

## 实现约定

- 每个 assistant-ui Element 独立成文件。
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
    id: "assistant-ui-readme",
    lines: README_DIFF_LINES,
    path: "apps/web/src/components/ai/README.md",
    shortPath: "…components/ai/README.md",
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
        content: 'import { CodeCompare } from "@gravity-ui/icons";',
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
        content: 'import { ChevronDown, CodeCompare } from "@gravity-ui/icons";',
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
        <CodeDiff
          ariaLabel={`${file.path} 变更内容`}
          className="max-h-none"
          lines={file.lines}
          path={file.path}
        />
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

export const WorkspaceInspector = memo(function WorkspaceInspector({
  isOpen,
}: WorkspaceInspectorProps) {
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
});
