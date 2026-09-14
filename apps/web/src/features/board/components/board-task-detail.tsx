import { FileText, Pencil, TrashBin } from "@gravity-ui/icons";
import { AlertDialog, Button, Chip, Dropdown, Modal, ProgressBar } from "@heroui/react";
import { useState } from "react";
import type { BoardTask } from "../api/board-task-api";
import { BOARD_TASK_STATUS_LABELS, BoardTaskStatus } from "../constants/board-task";

export function BoardTaskDetail({
  isDeleting,
  isStarting,
  onClose,
  onConfirm,
  onDelete,
  onEdit,
  onOpenConversation,
  onStart,
  task,
}: {
  isDeleting: boolean;
  isStarting: boolean;
  onClose: () => void;
  onConfirm: () => void;
  onDelete: () => void;
  onEdit: () => void;
  onOpenConversation: () => void;
  onStart: () => void;
  task: BoardTask;
}) {
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  return (
    <>
      <Modal.Backdrop isOpen onOpenChange={(open) => !open && onClose()}>
        <Modal.Container>
          <Modal.Dialog className="sm:max-w-[480px]">
            <Modal.CloseTrigger />
            <Modal.Header className="flex-row items-center gap-2 pr-16">
              <Modal.Heading className="min-w-0 truncate">{task.title}</Modal.Heading>
              <Chip className="shrink-0" size="sm" variant="soft">
                {task.workspaceName}
              </Chip>
            </Modal.Header>
            <Modal.Body>
              <div className="flex flex-col gap-5">
                <Chip className="self-start" size="sm" variant="soft">
                  {BOARD_TASK_STATUS_LABELS[task.status]}
                </Chip>

                <section>
                  <h3 className="text-sm font-medium text-foreground">目标与验收要求</h3>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-muted">
                    {task.objective || "尚未填写任务说明。"}
                  </p>
                </section>

                {task.currentStep ? (
                  <section>
                    <h3 className="text-sm font-medium text-foreground">当前步骤</h3>
                    <p className="mt-2 text-sm text-muted">{task.currentStep}</p>
                    {task.progress && task.progress.total > 0 ? (
                      <ProgressBar
                        aria-label="任务进度"
                        className="mt-3"
                        maxValue={task.progress.total}
                        value={task.progress.completed}
                      />
                    ) : null}
                  </section>
                ) : null}

                {task.attentionReason ? (
                  <section className="rounded-xl bg-danger-soft p-3 text-sm text-danger-soft-foreground">
                    <p className="font-medium">需要你处理</p>
                    <p className="mt-1">{task.attentionReason}</p>
                  </section>
                ) : null}

                <div className="flex flex-wrap items-center gap-2">
                  {task.rootRunId ? (
                    <Chip size="sm" variant="soft">
                      已关联 Run
                    </Chip>
                  ) : null}
                  {task.fileChangeCount > 0 ? (
                    <Chip size="sm" variant="soft">
                      <FileText className="size-3.5" />
                      {task.fileChangeCount} 个文件变更
                    </Chip>
                  ) : null}
                </div>
              </div>
            </Modal.Body>
            <Modal.Footer className="justify-between">
              <Dropdown>
                <Button size="sm" variant="tertiary">
                  更多
                </Button>
                <Dropdown.Popover className="max-w-[calc(100vw-2rem)]" placement="top start">
                  <Dropdown.Menu
                    aria-label={`${task.title}操作`}
                    onAction={(key) => {
                      if (key === "edit") onEdit();
                      if (key === "delete") setIsDeleteOpen(true);
                    }}
                  >
                    <Dropdown.Item id="edit" textValue="编辑任务">
                      <Pencil aria-hidden className="size-4 text-muted" />
                      编辑任务
                    </Dropdown.Item>
                    <Dropdown.Item className="text-danger" id="delete" textValue="删除任务">
                      <TrashBin aria-hidden className="size-4 text-danger" />
                      删除任务
                    </Dropdown.Item>
                  </Dropdown.Menu>
                </Dropdown.Popover>
              </Dropdown>
              <div className="flex gap-2">
                {task.sessionId ? (
                  <Button
                    onPress={onOpenConversation}
                    size="sm"
                    variant={task.status === BoardTaskStatus.CONFIRMATION ? "secondary" : "primary"}
                  >
                    进入对话
                  </Button>
                ) : (
                  <Button isPending={isStarting} onPress={onStart} size="sm">
                    开始执行
                  </Button>
                )}
                {task.status === BoardTaskStatus.CONFIRMATION ? (
                  <Button onPress={onConfirm} size="sm">
                    确认完成
                  </Button>
                ) : null}
              </div>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>

      <AlertDialog.Backdrop
        isOpen={isDeleteOpen}
        onOpenChange={(open) => {
          if (!isDeleting) setIsDeleteOpen(open);
        }}
      >
        <AlertDialog.Container>
          <AlertDialog.Dialog className="sm:max-w-[420px]">
            <AlertDialog.Header>
              <AlertDialog.Icon status="warning" />
              <AlertDialog.Heading>删除任务？</AlertDialog.Heading>
            </AlertDialog.Header>
            <AlertDialog.Body>
              <p className="break-words">“{task.title}”将从任务中心删除。</p>
              {task.sessionId ? (
                <p className="mt-3 text-sm text-muted">关联对话和工作区文件仍会保留。</p>
              ) : null}
            </AlertDialog.Body>
            <AlertDialog.Footer>
              <Button isDisabled={isDeleting} slot="close" variant="tertiary">
                取消
              </Button>
              <Button isPending={isDeleting} onPress={onDelete} variant="danger">
                删除任务
              </Button>
            </AlertDialog.Footer>
          </AlertDialog.Dialog>
        </AlertDialog.Container>
      </AlertDialog.Backdrop>
    </>
  );
}
