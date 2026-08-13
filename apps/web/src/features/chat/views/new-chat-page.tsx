"use client";

import { Sparkles } from "lucide-react";
import { ChatComposer } from "../components/chat-composer";

export function NewChatPage() {
  return (
    <div className="flex h-[calc(100svh-var(--chat-navbar-height,56px))] flex-col overflow-hidden">
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        <div className="mx-auto flex min-h-full w-full max-w-[720px] flex-col justify-center px-4 py-10">
          <div className="mb-8 flex flex-col gap-1">
            <div className="flex items-center gap-2 text-lg font-medium text-foreground">
              <Sparkles className="size-5" />
              <span>Hi there</span>
            </div>
            <h1 className="text-3xl font-normal tracking-tight text-foreground sm:text-4xl">
              Where should we start?
            </h1>
          </div>
          <ChatComposer className="w-full" presentation="hero" />
        </div>
      </div>
    </div>
  );
}
