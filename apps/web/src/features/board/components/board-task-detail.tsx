import { ArrowRight, Check, FileText, Pencil } from "@gravity-ui/icons";
import { Button, Chip, ListBox, Modal, ProgressBar, Select } from "@heroui/react";
import type { BoardTask } from "../api/board-task-api";
import {
  BOARD_TASK_COLUMNS,
  BOARD_TASK_STATUS_LABELS,
  BoardTaskStatus,
  isBoardTaskStatus,
} from "../constants/board-task";

export function BoardTaskDetail({
  onClose,
  onEdit,
  onOpenConversation,
  onStart,
  onStatusChange,
  isStarting,
  task,
}: {
  isStarting: boolean;
  onClose: () => void;
  onEdit: () => void;
  onOpenConversation: () => void;
  onStart: () => void;
  onStatusChange: (status: BoardTask["status"]) => void;
  task: BoardTask;
}) {
  return (
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
              <Select
                aria-label="任务状态"
                value={task.status}
                onChange={(key) => isBoardTaskStatus(key) && onStatusChange(key)}
                variant="secondary"
              >
                <Select.Trigger>
                  <Select.Value>{BOARD_TASK_STATUS_LABELS[task.status]}</Select.Value>
                  <Select.Indicator />
                </Select.Trigger>
                <Select.Popover className="max-w-[calc(100vw-2rem)]">
                  <ListBox>
                    {BOARD_TASK_COLUMNS.map((column) => (
                      <ListBox.Item id={column.id} key={column.id} textValue={column.label}>
                        {column.label}
                        <ListBox.ItemIndicator />
                      </ListBox.Item>
                    ))}
                  </ListBox>
                </Select.Popover>
              </Select>

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
            <Button variant="tertiary" onPress={onEdit}>
              <Pencil className="size-4" />
              编辑任务
            </Button>
            <div className="flex gap-2">
              <Button variant="tertiary" onPress={onClose}>
                关闭
              </Button>
              {task.sessionId ? (
                <Button
                  onPress={onOpenConversation}
                  variant={task.status === BoardTaskStatus.CONFIRMATION ? "secondary" : "primary"}
                >
                  进入对话
                  <ArrowRight className="size-4" />
                </Button>
              ) : (
                <Button isPending={isStarting} onPress={onStart}>
                  开始执行
                </Button>
              )}
              {task.status === BoardTaskStatus.CONFIRMATION ? (
                <Button onPress={() => onStatusChange(BoardTaskStatus.COMPLETED)}>
                  <Check className="size-4" />
                  确认完成
                </Button>
              ) : null}
            </div>
          </Modal.Footer>
        </Modal.Dialog>
      </Modal.Container>
    </Modal.Backdrop>
  );
}
