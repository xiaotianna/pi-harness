import { TextShimmer } from "@agile-avocation/ui-pro";
import { Check, ChevronRight, Xmark as X } from "@gravity-ui/icons";
import { Disclosure, Separator } from "@heroui/react";
import { cn } from "../../shared/utils/cn";

export interface ToolCallProps {
  activeLabel: string;
  className?: string;
  failed?: boolean;
  label: string;
  onOpenChange: (open: boolean) => void;
  open: boolean;
  query: string;
  request: string;
  result: string;
  running: boolean;
}

export function ToolCall({
  activeLabel,
  className,
  failed = false,
  label,
  onOpenChange,
  open,
  query,
  request,
  result,
  running,
}: ToolCallProps) {
  return (
    <Disclosure
      className={cn("w-full max-w-sm", className)}
      data-slot="tool-call"
      isExpanded={open}
      onExpandedChange={onOpenChange}
    >
      <Disclosure.Heading>
        <Disclosure.Trigger className="group flex min-h-7 w-full min-w-0 items-center gap-2 p-0 text-[13.5px] text-muted hover:text-foreground">
          <ChevronRight
            aria-hidden
            className="size-3.5 shrink-0 opacity-60 transition-transform duration-200 group-aria-expanded:rotate-90 motion-reduce:transition-none"
          />
          <span className="shrink-0 whitespace-nowrap text-start">
            {running ? <TextShimmer className="leading-none">{activeLabel}</TextShimmer> : label}
          </span>
          <span
            className="min-w-0 max-w-64 truncate whitespace-nowrap rounded-md bg-foreground/[0.06] px-1.5 py-0.5 text-start font-mono text-xs text-foreground/70"
            title={query}
          >
            {query}
          </span>
          {!running ? (
            <span className="flex size-4 shrink-0 items-center justify-center">
              {failed ? (
                <X aria-hidden className="size-3.5 text-danger" />
              ) : (
                <Check aria-hidden className="size-3.5 text-success" />
              )}
            </span>
          ) : null}
        </Disclosure.Trigger>
      </Disclosure.Heading>
      <Disclosure.Content>
        <Disclosure.Body>
          <div className="mt-2 overflow-hidden rounded-2xl bg-surface-secondary text-xs">
            <div className="px-3.5 pb-2 pt-2.5">
              <p className="mb-1 font-mono text-muted">请求</p>
              <pre className="whitespace-pre-wrap break-words font-mono text-foreground/70">
                {request}
              </pre>
            </div>
            {!running || result ? (
              <>
                <Separator className="mx-3.5" />
                <div className="px-3.5 pb-2.5 pt-2">
                  <p className="mb-1 font-mono text-muted">{running ? "实时输出" : "结果"}</p>
                  <pre
                    className={cn(
                      "max-h-52 overflow-auto whitespace-pre-wrap break-words font-mono",
                      failed ? "text-danger" : "text-foreground",
                    )}
                  >
                    {result}
                  </pre>
                </div>
              </>
            ) : null}
          </div>
        </Disclosure.Body>
      </Disclosure.Content>
    </Disclosure>
  );
}
