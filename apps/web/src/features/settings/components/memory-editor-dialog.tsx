import { Button, Form, Label, ListBox, Modal, Select, TextArea, TextField } from "@heroui/react";
import {
  type CreateMemoryInput,
  type MemoryRecord,
  MemoryScope,
  UserProfileFacet,
} from "@pi-harness/memory/contract";
import { useId, useState } from "react";
import { isMemoryProfileFacet, MEMORY_PROFILE_FACETS } from "../constants/memory-profile";
import {
  MemoryScopeSelect,
  type MemoryScopeSelection,
  type MemoryWorkspaceOption,
} from "./memory-scope-select";

export function MemoryEditorDialog({
  entry,
  isSaving,
  onSave,
  onClose,
  workspaces,
}: {
  entry: MemoryRecord | null;
  isSaving: boolean;
  onSave: (entry: CreateMemoryInput) => Promise<void>;
  onClose: () => void;
  workspaces: readonly MemoryWorkspaceOption[];
}) {
  const formId = useId();
  const [content, setContent] = useState(entry?.content ?? "");
  const [scope, setScope] = useState<MemoryScopeSelection>({
    scope: entry?.scope ?? MemoryScope.USER,
    workspaceId: entry?.workspaceId ?? null,
  });
  const [profileFacet, setProfileFacet] = useState(
    entry?.profileFacet ?? UserProfileFacet.PREFERENCES,
  );
  return (
    <Modal.Backdrop
      isOpen
      onOpenChange={(open) => {
        if (!open && !isSaving) onClose();
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
                if (!content.trim() || isSaving) return;
                void onSave({
                  content: content.trim(),
                  profileFacet: scope.scope === MemoryScope.USER ? profileFacet : null,
                  ...scope,
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
              <MemoryScopeSelect value={scope} onChange={setScope} workspaces={workspaces} />
              {scope.scope === MemoryScope.USER ? (
                <Select
                  variant="secondary"
                  value={profileFacet}
                  onChange={(key) => {
                    if (isMemoryProfileFacet(key)) setProfileFacet(key);
                  }}
                >
                  <Label>画像分类</Label>
                  <Select.Trigger>
                    <Select.Value />
                    <Select.Indicator />
                  </Select.Trigger>
                  <Select.Popover className="max-w-[calc(100vw-2rem)]">
                    <ListBox>
                      {MEMORY_PROFILE_FACETS.map((facet) => (
                        <ListBox.Item id={facet.id} key={facet.id} textValue={facet.label}>
                          {facet.label}
                          <ListBox.ItemIndicator />
                        </ListBox.Item>
                      ))}
                    </ListBox>
                  </Select.Popover>
                </Select>
              ) : null}
              <p className="text-sm text-muted">
                个人记忆适用于所有项目，项目记忆仅在对应项目中使用。
              </p>
            </Form>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="tertiary" isDisabled={isSaving} onPress={onClose}>
              取消
            </Button>
            <Button form={formId} type="submit" isDisabled={!content.trim()} isPending={isSaving}>
              保存
            </Button>
          </Modal.Footer>
        </Modal.Dialog>
      </Modal.Container>
    </Modal.Backdrop>
  );
}
