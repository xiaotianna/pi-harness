"use client";

import { File } from "@gravity-ui/icons";
import { Button, Checkbox, Modal, Surface, toast } from "@heroui/react";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { FileIconRender } from "../../../components/ui/file-icon-render";
import { FileOpenResultStatus } from "../../../shared/constants/file-open";
import { appSettingsQueryKeys } from "../../settings";
import { openWorkspacePath } from "../api/workspace-api";
import { useFileOpenStore } from "../state/file-open-store";

function readFileName(path: string): string {
  return path.split(/[\\/]/).filter(Boolean).at(-1) ?? path;
}

export function FileOpenDialog() {
  const queryClient = useQueryClient();
  const pending = useFileOpenStore((state) => state.pending);
  const close = useFileOpenStore((state) => state.close);
  const [isOpening, setIsOpening] = useState(false);
  const [shouldRemember, setShouldRemember] = useState(false);

  useEffect(() => {
    setShouldRemember(false);
  }, [pending]);

  const handleOpen = async () => {
    if (!pending) return;
    setIsOpening(true);
    try {
      const { status } = await openWorkspacePath(pending.workspaceId, pending.path, shouldRemember);
      if (status === FileOpenResultStatus.OPENED) {
        if (shouldRemember) {
          void queryClient.invalidateQueries({ queryKey: appSettingsQueryKeys.all });
        }
        close();
      }
    } catch (error: unknown) {
      toast.danger(error instanceof Error ? error.message : "无法使用所选应用打开文件");
    } finally {
      setIsOpening(false);
    }
  };

  return (
    <Modal.Backdrop
      isDismissable={!isOpening}
      isOpen={pending !== null}
      onOpenChange={(isOpen) => {
        if (!isOpen && !isOpening) close();
      }}
    >
      <Modal.Container>
        <Modal.Dialog className="sm:max-w-[420px]">
          <Modal.Header>
            <Modal.Heading>选择打开文件的应用</Modal.Heading>
          </Modal.Header>
          <Modal.Body className="flex flex-col gap-4">
            <Surface className="flex min-w-0 items-center gap-3 rounded-xl p-3" variant="secondary">
              {pending ? (
                <FileIconRender
                  className="size-7 shrink-0"
                  fallback={File}
                  filePath={pending.path}
                />
              ) : null}
              <p className="min-w-0 truncate text-sm font-medium text-foreground">
                {pending ? readFileName(pending.path) : "本地文件"}
              </p>
            </Surface>

            <Checkbox isSelected={shouldRemember} onChange={setShouldRemember}>
              <Checkbox.Content>
                <Checkbox.Control>
                  <Checkbox.Indicator />
                </Checkbox.Control>
                <div>
                  <p className="text-sm font-medium">以后始终使用所选应用</p>
                  <p className="mt-0.5 text-xs text-muted">可随时在通用设置中更改。</p>
                </div>
              </Checkbox.Content>
            </Checkbox>
          </Modal.Body>
          <Modal.Footer>
            <Button isDisabled={isOpening} variant="tertiary" onPress={close}>
              取消
            </Button>
            <Button isPending={isOpening} onPress={() => void handleOpen()}>
              选择应用并打开
            </Button>
          </Modal.Footer>
        </Modal.Dialog>
      </Modal.Container>
    </Modal.Backdrop>
  );
}
