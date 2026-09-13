"use client";

import { CodeBlock } from "@agile-avocation/ui-pro/code-block";
import { EmptyState } from "@agile-avocation/ui-pro/empty-state";
import { ArrowLeft, ChevronRight, FileQuestion, FileXmark, FolderOpen } from "@gravity-ui/icons";
import { Alert, Button, ScrollShadow, Skeleton, Tooltip, useMediaQuery } from "@heroui/react";
import { Icon } from "@iconify/react";
import folderIcon from "@iconify-icons/vscode-icons/default-folder";
import folderOpenIcon from "@iconify-icons/vscode-icons/default-folder-opened";
import { UserContextReferenceKind } from "@pi-harness/agent-runtime/user-input";
import { useQuery } from "@tanstack/react-query";
import { useVirtualizer } from "@tanstack/react-virtual";
import type { ReactNode } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Group, Panel, Separator } from "react-resizable-panels";
import { resolveCodeLanguage } from "../../../components/ai/code-diff";
import { FileIconRender } from "../../../components/ui/file-icon-render";
import type { WorkspaceFileList } from "../api/workspace-api";
import { workspaceFileQueryOptions, workspaceFilesQueryOptions } from "../api/workspace-queries";

interface FileTreeNode {
  children: FileTreeNode[];
  kind: WorkspaceFileList["items"][number]["kind"];
  name: string;
  path: string;
}

interface VisibleFileTreeNode extends FileTreeNode {
  depth: number;
}

function WorkspaceFileEmptyState({
  description,
  icon,
  title,
}: {
  description: string;
  icon: ReactNode;
  title: string;
}) {
  return (
    <EmptyState size="sm">
      <EmptyState.Header>
        <EmptyState.Media variant="icon">{icon}</EmptyState.Media>
        <EmptyState.Title>{title}</EmptyState.Title>
        <EmptyState.Description>{description}</EmptyState.Description>
      </EmptyState.Header>
    </EmptyState>
  );
}

function buildFileTree(items: WorkspaceFileList["items"]): FileTreeNode[] {
  const nodes = new Map<string, FileTreeNode>();
  for (const item of items) {
    nodes.set(item.path, {
      children: [],
      kind: item.kind,
      name: item.path.split("/").at(-1) ?? item.path,
      path: item.path,
    });
  }

  const roots: FileTreeNode[] = [];
  for (const node of nodes.values()) {
    const parentPath = node.path.split("/").slice(0, -1).join("/");
    const parent = nodes.get(parentPath);
    if (parent) parent.children.push(node);
    else roots.push(node);
  }

  const sort = (left: FileTreeNode, right: FileTreeNode) => {
    const leftFolder = left.kind === UserContextReferenceKind.FOLDER;
    const rightFolder = right.kind === UserContextReferenceKind.FOLDER;
    return Number(rightFolder) - Number(leftFolder) || left.name.localeCompare(right.name);
  };
  for (const node of nodes.values()) node.children.sort(sort);
  return roots.sort(sort);
}

function flattenFileTree(
  nodes: readonly FileTreeNode[],
  expandedPaths: ReadonlySet<string>,
  depth = 0,
  output: VisibleFileTreeNode[] = [],
): VisibleFileTreeNode[] {
  for (const node of nodes) {
    output.push({ ...node, depth });
    if (expandedPaths.has(node.path)) {
      flattenFileTree(node.children, expandedPaths, depth + 1, output);
    }
  }
  return output;
}

function WorkspaceFilePreview({
  content,
  path,
  showHeader = true,
}: {
  content: string;
  path: string;
  showHeader?: boolean;
}) {
  return (
    <CodeBlock className="m-0! h-full rounded-none! bg-background!">
      {showHeader ? (
        <CodeBlock.Header className="h-10 shrink-0 border-b border-separator py-0!">
          <div className="flex min-w-0 items-center gap-2">
            <FileIconRender className="size-4 shrink-0" filePath={path} />
            <span className="truncate text-xs text-muted" title={path}>
              {path}
            </span>
          </div>
          <CodeBlock.CopyButton aria-label="复制文件内容" code={content} />
        </CodeBlock.Header>
      ) : null}
      <CodeBlock.Code
        className="session-scrollbar min-h-0 flex-1 overflow-auto bg-background!"
        code={content}
        language={resolveCodeLanguage(path)}
      />
    </CodeBlock>
  );
}

