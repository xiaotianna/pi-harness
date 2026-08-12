"use client";

import { PromptSuggestion } from "@agile-avocation/ui-pro";
import { ChatComposer } from "../components/chat-composer";
import { SUGGESTED_PROMPTS } from "../data/chat";

export function NewChatPage() {
  return (
    <div className="flex h-[calc(100svh-var(--chat-navbar-height,56px))] flex-col overflow-hidden">
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        <div className="mx-auto flex min-h-full w-full max-w-[714px] flex-col justify-center px-4 py-10">
          <PromptSuggestion>
            <PromptSuggestion.Header>
              <PromptSuggestion.Title>What do you want to work on?</PromptSuggestion.Title>
              <PromptSuggestion.Description>
                Ask a question or start from one of the suggestions below. This is a mock chat so
                nothing will actually be sent.
              </PromptSuggestion.Description>
            </PromptSuggestion.Header>
            <PromptSuggestion.Items>
              {SUGGESTED_PROMPTS.map((prompt) => (
                <PromptSuggestion.Item key={prompt}>{prompt}</PromptSuggestion.Item>
              ))}
            </PromptSuggestion.Items>
          </PromptSuggestion>
        </div>
      </div>

      <div className="shrink-0 bg-background px-4 pt-3 pb-4">
        <div className="mx-auto w-full max-w-[714px]">
          <ChatComposer className="w-full" />
        </div>
      </div>
    </div>
  );
}
