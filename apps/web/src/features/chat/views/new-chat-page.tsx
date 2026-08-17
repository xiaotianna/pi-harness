"use client";

import { useQuery } from "@tanstack/react-query";
import { Sparkles } from "lucide-react";
import { authSessionQueryOptions } from "../../auth";
import { ChatComposer } from "@/features/chat/components/chat-composer";
import { SparklesText } from "@/components/ui/sparkles-text";

export function NewChatPage() {
  const sessionQuery = useQuery(authSessionQueryOptions());
  const username = sessionQuery.data?.authenticated ? sessionQuery.data.user.username : "";

  return (
    <div className="flex h-[calc(100svh-var(--chat-navbar-height,56px))] flex-col overflow-hidden">
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        <div className="mx-auto flex min-h-full w-full max-w-[720px] flex-col justify-center px-4 pb-32">
          <div className="mb-4 flex flex-col gap-1">
            <div className="flex items-center gap-2 text-lg font-medium text-foreground">
              <SparklesText className="text-lg font-normal!">Hi{username ? `, ${username}` : ""}</SparklesText>
            </div>
            <h1 className="text-2xl font-normal tracking-tight text-foreground sm:text-2xl">
              我们从哪里开始？
            </h1>
          </div>
          <ChatComposer className="w-full" presentation="hero" />
        </div>
      </div>
    </div>
  );
}
