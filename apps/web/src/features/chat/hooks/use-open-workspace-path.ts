import { toast } from "@heroui/react";
import { useCallback } from "react";
import { FileOpenResultStatus } from "../../../shared/constants/file-open";
import { openWorkspacePath } from "../api/workspace-api";
import { useFileOpenStore } from "../state/file-open-store";

export function useOpenWorkspacePath() {
  const requestApplication = useFileOpenStore((state) => state.requestApplication);

  return useCallback(
    (workspaceId: string, path: string) => {
      void openWorkspacePath(workspaceId, path)
        .then(({ status }) => {
          if (status === FileOpenResultStatus.APPLICATION_REQUIRED) {
            requestApplication({ path, workspaceId });
          }
        })
        .catch((error: unknown) => {
          toast.danger(error instanceof Error ? error.message : "无法打开本地文件");
        });
    },
    [requestApplication],
  );
}
