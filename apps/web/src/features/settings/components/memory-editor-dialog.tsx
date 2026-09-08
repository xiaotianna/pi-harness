import { Button, Form, Label, Modal, TextArea, TextField } from "@heroui/react";
import { useId, useState } from "react";
import { type MemoryEntry, MemoryScope, MemoryStatus } from "../state/memory-demo-store";
import { MemoryScopeSelect } from "./memory-scope-select";

export function MemoryEditorDialog({
  entry,
  onSave,
  onClose,
}: {
  entry: MemoryEntry | null;
  onSave: (entry: MemoryEntry) => void;
  onClose: () => void;
}) {
  const formId = useId();
  const [content, setContent] = useState(entry?.content ?? "");
  const [scope, setScope] = useState<MemoryScope>(entry?.scope ?? MemoryScope.USER);
  return (
    <Modal.Backdrop
      isOpen
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <Modal.Container>
        <Modal.Dialog className="sm:max-w-[560px]">
          <Modal.CloseTrigger />
          <Modal.Header>
            <Modal.Heading>{entry ? "编辑记忆" : "添加记忆"}</Modal.Heading>
          </Modal.Header>
          <Modal.Body>
            <Form
              id={formId}
              className="flex flex-col gap-4"
              onSubmit={(event) => {
                event.preventDefault();
                if (!content.trim()) return;
                onSave({
                  id: entry?.id ?? crypto.randomUUID(),
                  content: content.trim(),
                  scope,
                  status: entry?.status ?? MemoryStatus.SAVED,
                  source: entry?.source ?? "手动添加",
                  updatedAt: "刚刚",
                });
              }}
            >
              <TextField isRequired variant="secondary" value={content} onChange={setContent}>
                <Label>记忆内容</Label>
                <TextArea
                  autoFocus
                  rows={6}
                  variant="secondary"
                  maxLength={500}
                  placeholder="例如：解释代码时，先给出一个最小可运行的例子。"
                />
                <span className="text-xs text-muted tabular-nums">{content.length} / 500</span>
              </TextField>
              <MemoryScopeSelect value={scope} onChange={setScope} />
              <p className="text-sm text-muted">
                个人记忆适用于所有项目，项目记忆仅在对应项目中使用。
              </p>
            </Form>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="tertiary" onPress={onClose}>
              取消
            </Button>
            <Button form={formId} type="submit" isDisabled={!content.trim()}>
              保存
            </Button>
          </Modal.Footer>
        </Modal.Dialog>
      </Modal.Container>
    </Modal.Backdrop>
  );
}
