import { ChatSource, TextShimmer } from "@agile-avocation/ui-pro";
import { CircleExclamation, Magnifier } from "@gravity-ui/icons";
import { motion, useReducedMotion } from "motion/react";
import { cn } from "../../shared/utils/cn";

export interface WebSearchResult {
  description?: string;
  domain: string;
  status?: "pending" | "resolved";
  title: string;
  url?: string;
}

export interface WebSearchProps {
  className?: string;
  error?: string;
  query: string;
  results: readonly WebSearchResult[];
  searching?: boolean;
  visibleResults?: number;
}

export function WebSearch({
  className,
  error,
  query,
  results,
  searching = false,
  visibleResults = results.length,
}: WebSearchProps) {
  const shouldReduceMotion = useReducedMotion();
  const shownResults = results.slice(0, Math.max(0, Math.min(visibleResults, results.length)));

  if (error) {
    return (
      <div className={cn("flex min-h-7 max-w-sm items-center gap-2 text-[13.5px]", className)}>
        <CircleExclamation aria-hidden className="size-4 shrink-0 text-danger" />
        <span className="shrink-0 text-danger">网页搜索失败</span>
        <span className="min-w-0 truncate text-muted" title={error}>
          {error}
        </span>
      </div>
    );
  }

  if (searching && shownResults.length === 0) {
    return (
      <div
        aria-live="polite"
        className={cn("flex min-h-7 max-w-sm min-w-0 items-center gap-2 text-[13.5px]", className)}
        role="status"
      >
        <Magnifier aria-hidden className="size-4 shrink-0 text-muted" />
        <TextShimmer className="shrink-0 leading-none">正在搜索网页</TextShimmer>
        <span className="min-w-0 truncate text-muted" title={query}>
          {query}
        </span>
      </div>
    );
  }

  if (shownResults.length === 0) {
    return (
      <div
        className={cn("flex min-h-7 max-w-sm min-w-0 items-center gap-2 text-[13.5px]", className)}
      >
        <Magnifier aria-hidden className="size-4 shrink-0 text-muted" />
        <span className="shrink-0 text-muted">未找到网页来源</span>
        <span className="min-w-0 truncate text-muted/70" title={query}>
          {query}
        </span>
      </div>
    );
  }

  return (
    <section aria-busy={searching} className={cn("flex w-full flex-col gap-2", className)}>
      <div className="flex min-h-7 min-w-0 items-center gap-2 text-[13.5px] text-muted">
        <Magnifier aria-hidden className="size-4 shrink-0" />
        {searching ? (
          <TextShimmer className="shrink-0 leading-none">正在搜索网页</TextShimmer>
        ) : (
          <span className="shrink-0">已搜索网页</span>
        )}
        <span className="min-w-0 truncate" title={query}>
          {query}
        </span>
      </div>
      <ul aria-label={`${shownResults.length} 个网页来源`} className="flex w-full flex-wrap gap-2">
        {shownResults.map((result, index) => (
          <motion.li
            animate={{ opacity: 1, y: 0 }}
            className="list-none"
            initial={shouldReduceMotion ? false : { opacity: 0, y: 4 }}
            key={result.url ?? result.domain}
            transition={{ delay: shouldReduceMotion ? 0 : index * 0.04, duration: 0.18 }}
          >
            <ChatSource
              className={cn(
                result.status === "pending" && "animate-pulse motion-reduce:animate-none",
              )}
              enablePreview
              title={result.title}
              {...(result.description === undefined ? {} : { description: result.description })}
              {...(result.url === undefined
                ? {}
                : {
                    faviconUrl: `https://icons.duckduckgo.com/ip3/${encodeURIComponent(result.domain)}.ico`,
                    href: result.url,
                  })}
            />
          </motion.li>
        ))}
      </ul>
    </section>
  );
}
