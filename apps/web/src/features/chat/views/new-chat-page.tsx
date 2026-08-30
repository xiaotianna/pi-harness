"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";
import { SparklesText } from "@/components/ui/sparkles-text";
import {
  ChatComposer,
  type ChatComposerSubmitInput,
} from "@/features/chat/components/chat-composer";
import { authSessionQueryOptions } from "../../auth";
import { createSession, type Session, startSessionRun } from "../api/session-api";
import { sessionQueryKeys } from "../api/session-queries";
import { workspaceListQueryOptions } from "../api/workspace-queries";
import { useAddWorkspace } from "../hooks/use-add-workspace";
import { useNewChatStore } from "../state/new-chat-store";

export function NewChatPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const sessionQuery = useQuery(authSessionQueryOptions());
  const workspacesQuery = useQuery(workspaceListQueryOptions());
  const addWorkspaceMutation = useAddWorkspace();
  const draft = useNewChatStore((state) => state.draft);
  const clearDraft = useNewChatStore((state) => state.clearDraft);
  const username = sessionQuery.data?.authenticated ? sessionQuery.data.user.username : "";
  const workspaces = workspacesQuery.data ?? [];
  const createMutation = useMutation({
    mutationFn: async (input: ChatComposerSubmitInput) => {
      const { modelId, prompt, providerId, thinkingLevel, workspaceId } = input;
      if (!workspaceId) throw new Error("请选择工作区");
      const session = await createSession({
        modelId,
        providerId,
        thinkingLevel,
        title: prompt.slice(0, 60) || input.attachments[0]?.name || "New session",
        workspaceId,
      });
      queryClient.setQueryData<readonly Session[]>(sessionQueryKeys.list(), (current) => [
        session,
        ...(current ?? []).filter((item) => item.id !== session.id),
      ]);
      await startSessionRun(session.id, input);
      return session.id;
    },
    onSuccess: (sessionId) => {
      clearDraft();
      router.history.push(`/${sessionId}`);
    },
  });

  return (
    <div className="flex h-[calc(100svh-var(--chat-navbar-height,56px))] flex-col overflow-hidden">
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        <div className="mx-auto flex min-h-full w-full max-w-[720px] flex-col justify-center px-4 pb-32">
          <div className="mb-4 flex flex-col gap-1">
            <div className="flex items-center gap-2 text-lg font-medium text-foreground">
              <SparklesText className="text-lg font-normal!">
                Hi{username ? `, ${username}` : ""}
              </SparklesText>
            </div>
            <h1 className="text-2xl font-normal tracking-tight text-foreground sm:text-2xl">
              我们从哪里开始？
            </h1>
          </div>
          <ChatComposer
            className="w-full"
            key={`new-chat-${draft?.id ?? "default"}`}
            {...(draft
              ? {
                  initialPrompt: draft.prompt,
                  ...(draft.skillLabel ? { initialSkillLabel: draft.skillLabel } : {}),
                  ...(draft.skillName ? { initialSkillName: draft.skillName } : {}),
                }
              : {})}
            isAddingWorkspace={addWorkspaceMutation.isPending}
            presentation="hero"
            status={createMutation.isPending ? "submitted" : "ready"}
            workspaces={workspaces}
            onAddWorkspace={() => addWorkspaceMutation.mutateAsync()}
            onSubmitMessage={(input) => createMutation.mutateAsync(input).then(() => undefined)}
          />
        </div>
      </div>
    </div>
  );
}
