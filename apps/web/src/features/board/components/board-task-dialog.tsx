import {
  Button,
  Form,
  Input,
  Label,
  ListBox,
  Modal,
  Select,
  TextArea,
  TextField,
} from "@heroui/react";
import { useId, useState } from "react";
import type { ChatWorkspace } from "../../chat/data/chat";
import type { BoardTask, CreateBoardTaskInput } from "../api/board-task-api";

export function BoardTaskDialog({
  isSaving,
  onClose,
  onSave,
  task,
  workspaces,
}: {
  isSaving: boolean;
  onClose: () => void;
  onSave: (input: CreateBoardTaskInput) => Promise<void>;
  task?: BoardTask;
  workspaces: readonly ChatWorkspace[];
}) {
  const formId = useId();
  const [title, setTitle] = useState(task?.title ?? "");
  const [objective, setObjective] = useState(task?.objective ?? "");
  const [workspaceId, setWorkspaceId] = useState(task?.workspaceId ?? workspaces[0]?.id ?? "");
  const canSave = title.trim().length > 0 && workspaceId.length > 0 && !isSaving;

  return (
    <Modal.Backdrop isOpen onOpenChange={(open) => !open && !isSaving && onClose()}>
      <Modal.Container>
        <Modal.Dialog className="sm:max-w-[560px]">
          <Modal.CloseTrigger />
          <Modal.Header>
            <Modal.Heading>{task ? "编辑任务" : "新建任务"}</Modal.Heading>
          </Modal.Header>
          <Modal.Body>
            <Form
              className="flex flex-col gap-4"
              id={formId}
              onSubmit={(event) => {
                event.preventDefault();
                if (!canSave) return;
                void onSave({ objective: objective.trim(), title: title.trim(), workspaceId });
              }}
            >
              <TextField isRequired value={title} onChange={setTitle} variant="secondary">
                <Label>任务标题</Label>
                <Input autoFocus maxLength={200} placeholder="例如：实现任务看板" />
              </TextField>
              <TextField value={objective} onChange={setObjective} variant="secondary">
                <Label>目标与验收要求</Label>
                <TextArea
                  maxLength={20_000}
                  placeholder="说明要完成什么、哪些结果可以视为完成"
                  rows={6}
                />
              </TextField>
              <Select
                isDisabled={task !== undefined}
                value={workspaceId}
                onChange={(key) => typeof key === "string" && setWorkspaceId(key)}
                variant="secondary"
              >
                <Label>Workspace</Label>
                <Select.Trigger>
                  <Select.Value />
                  <Select.Indicator />
                </Select.Trigger>
                <Select.Popover className="max-w-[calc(100vw-2rem)]">
                  <ListBox>
                    {workspaces.map((workspace) => (
                      <ListBox.Item id={workspace.id} key={workspace.id} textValue={workspace.name}>
                        {workspace.name}
                        <ListBox.ItemIndicator />
                      </ListBox.Item>
                    ))}
                  </ListBox>
                </Select.Popover>
              </Select>
            </Form>
          </Modal.Body>
          <Modal.Footer>
            <Button isDisabled={isSaving} onPress={onClose} variant="tertiary">
              取消
            </Button>
            <Button form={formId} isDisabled={!canSave} isPending={isSaving} type="submit">
              {task ? "保存" : "创建任务"}
            </Button>
          </Modal.Footer>
        </Modal.Dialog>
      </Modal.Container>
    </Modal.Backdrop>
  );
}
