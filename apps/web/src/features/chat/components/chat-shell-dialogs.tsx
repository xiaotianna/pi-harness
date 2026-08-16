"use client";

import { AlertDialog, Button, Input, Modal, TextField } from "@heroui/react";
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
                {target?.kind === "workspace" ? "重命名工作区" : "重命名对话"}
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

export interface RemoveWorkspaceDialogProps {
  onClose: () => void;
  onRemove: (workspace: ChatWorkspace) => void;
  workspace: ChatWorkspace | null;
}

export function RemoveWorkspaceDialog({
  onClose,
  onRemove,
  workspace,
}: RemoveWorkspaceDialogProps) {
  return (
    <AlertDialog.Backdrop
      isOpen={workspace !== null}
      onOpenChange={(isOpen) => {
        if (!isOpen) onClose();
      }}
    >
      <AlertDialog.Container>
        <AlertDialog.Dialog className="sm:max-w-[400px]">
          <AlertDialog.Header>
            <AlertDialog.Icon status="warning" />
            <AlertDialog.Heading>移除 {workspace?.name}？</AlertDialog.Heading>
          </AlertDialog.Header>
          <AlertDialog.Body>
            <p>该工作区及其对话将从侧边栏中移除，不会删除本地文件。</p>
          </AlertDialog.Body>
          <AlertDialog.Footer>
            <Button slot="close" variant="tertiary">
              取消
            </Button>
            <Button
              isDisabled={!workspace}
              variant="danger"
              onPress={() => {
                if (workspace) onRemove(workspace);
              }}
            >
              移除工作区
            </Button>
          </AlertDialog.Footer>
        </AlertDialog.Dialog>
      </AlertDialog.Container>
    </AlertDialog.Backdrop>
  );
}