export function WorkspaceFilesView({ workspaceId }: { workspaceId: string }) {
  const isMobile = useMediaQuery("(max-width: 639px)");
  const filesQuery = useQuery(workspaceFilesQueryOptions(workspaceId));
  const [expandedPaths, setExpandedPaths] = useState<ReadonlySet<string>>(new Set());
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const tree = useMemo(() => buildFileTree(filesQuery.data?.items ?? []), [filesQuery.data?.items]);
  const visibleNodes = useMemo(() => flattenFileTree(tree, expandedPaths), [expandedPaths, tree]);
  const fileQuery = useQuery(workspaceFileQueryOptions(workspaceId, selectedPath));
  const scrollRef = useRef<HTMLDivElement>(null);
  const virtualizer = useVirtualizer({
    count: visibleNodes.length,
    estimateSize: () => (isMobile ? 46 : 34),
    getItemKey: (index) => visibleNodes[index]?.path ?? index,
    getScrollElement: () => scrollRef.current,
    overscan: 8,
    useFlushSync: false,
  });

  useEffect(() => {
    setExpandedPaths(new Set());
    setSelectedPath(null);
  }, [workspaceId]);

  useEffect(() => {
    virtualizer.measure();
  }, [isMobile, virtualizer]);

  if (filesQuery.isPending) {
    return (
      <div
        aria-busy
        className="grid h-full grid-cols-1 px-4 sm:grid-cols-[200px_1fr] sm:px-8"
        role="status"
      >
        <span className="sr-only">正在加载 Workspace 文件</span>
        <div className="space-y-2 p-3 sm:border-r sm:border-separator">
          {Array.from({ length: 8 }, (_, index) => (
            <Skeleton aria-hidden className="h-10 rounded-md sm:h-8" key={index} />
          ))}
        </div>
        <div className="hidden space-y-3 p-4 sm:block">
          {Array.from({ length: 10 }, (_, index) => (
            <Skeleton
              aria-hidden
              className="h-3 rounded-full"
              key={index}
              style={{ width: `${72 - (index % 4) * 9}%` }}
            />
          ))}
        </div>
      </div>
    );
  }

  if (filesQuery.isError) {
    return (
      <div className="flex h-full items-start justify-center p-6">
        <Alert status="danger">
          <Alert.Content>
            <Alert.Title>无法加载 Workspace 文件</Alert.Title>
            <Alert.Description>{filesQuery.error.message}</Alert.Description>
          </Alert.Content>
        </Alert>
      </div>
    );
  }

  const treePanel = (
    <aside className="flex h-full min-w-0 flex-col bg-background" aria-label="文件目录树">
      <div className="flex h-10 shrink-0 items-center gap-2 px-3 text-xs font-medium">
        <span>文件</span>
        <span className="font-normal tabular-nums text-muted">{filesQuery.data.items.length}</span>
      </div>
      {filesQuery.data.truncated ? (
        <p className="px-3 pb-2 text-xs text-warning">仅展示前 10,000 项</p>
      ) : null}
      {visibleNodes.length === 0 ? (
        <div className="grid min-h-0 flex-1 place-items-center px-4">
          <WorkspaceFileEmptyState
            description="Workspace 中没有可展示的文件。"
            icon={<FolderOpen className="size-5 text-muted" />}
            title="暂无文件"
          />
        </div>
      ) : (
        <ScrollShadow
          className="session-scrollbar min-h-0 flex-1 overscroll-y-contain"
          orientation="vertical"
          ref={scrollRef}
        >
          <div className="relative w-full" style={{ height: virtualizer.getTotalSize() }}>
            {virtualizer.getVirtualItems().map((virtualItem) => {
              const node = visibleNodes[virtualItem.index];
              if (!node) return null;
              const isFolder = node.kind === UserContextReferenceKind.FOLDER;
              const isExpanded = expandedPaths.has(node.path);
              return (
                <div
                  className="absolute top-0 right-0 left-0 flex items-center px-1 py-px"
                  key={virtualItem.key}
                  style={{
                    height: virtualItem.size,
                    paddingLeft: `${node.depth * 12 + 4}px`,
                    transform: `translateY(${virtualItem.start}px)`,
                  }}
                >
                  <Button
                    className="h-11 w-full justify-start gap-1.5 px-2 text-xs font-normal sm:h-8"
                    variant={selectedPath === node.path ? "secondary" : "ghost"}
                    {...(isFolder ? { "aria-expanded": isExpanded } : {})}
                    onPress={() => {
                      if (isFolder) {
                        setExpandedPaths((current) => {
                          const next = new Set(current);
                          if (next.has(node.path)) next.delete(node.path);
                          else next.add(node.path);
                          return next;
                        });
                      } else {
                        setSelectedPath(node.path);
                      }
                    }}
                  >
                    {isFolder ? (
                      <>
                        <ChevronRight
                          className={`size-3 shrink-0 text-muted ${isExpanded ? "rotate-90" : ""}`}
                        />
                        <Icon
                          aria-hidden
                          className="size-4 shrink-0"
                          icon={isExpanded ? folderOpenIcon : folderIcon}
                        />
                      </>
                    ) : (
                      <>
                        <span aria-hidden className="w-3 shrink-0" />
                        <FileIconRender className="size-4 shrink-0" filePath={node.path} />
                      </>
                    )}
                    <span className="truncate" title={node.path}>
                      {node.name}
                    </span>
                  </Button>
                </div>
              );
            })}
          </div>
        </ScrollShadow>
      )}
    </aside>
  );

  const contentPanel = (
    <section className="h-full min-w-0 bg-background" aria-label="文件内容">
      {selectedPath === null ? (
        <div className="grid h-full place-items-center px-6">
          <WorkspaceFileEmptyState
            description="从左侧目录树选择一个文件进行预览。"
            icon={<FileQuestion className="size-5 text-muted" />}
            title="选择文件"
          />
        </div>
      ) : fileQuery.isPending ? (
        <div aria-busy className="space-y-3 p-4" role="status">
          <span className="sr-only">正在读取文件</span>
          {Array.from({ length: 10 }, (_, index) => (
            <Skeleton
              aria-hidden
              className="h-3 rounded-full"
              key={index}
              style={{ width: `${76 - (index % 5) * 8}%` }}
            />
          ))}
        </div>
      ) : fileQuery.isError ? (
        <div className="grid h-full place-items-center px-6" role="alert">
          <WorkspaceFileEmptyState
            description={fileQuery.error.message}
            icon={<FileXmark className="size-5 text-danger" />}
            title="无法预览此文件"
          />
        </div>
      ) : fileQuery.data ? (
        <WorkspaceFilePreview
          content={fileQuery.data.content}
          path={fileQuery.data.path}
          showHeader={!isMobile}
        />
      ) : null}
    </section>
  );

  if (isMobile) {
    if (selectedPath === null) return <div className="h-full px-4">{treePanel}</div>;

    return (
      <div className="flex h-full min-h-0 flex-col px-4">
        <div className="flex h-10 shrink-0 items-center gap-1 border-b border-separator">
          <Tooltip delay={0}>
            <Button
              isIconOnly
              aria-label="返回文件列表"
              className="shrink-0"
              size="sm"
              variant="ghost"
              onPress={() => setSelectedPath(null)}
            >
              <ArrowLeft aria-hidden className="size-4" />
            </Button>
            <Tooltip.Content placement="bottom">返回文件列表</Tooltip.Content>
          </Tooltip>
          <FileIconRender className="size-4 shrink-0" filePath={selectedPath} />
          <span className="min-w-0 flex-1 truncate text-xs text-muted" title={selectedPath}>
            {selectedPath}
          </span>
          {fileQuery.data ? (
            <CodeBlock.CopyButton
              aria-label="复制文件内容"
              className="shrink-0"
              code={fileQuery.data.content}
            />
          ) : null}
        </div>
        <div className="min-h-0 flex-1">{contentPanel}</div>
      </div>
    );
  }

  return (
    <Group className="h-full px-8" orientation="horizontal">
      <Panel id="tree" defaultSize="200px" minSize="200px" maxSize="45%">
        {treePanel}
      </Panel>
      <Separator className="w-px bg-separator" />
      <Panel id="content" minSize="320px">
        {contentPanel}
      </Panel>
    </Group>
  );
}
