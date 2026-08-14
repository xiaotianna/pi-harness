"use client";

import { PromptSuggestion } from "@agile-avocation/ui-pro";
import { Card } from "@heroui/react";
import { EXPLORE_CATEGORIES } from "../data/chat";

export function ExplorePage() {
  return (
    <div className="h-full min-h-0 overflow-y-auto">
      <div className="mx-auto flex w-full max-w-[960px] flex-col px-4 py-8">
        <PromptSuggestion variant="card">
          <PromptSuggestion.Header>
            <PromptSuggestion.Title>适合日常工作的起始提示词</PromptSuggestion.Title>
            <PromptSuggestion.Description>
              选择一个示例，了解这套模板适合怎样的对话。以下提示词均为模拟数据，不会发送到后端。
            </PromptSuggestion.Description>
          </PromptSuggestion.Header>

          <div className="mt-8 flex flex-col gap-8">
            {EXPLORE_CATEGORIES.map((category) => (
              <PromptSuggestion.Group
                key={category.id}
                description={category.subtitle}
                label={category.title}
              >
                <PromptSuggestion.Items>
                  {category.prompts.map((prompt) => (
                    <PromptSuggestion.Item key={prompt.id}>
                      <Card.Header>
                        <PromptSuggestion.ItemTitle>{prompt.title}</PromptSuggestion.ItemTitle>
                        <PromptSuggestion.ItemDescription>
                          {prompt.description}
                        </PromptSuggestion.ItemDescription>
                      </Card.Header>
                    </PromptSuggestion.Item>
                  ))}
                </PromptSuggestion.Items>
              </PromptSuggestion.Group>
            ))}
          </div>
        </PromptSuggestion>
      </div>
    </div>
  );
}
