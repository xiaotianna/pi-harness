"use client";

import { PromptSuggestion } from "@agile-avocation/ui-pro";
import { Card, Chip } from "@heroui/react";
import { Link } from "@tanstack/react-router";
import { LIBRARY_ITEMS } from "../data/chat";

export interface LibraryPageProps {
  basePath?: string;
}

export function LibraryPage({ basePath = "" }: LibraryPageProps) {
  return (
    <div className="h-full min-h-0 overflow-y-auto">
      <div className="mx-auto flex w-full max-w-[960px] flex-col px-4 py-8">
        <PromptSuggestion variant="card">
          <PromptSuggestion.Header>
            <PromptSuggestion.Title>已保存的提示词与可复用配置</PromptSuggestion.Title>
            <PromptSuggestion.Description>
              这里展示模板内置的提示词预设、语气规则和起始对话。保存自己的内容后，即可随时继续使用。
            </PromptSuggestion.Description>
          </PromptSuggestion.Header>

          <PromptSuggestion.Items>
            {LIBRARY_ITEMS.map((item) => {
              const href = item.threadId ? `${basePath}/${item.threadId}` : undefined;
              const card = (
                <PromptSuggestion.Item>
                  <Card.Header>
                    <PromptSuggestion.ItemTitle>{item.title}</PromptSuggestion.ItemTitle>
                    <PromptSuggestion.ItemDescription>
                      {item.description}
                    </PromptSuggestion.ItemDescription>
                  </Card.Header>
                  <PromptSuggestion.ItemFooter>
                    <PromptSuggestion.ItemTags>
                      {item.tags.map((tag) => (
                        <Chip key={tag} size="sm" variant="soft">
                          {tag}
                        </Chip>
                      ))}
                    </PromptSuggestion.ItemTags>
                    <PromptSuggestion.ItemMeta>{item.updatedAt}</PromptSuggestion.ItemMeta>
                  </PromptSuggestion.ItemFooter>
                </PromptSuggestion.Item>
              );

              return href && item.threadId ? (
                <Link
                  key={item.id}
                  className="block focus:outline-none"
                  params={{ chatId: item.threadId }}
                  to="/$chatId"
                >
                  {card}
                </Link>
              ) : (
                <div key={item.id}>{card}</div>
              );
            })}
          </PromptSuggestion.Items>
        </PromptSuggestion>
      </div>
    </div>
  );
}
