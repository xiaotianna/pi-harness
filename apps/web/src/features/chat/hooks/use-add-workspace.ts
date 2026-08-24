import { useMutation, useQueryClient } from "@tanstack/react-query";
import { selectWorkspaceDirectory } from "../api/workspace-api";
import { workspaceQueryKeys } from "../api/workspace-queries";
import type { ChatWorkspace } from "../data/chat";

export function useAddWorkspace() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: selectWorkspaceDirectory,
    onSuccess: (workspace) => {
      if (!workspace) return;
      queryClient.setQueryData<readonly ChatWorkspace[]>(workspaceQueryKeys.list(), (current) => [
        workspace,
        ...(current ?? []).filter((item) => item.id !== workspace.id),
      ]);
    },
  });
}
