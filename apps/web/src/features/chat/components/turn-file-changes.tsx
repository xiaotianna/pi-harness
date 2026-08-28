"use client";

import {
  CodeCompare as GitCompareArrows,
  ArrowRotateRight as Reapply,
  ArrowUturnCcwLeft as Undo,
} from "@gravity-ui/icons";
import { AlertDialog, Button, Card, toast } from "@heroui/react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createPatch } from "diff";
import { sumBy } from "es-toolkit";
import { memo, useMemo, useState } from "react";
import { parseUnifiedDiff } from "../../../components/ai/code-diff";
import { FileIconRender } from "../../../components/ui/file-icon-render";
import { reapplySessionRunChanges, revertSessionRunChanges } from "../api/session-api";
import { sessionQueryKeys } from "../api/session-queries";
import type { ChatFileChange } from "../data/chat";
import { useWorkspaceInspectorStore } from "../state/workspace-inspector-store";

const DEFAULT_VISIBLE_FILE_COUNT = 3;

export interface TurnFileChangesProps {
  files: readonly ChatFileChange[];
  isReverted: boolean;
  sessionId: string | undefined;
  turnId: string;
}

export const TurnFileChanges = memo(function TurnFileChanges({
  files,
  isReverted,
  sessionId,
  turnId,
}: TurnFileChangesProps) {
  const queryClient = useQueryClient();
  const [isExpanded, setIsExpanded] = useState(false);
  const closeInspector = useWorkspaceInspectorStore((state) => state.close);
  const openInspector = useWorkspaceInspectorStore((state) => state.open);
  const summaries = useMemo(
    () =>
      files.map((file) => ({
        ...file,
        diff: parseUnifiedDiff(
          createPatch(file.path, file.before ?? "", file.after, "变更前", "变更后"),
        ),
      })),
    [files],
  );
  const additions = sumBy(summaries, (file) => file.diff.additions);
  const deletions = sumBy(summaries, (file) => file.diff.deletions);
  const visibleSummaries = isExpanded ? summaries : summaries.slice(0, DEFAULT_VISIBLE_FILE_COUNT);
  const hiddenFileCount = summaries.length - visibleSummaries.length;
  const changeMutation = useMutation({
    mutationFn: async (shouldReapply: boolean) => {
      if (!sessionId) throw new Error("当前会话无法修改本轮更改状态");
      await (shouldReapply
        ? reapplySessionRunChanges(sessionId, turnId)
        : revertSessionRunChanges(sessionId, turnId));
    },
    onSuccess: async (_, shouldReapply) => {
      closeInspector();
      toast.success(shouldReapply ? "已重新应用本轮更改" : "已撤销本轮更改");
      await queryClient.invalidateQueries({ queryKey: sessionQueryKeys.all });
    },
  });

  return (
    <>
      <Card
        className="mt-3 gap-0 overflow-hidden p-0 shadow-none"
        style={{
          backgroundColor: "color-mix(in oklab, var(--background) 50%, var(--surface-secondary))",
        }}
        variant="secondary"
      >
        <Card.Header className="min-h-12 flex-row items-center gap-3 px-3 py-2">
          <GitCompareArrows aria-hidden className="size-5 shrink-0 text-muted" />
          <div className="min-w-0 flex-1">
            <Card.Title className="text-sm font-medium">更改了 {files.length} 个文件</Card.Title>
            <span className="flex gap-1.5 text-xs tabular-nums">
              <span className="text-success">+{additions}</span>
              <span className="text-danger">-{deletions}</span>
            </span>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <Button
              isDisabled={!sessionId}
              isPending={changeMutation.isPending}
              size="sm"
              style={{ transform: "none" }}
              variant="ghost"
              onPress={() => changeMutation.mutate(isReverted)}
            >
              {isReverted ? (
                <Reapply aria-hidden className="size-4 text-muted" />
              ) : (
                <Undo aria-hidden className="size-4 text-muted" />
              )}
              {isReverted ? "重新应用" : "撤销"}
            </Button>
            <Button
              size="sm"
              style={{ transform: "none" }}
              variant="ghost"
              onPress={() => openInspector(turnId, files, null)}
            >
              <GitCompareArrows aria-hidden className="size-4 text-muted" />
              审核
            </Button>
          </div>
        </Card.Header>
        <Card.Content className="gap-0 border-t border-separator p-0">
          {visibleSummaries.map((file, index) => (
            <Button
              aria-label={`查看 ${file.path} 的变更`}
              className={`h-9 w-full min-w-0 justify-start rounded-none px-3 text-left text-xs ${index === 0 ? "" : "border-t border-separator"}`}
              key={file.path}
              style={{ transform: "none" }}
              variant="ghost"
              onPress={() => openInspector(turnId, files, file.path)}
            >
              <FileIconRender className="size-4 shrink-0" filePath={file.path} />
              <span
                className="min-w-0 flex-1 truncate font-normal text-foreground"
                title={file.path}
              >
                {file.path}
              </span>
              <span className="shrink-0 tabular-nums text-success">+{file.diff.additions}</span>
              <span className="shrink-0 tabular-nums text-danger">-{file.diff.deletions}</span>
            </Button>
          ))}
          {summaries.length > DEFAULT_VISIBLE_FILE_COUNT ? (
            <Button
              aria-expanded={isExpanded}
              className="h-9 w-full justify-start rounded-none border-t border-separator px-3 text-xs text-muted"
              style={{ transform: "none" }}
              variant="ghost"
              onPress={() => setIsExpanded((expanded) => !expanded)}
            >
              {isExpanded ? "收起文件" : `再显示 ${hiddenFileCount} 个文件`}
            </Button>
          ) : null}
        </Card.Content>
      </Card>

      <AlertDialog.Backdrop
        isOpen={changeMutation.isError}
        onOpenChange={(isOpen) => {
          if (!isOpen) changeMutation.reset();
        }}
      >
        <AlertDialog.Container>
          <AlertDialog.Dialog className="sm:max-w-[420px]">
            <AlertDialog.Header>
              <AlertDialog.Icon status="warning" />
              <AlertDialog.Heading>
                {changeMutation.variables ? "无法重新应用本轮更改" : "无法撤销本轮更改"}
              </AlertDialog.Heading>
            </AlertDialog.Header>
            <AlertDialog.Body>
              <p>
                {changeMutation.error instanceof Error
                  ? changeMutation.error.message
                  : "操作失败，请重试。"}
              </p>
            </AlertDialog.Body>
            <AlertDialog.Footer>
              <Button slot="close" variant="primary">
                知道了
              </Button>
            </AlertDialog.Footer>
          </AlertDialog.Dialog>
        </AlertDialog.Container>
      </AlertDialog.Backdrop>
    </>
  );
});
