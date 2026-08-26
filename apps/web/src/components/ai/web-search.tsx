import { ChatSource, ChatSources, TextShimmer } from "@agile-avocation/ui-pro";
import { Avatar } from "@heroui/react";
import { cn } from "../../shared/utils/cn";

export interface WebSearchResult {
  domain: string;
  status?: "pending" | "resolved";
  title: string;
  url?: string;
}

export interface WebSearchProps {
  className?: string;
  results: readonly WebSearchResult[];
  searching?: boolean;
  visibleResults?: number;
}

export function WebSearch({
  className,
  results,
  searching = false,
  visibleResults = results.length,
}: WebSearchProps) {
  const shownResults = results.slice(0, visibleResults);

  return (
    <section
      aria-busy={searching}
      className={cn("flex w-full max-w-sm flex-col gap-2.5", className)}
    >
      <ChatSources className="!my-0" defaultExpanded={searching}>
        <ChatSources.Trigger>
          <span aria-hidden className="flex items-center ps-1">
            {shownResults.slice(0, 3).map((result, index) => (
              <Avatar
                className={cn(
                  "size-5 shrink-0 border-2 border-background bg-surface-secondary",
                  index > 0 && "-ms-2",
                  result.status === "pending" && "animate-pulse motion-reduce:animate-none",
                )}
                key={result.url ?? result.domain}
              >
                <Avatar.Fallback className="text-[9px]">
                  {result.domain.charAt(0).toUpperCase()}
                </Avatar.Fallback>
              </Avatar>
            ))}
          </span>
          {searching ? <TextShimmer>搜索中</TextShimmer> : `${shownResults.length} 个来源`}
        </ChatSources.Trigger>
        <ChatSources.Content>
          <ChatSources.List>
            {shownResults.map((result) => (
              <ChatSource
                className={cn(
                  result.status === "pending" && "animate-pulse motion-reduce:animate-none",
                )}
                key={result.url ?? result.domain}
                title={result.title}
                {...(result.url !== undefined ? { href: result.url } : {})}
              />
            ))}
          </ChatSources.List>
        </ChatSources.Content>
      </ChatSources>
    </section>
  );
}
