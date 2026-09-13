import { toast } from "@heroui/react";
import { RunMode } from "@pi-harness/agent-runtime/user-input";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createSession, type Session, sessionQueryKeys, startSessionRun } from "../../chat";
import { providerQueryOptions } from "../../models";
import { appSettingsQueryOptions } from "../../settings";
import type { BoardTask } from "../api/board-task-api";
import { boardTaskQueryKeys } from "../api/board-task-queries";
import { resolveBoardTaskModelSelection } from "../utils/resolve-board-task-model";

export function useStartBoardTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (task: BoardTask) => {
      const [providers, settings] = await Promise.all([
        queryClient.ensureQueryData(providerQueryOptions()),
        queryClient.ensureQueryData(appSettingsQueryOptions()),
      ]);
      const model = resolveBoardTaskModelSelection(providers, settings.defaultModel);
      if (!model) throw new Error("请先在设置中配置可用模型");

      const session = await createSession({
        ...model,
        title: task.title,
        workspaceId: task.workspaceId,
      });
      const run = await startSessionRun(
        session.id,
        {
          attachments: [],
          mode: RunMode.DEFAULT,
          prompt: task.objective || task.title,
          references: [],
        },
        task.id,
      );
      return { run, session };
    },
    onError: (error: Error) => {
      toast.danger(error.message || "任务启动失败");
    },
    onSuccess: ({ run, session }) => {
      queryClient.setQueryData<readonly Session[]>(sessionQueryKeys.list(), (current) => [
        { ...session, isRunning: true, title: run.title },
        ...(current ?? []).filter((item) => item.id !== session.id),
      ]);
      void queryClient.invalidateQueries({ queryKey: boardTaskQueryKeys.list() });
      toast.success("任务已开始执行");
    },
  });
}
