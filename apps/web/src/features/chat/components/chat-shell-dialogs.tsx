"use client";

import { Button, Input, Modal, TextField } from "@heroui/react";
import type { FormEvent } from "react";
import { useState } from "react";
import type { ChatThread, ChatWorkspace } from "../data/chat";

export type ChatRenameTarget =
  | { kind: "thread"; value: ChatThread }
  | { kind: "workspace"; value: ChatWorkspace };

export interface ChatRenameDialogProps {
  onClose: () => void;
  onRename: (target: ChatRenameTarget, value: string) => void;
  target: ChatRenameTarget | null;
}

export function ChatRenameDialog({ onClose, onRename, target }: ChatRenameDialogProps) {
  const [value, setValue] = useState(() => {
    if (!target) return "";
    return target.kind === "workspace" ? target.value.name : target.value.title;
  });

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const normalizedValue = value.trim();

    if (!target || !normalizedValue) return;

    onRename(target, normalizedValue);
    onClose();
  };

  return (
    <Modal.Backdrop
      isOpen={target !== null}
      onOpenChange={(isOpen) => {
        if (!isOpen) onClose();
      }}
    >
      <Modal.Container>
        <Modal.Dialog className="sm:max-w-md">
          <form onSubmit={handleSubmit}>
            <Modal.Header>
              <Modal.Heading>
                {target?.kind === "workspace" ? "编辑工作区" : "重命名对话"}
              </Modal.Heading>
            </Modal.Header>
            <Modal.Body>
              <TextField
                aria-label={target?.kind === "workspace" ? "工作区名称" : "对话名称"}
                fullWidth
                value={value}
                variant="secondary"
                onChange={setValue}
              >
                <Input autoFocus />
              </TextField>
            </Modal.Body>
            <Modal.Footer>
              <Button type="button" variant="tertiary" onPress={onClose}>
                取消
              </Button>
              <Button isDisabled={!value.trim()} type="submit">
                保存
              </Button>
            </Modal.Footer>
          </form>
        </Modal.Dialog>
      </Modal.Container>
    </Modal.Backdrop>
  );
}
