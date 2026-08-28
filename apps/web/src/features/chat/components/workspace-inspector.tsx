"use client";

import {
  ChevronRight,
  CodeCompare as GitCompareArrows,
  ArrowUpRightFromSquare as OpenInSystem,
  Xmark as X,
} from "@gravity-ui/icons";
import { Button, ScrollShadow, Tooltip, toast } from "@heroui/react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { createPatch } from "diff";
import { motion, useReducedMotion } from "motion/react";
import { memo, useEffect, useId, useMemo, useRef, useState } from "react";
import { CodeDiff, parseUnifiedDiff } from "../../../components/ai/code-diff";
import { FileIconRender } from "../../../components/ui/file-icon-render";
import { openWorkspacePath } from "../api/workspace-api";
import {
  type ChatFileChange,
  type ChatFileChangeStatus,
  ChatFileChangeStatus as FileChangeStatus,
} from "../data/chat";

const INSPECTOR_MOTION_TRANSITION = {
  duration: 0.22,
  ease: [0.22, 1, 0.36, 1],
} as const;

interface WorkspaceDiffFileProps {
  after: string;
  before: string | null;
  isExpanded: boolean;
  path: string;
  status: ChatFileChangeStatus;
  workspaceId: string;
  onToggle: () => void;
}

function WorkspaceDiffFile({
  after,
  before,
  isExpanded,
  path,
  status,
  workspaceId,
  onToggle,
}: WorkspaceDiffFileProps) {
  const contentId = useId();
  const shouldReduceMotion = useReducedMotion();
  const transition = shouldReduceMotion ? { duration: 0 } : INSPECTOR_MOTION_TRANSITION;
  const parsedDiff = useMemo(
    () => parseUnifiedDiff(createPatch(path, before ?? "", after, "变更前", "变更后")),
    [after, before, path],
  );

  const handleOpen = () => {
    void openWorkspacePath(workspaceId, path).catch((error: unknown) => {
      toast.danger(error instanceof Error ? error.message : "无法打开文件");
    });
  };

  return (
    <article className="w-full overflow-hidden border-b border-separator" aria-label={path}>
      <header className="flex h-11 w-full items-center gap-1 bg-background px-2 text-xs">
        <div className="flex min-w-0 flex-1 items-center gap-2 overflow-hidden px-1">
          <FileIconRender className="size-4 shrink-0" filePath={path} />
          <span className="min-w-0 flex-1 truncate text-left" title={path}>
            {path}
          </span>
          <span className="shrink-0 tabular-nums text-success">+{parsedDiff.additions}</span>
          <span className="shrink-0 tabular-nums text-danger">-{parsedDiff.deletions}</span>
        </div>
        <Tooltip delay={0}>
          <Button
            isIconOnly
            aria-controls={contentId}
            aria-expanded={isExpanded}
            aria-label={`${isExpanded ? "收起" : "展开"}：${path}`}
            className="shrink-0"
            size="sm"
            variant="ghost"
            onPress={onToggle}
          >
            <motion.span animate={{ rotate: isExpanded ? 90 : 0 }} transition={transition}>
              <ChevronRight className="size-4 text-muted" />
            </motion.span>
          </Button>
          <Tooltip.Content placement="top">
            {isExpanded ? "收起文件变更" : "展开文件变更"}
          </Tooltip.Content>
        </Tooltip>
        <Tooltip delay={0}>
          <Button
            isIconOnly
            aria-label={
              status === FileChangeStatus.DELETED ? `文件已删除：${path}` : `在系统中打开：${path}`
            }
            className="shrink-0"
            isDisabled={status === FileChangeStatus.DELETED}
            size="sm"
            variant="ghost"
            onPress={handleOpen}
          >
            <OpenInSystem className="size-4 text-muted" />
          </Button>
          <Tooltip.Content placement="top">
            {status === FileChangeStatus.DELETED ? "文件已删除" : "在系统中打开"}
          </Tooltip.Content>
        </Tooltip>
      </header>
      {isExpanded ? (
        <section
          aria-label={`${path} 变更内容`}
          className="border-t border-separator"
          id={contentId}
        >
          <CodeDiff
            ariaLabel={`${path} 变更内容`}
            className="max-h-none"
            lines={parsedDiff.lines}
            path={path}
          />
        </section>
      ) : null}
    </article>
  );
}

export interface WorkspaceInspectorProps {
  files: readonly ChatFileChange[];
  selectedPath: string | null;
  workspaceId: string;
  onClose: () => void;
}

export const WorkspaceInspector = memo(function WorkspaceInspector({
  files,
  selectedPath,
  workspaceId,
  onClose,
}: WorkspaceInspectorProps) {
  const [expandedPath, setExpandedPath] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const virtualizer = useVirtualizer({
    count: files.length,
    estimateSize: () => 44,
    getItemKey: (index) => files[index]?.path ?? index,
    getScrollElement: () => scrollRef.current,
    overscan: 6,
  });

  useEffect(() => {
    virtualizer.measure();
  }, [expandedPath, virtualizer]);

  useEffect(() => {
    setExpandedPath(selectedPath);
    if (selectedPath === null) return;
    const index = files.findIndex((file) => file.path === selectedPath);
    if (index >= 0) virtualizer.scrollToIndex(index, { align: "start" });
  }, [files, selectedPath, virtualizer]);

  return (
    <aside className="flex h-full w-full flex-col bg-background">
      <div className="flex h-12 shrink-0 items-center gap-2 border-b border-separator px-3 text-sm font-medium">
        <GitCompareArrows className="size-4 text-muted" />
        <span>本轮变更</span>
        <span className="text-xs font-normal text-muted">{files.length} 个文件</span>
        <div className="ml-auto" />
        <Tooltip delay={0}>
          <Button isIconOnly aria-label="关闭变更面板" size="sm" variant="ghost" onPress={onClose}>
            <X className="size-4" />
          </Button>
          <Tooltip.Content placement="bottom">关闭变更面板</Tooltip.Content>
        </Tooltip>
      </div>

      {files.length === 0 ? (
        <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-2 px-6 text-center">
          <GitCompareArrows className="size-8 text-muted" />
          <p className="text-sm font-medium">暂无文件变更</p>
        </div>
      ) : (
        <ScrollShadow
          className="session-scrollbar session-scrollbars min-h-0 flex-1 overscroll-y-contain"
          orientation="vertical"
          ref={scrollRef}
          style={{ contain: "strict" }}
        >
          <div className="relative w-full" style={{ height: virtualizer.getTotalSize() }}>
            {virtualizer.getVirtualItems().map((virtualItem) => {
              const file = files[virtualItem.index];
              if (!file) return null;

              return (
                <div
                  className="absolute top-0 right-0 left-0"
                  data-index={virtualItem.index}
                  key={virtualItem.key}
                  ref={virtualizer.measureElement}
                  style={{ transform: `translateY(${virtualItem.start}px)` }}
                >
                  <WorkspaceDiffFile
                    after={file.after}
                    before={file.before}
                    isExpanded={expandedPath === file.path}
                    path={file.path}
                    status={file.status}
                    workspaceId={workspaceId}
                    onToggle={() =>
                      setExpandedPath((current) => (current === file.path ? null : file.path))
                    }
                  />
                </div>
              );
            })}
          </div>
        </ScrollShadow>
      )}
    </aside>
  );
});
