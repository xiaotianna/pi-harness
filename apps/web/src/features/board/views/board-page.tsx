"use client";

import { EmptyState } from "@agile-avocation/ui-pro/empty-state";
import type { UseKanbanReturn } from "@agile-avocation/ui-pro/kanban";
import { Kanban, useKanban, useKanbanColumn } from "@agile-avocation/ui-pro/kanban";
import { CircleExclamation, Plus } from "@gravity-ui/icons";
import { Button, Chip, ProgressBar, ScrollShadow, Spinner } from "@heroui/react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { ChatNavbarActions, workspaceListQueryOptions } from "../../chat";
import {
  type BoardTask,
  type CreateBoardTaskInput,
  createBoardTask,
  updateBoardTask,
} from "../api/board-task-api";
import { boardTaskListQueryOptions, boardTaskQueryKeys } from "../api/board-task-queries";
import { BoardTaskDetail } from "../components/board-task-detail";
import { BoardTaskDialog } from "../components/board-task-dialog";
import { BOARD_TASK_COLUMNS, BoardTaskStatus, isBoardTaskStatus } from "../constants/board-task";
import { useStartBoardTask } from "../hooks/use-start-board-task";

function formatUpdatedAt(timestamp: number): string {
  const deltaMinutes = Math.max(0, Math.floor((Date.now() - timestamp) / 60_000));
  if (deltaMinutes < 1) return "刚刚更新";
  if (deltaMinutes < 60) return `${deltaMinutes} 分钟前`;
  const deltaHours = Math.floor(deltaMinutes / 60);
  if (deltaHours < 24) return `${deltaHours} 小时前`;
  return new Intl.DateTimeFormat("zh-CN", { month: "short", day: "numeric" }).format(timestamp);
}

function BoardColumn({
  column,
  kanban,
  onSelect,
}: {
  column: (typeof BOARD_TASK_COLUMNS)[number];
  kanban: UseKanbanReturn<BoardTask>;
  onSelect: (task: BoardTask) => void;
}) {
  const { dragAndDropHooks, items } = useKanbanColumn(kanban, column.id);

  return (
    <Kanban.Column className="min-h-0 overflow-hidden">
      <Kanban.ColumnHeader>
        <Kanban.ColumnIndicator style={{ backgroundColor: column.color }} />
        <Kanban.ColumnTitle>{column.label}</Kanban.ColumnTitle>
        <Kanban.ColumnCount>{items.length}</Kanban.ColumnCount>
      </Kanban.ColumnHeader>
      <Kanban.ColumnBody className="min-h-0 overflow-hidden">
        <ScrollShadow
          className="min-h-0 flex-1 overscroll-y-contain"
          hideScrollBar
          orientation="vertical"
        >
          <Kanban.CardList
            aria-label={column.label}
            dragAndDropHooks={dragAndDropHooks}
            items={items}
            renderEmptyState={() => <span className="text-sm text-muted">暂无任务</span>}
          >
            {(task) => (
              <Kanban.Card onAction={() => onSelect(task)} textValue={task.title}>
                <span
                  className={`font-semibold leading-snug text-foreground ${
                    task.status === BoardTaskStatus.COMPLETED ? "line-through opacity-60" : ""
                  }`}
                >
                  {task.title}
                </span>
                <Chip className="self-start" size="sm" variant="soft">
                  {task.workspaceName}
                </Chip>

                {task.attentionReason ? (
                  <span className="rounded-lg bg-danger-soft px-2 py-1.5 text-xs leading-5 text-danger-soft-foreground">
                    {task.attentionReason}
                  </span>
                ) : task.currentStep ? (
                  <span className="line-clamp-2 text-xs leading-5 text-muted">
                    {task.currentStep}
                  </span>
                ) : null}

                {task.progress && task.progress.total > 0 ? (
                  <span className="flex flex-col gap-1.5">
                    <span className="flex justify-between text-xs text-muted">
                      <span>进度</span>
                      <span>
                        {task.progress.completed}/{task.progress.total}
                      </span>
                    </span>
                    <ProgressBar
                      aria-label={`${task.title}进度`}
                      maxValue={task.progress.total}
                      value={task.progress.completed}
                    />
                  </span>
                ) : null}

                <span className="flex items-center justify-between gap-2">
                  <span className="flex min-w-0 items-center gap-1.5">
                    {task.fileChangeCount > 0 ? (
                      <Chip size="sm" variant="soft">
                        {task.fileChangeCount} 个文件
                      </Chip>
                    ) : null}
                  </span>
                  <span className="shrink-0 text-xs text-muted">
                    {formatUpdatedAt(task.updatedAt)}
                  </span>
                </span>
              </Kanban.Card>
            )}
          </Kanban.CardList>
        </ScrollShadow>
      </Kanban.ColumnBody>
    </Kanban.Column>
  );
}

