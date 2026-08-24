"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";
import { SparklesText } from "@/components/ui/sparkles-text";
import { ChatComposer } from "@/features/chat/components/chat-composer";
import { authSessionQueryOptions } from "../../auth";
import { createSession, type Session, startSessionRun } from "../api/session-api";
import { sessionListQueryOptions, sessionQueryKeys } from "../api/session-queries";
import { CHAT_WORKSPACES } from "../data/chat";
import { sessionsToWorkspaces } from "../utils/session-messages";

export function NewChatPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const sessionQuery = useQuery(authSessionQueryOptions());
  const sessionsQuery = useQuery(sessionListQueryOptions());
  const username = sessionQuery.data?.authenticated ? sessionQuery.data.user.username : "";
  const workspaces =
    sessionsQuery.data && sessionsQuery.data.length > 0
      ? sessionsToWorkspaces(sessionsQuery.data)
      : CHAT_WORKSPACES;
  const createMutation = useMutation({
    mutationFn: async ({
      modelId,
      prompt,
      providerId,
      workspaceRoot,
    }: {
      modelId: string;
      prompt: string;
      providerId: string;
      workspaceRoot?: string;
    }) => {
      if (!workspaceRoot) throw new Error("请选择工作区");
      const session = await createSession({
        modelId,
        providerId,
        title: prompt.slice(0, 60),
        workspaceRoot,
      });
      queryClient.setQueryData<readonly Session[]>(sessionQueryKeys.list(), (current) => [
        session,
        ...(current ?? []).filter((item) => item.id !== session.id),
      ]);
      await startSessionRun(session.id, prompt);
      return session.id;
    },
    onSuccess: (sessionId) => router.history.push(`/${sessionId}`),
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
            presentation="hero"
            status={createMutation.isPending ? "submitted" : "ready"}
            workspaces={workspaces}
            onSubmitMessage={(input) => createMutation.mutateAsync(input).then(() => undefined)}
          />
        </div>
      </div>
    </div>
  );
}
