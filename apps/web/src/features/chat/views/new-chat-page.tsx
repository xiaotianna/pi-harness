"use client";

import { Sparkles } from "lucide-react";
import { useId } from "react";
import { ChatComposer } from "../components/chat-composer";

function GradientSparklesIcon() {
  const gradientId = `welcome-sparkles-${useId().replaceAll(":", "")}`;

  return (
    <Sparkles aria-hidden className="size-5" stroke={`url(#${gradientId})`}>
      <defs>
        <linearGradient
          id={gradientId}
          x1="2"
          x2="22"
          y1="2"
          y2="22"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#2563eb" />
          <stop offset="1" stopColor="#9333ea" />
        </linearGradient>
      </defs>
    </Sparkles>
  );
}

export function NewChatPage() {
  return (
    <div className="flex h-[calc(100svh-var(--chat-navbar-height,56px))] flex-col overflow-hidden">
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        <div className="mx-auto flex min-h-full w-full max-w-[720px] flex-col justify-center px-4 py-10">
          <div className="mb-8 flex flex-col gap-1">
            <div className="flex items-center gap-2 text-lg font-medium text-foreground">
              <GradientSparklesIcon />
              <span>你好</span>
            </div>
            <h1 className="text-3xl font-normal tracking-tight text-foreground sm:text-4xl">
              我们从哪里开始？
            </h1>
          </div>
          <ChatComposer className="w-full" presentation="hero" />
        </div>
      </div>
    </div>
  );
}