function TaskBoard({
  onMove,
  onSelect,
  tasks,
}: {
  onMove: (task: BoardTask, status: BoardTask["status"]) => void;
  onSelect: (task: BoardTask) => void;
  tasks: readonly BoardTask[];
}) {
  const [isScrolledFromStart, setIsScrolledFromStart] = useState(false);
  const [isScrolledToEnd, setIsScrolledToEnd] = useState(false);
  const kanban = useKanban<BoardTask>({
    getColumn: (item) => item.status,
    initialItems: [...tasks],
    setColumn: (item, column) => {
      if (!isBoardTaskStatus(column) || item.status === column) return item;
      onMove(item, column);
      return { ...item, status: column };
    },
  });

  return (
    <div className="relative h-full min-h-0">
      <Kanban
        className="session-scrollbar session-scrollbars h-full"
        onScroll={(event) => {
          const bounds = event.currentTarget.getBoundingClientRect();
          const firstColumnLeft =
            event.currentTarget.firstElementChild?.getBoundingClientRect().left;
          const lastColumnRight =
            event.currentTarget.lastElementChild?.getBoundingClientRect().right;
          setIsScrolledFromStart(firstColumnLeft != null && firstColumnLeft < bounds.left - 1);
          setIsScrolledToEnd(lastColumnRight != null && lastColumnRight <= bounds.right + 1);
        }}
      >
        {BOARD_TASK_COLUMNS.map((column) => (
          <BoardColumn column={column} kanban={kanban} key={column.id} onSelect={onSelect} />
        ))}
      </Kanban>
      {isScrolledFromStart ? (
        <div
          aria-hidden
          className="pointer-events-none absolute top-0 bottom-2 left-0 z-10 w-6 bg-linear-to-r from-background to-transparent"
        />
      ) : null}
      {!isScrolledToEnd ? (
        <div
          aria-hidden
          className="pointer-events-none absolute top-0 right-0 bottom-2 z-10 w-6 bg-linear-to-l from-background to-transparent"
        />
      ) : null}
    </div>
  );
}

export function BoardPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const tasksQuery = useQuery(boardTaskListQueryOptions());
  const workspacesQuery = useQuery(workspaceListQueryOptions());
  const startTaskMutation = useStartBoardTask();
  const [selectedTask, setSelectedTask] = useState<BoardTask | null>(null);
  const [editorTask, setEditorTask] = useState<BoardTask | null | undefined>(undefined);
  const tasks = tasksQuery.data ?? [];
  const workspaces = workspacesQuery.data ?? [];

  const replaceTask = (task: BoardTask) => {
    queryClient.setQueryData<readonly BoardTask[]>(boardTaskQueryKeys.list(), (current) =>
      (current ?? []).map((item) => (item.id === task.id ? task : item)),
    );
    setSelectedTask((current) => (current?.id === task.id ? task : current));
  };

  const updateMutation = useMutation({
    mutationFn: ({ id, input }: { id: string; input: Parameters<typeof updateBoardTask>[1] }) =>
      updateBoardTask(id, input),
    onSuccess: replaceTask,
  });
  const createMutation = useMutation({
    mutationFn: createBoardTask,
    onSuccess: (task) => {
      queryClient.setQueryData<readonly BoardTask[]>(boardTaskQueryKeys.list(), (current) => [
        ...(current ?? []),
        task,
      ]);
      setEditorTask(undefined);
      setSelectedTask(task);
    },
  });

  const saveEditor = async (input: CreateBoardTaskInput) => {
    if (editorTask) {
      const updated = await updateMutation.mutateAsync({
        id: editorTask.id,
        input: { objective: input.objective, title: input.title },
      });
      setEditorTask(undefined);
      setSelectedTask(updated);
      return;
    }
    await createMutation.mutateAsync(input);
  };

  const boardKey = tasks.map((task) => `${task.id}:${task.status}:${task.updatedAt}`).join("|");

  return (
    <>
      <ChatNavbarActions>
        <Button size="sm" onPress={() => setEditorTask(null)}>
          <Plus className="size-4" />
          新建任务
        </Button>
      </ChatNavbarActions>

      <div className="flex h-full min-h-0 flex-col overflow-hidden px-4 pb-6 sm:pt-4 sm:pr-6 sm:pl-9!">
        <div className="min-h-0 flex-1">
          {tasksQuery.isPending ? (
            <div className="flex h-full items-center justify-center">
              <Spinner />
            </div>
          ) : tasksQuery.isError ? (
            <div className="flex h-full items-center justify-center">
              <EmptyState size="sm">
                <EmptyState.Header>
                  <EmptyState.Media variant="icon">
                    <CircleExclamation />
                  </EmptyState.Media>
                  <EmptyState.Title>无法读取任务</EmptyState.Title>
                  <EmptyState.Description>{tasksQuery.error.message}</EmptyState.Description>
                </EmptyState.Header>
                <EmptyState.Content>
                  <Button onPress={() => void tasksQuery.refetch()}>重新加载</Button>
                </EmptyState.Content>
              </EmptyState>
            </div>
          ) : (
            <TaskBoard
              key={boardKey}
              onMove={(task, status) => updateMutation.mutate({ id: task.id, input: { status } })}
              onSelect={setSelectedTask}
              tasks={tasks}
            />
          )}
        </div>

        {selectedTask ? (
          <BoardTaskDetail
            isStarting={
              startTaskMutation.isPending && startTaskMutation.variables?.id === selectedTask.id
            }
            onClose={() => setSelectedTask(null)}
            onEdit={() => {
              setEditorTask(selectedTask);
              setSelectedTask(null);
            }}
            onOpenConversation={() =>
              selectedTask.sessionId && router.history.push(`/${selectedTask.sessionId}`)
            }
            onStart={() =>
              startTaskMutation.mutate(selectedTask, {
                onSuccess: () => setSelectedTask(null),
              })
            }
            onStatusChange={(status) =>
              updateMutation.mutate({ id: selectedTask.id, input: { status } })
            }
            task={selectedTask}
          />
        ) : null}
        {editorTask !== undefined ? (
          <BoardTaskDialog
            isSaving={createMutation.isPending || updateMutation.isPending}
            onClose={() => setEditorTask(undefined)}
            onSave={saveEditor}
            {...(editorTask ? { task: editorTask } : {})}
            workspaces={workspaces}
          />
        ) : null}
      </div>
    </>
  );
}
