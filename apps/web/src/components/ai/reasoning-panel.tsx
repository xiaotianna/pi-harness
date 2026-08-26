import { TextShimmer } from "@agile-avocation/ui-pro";
import { Disclosure } from "@heroui/react";
import { ChevronDown } from "lucide-react";
import { cn } from "../../shared/utils/cn";
import { AssistantMarkdown } from "./assistant-markdown";

export interface ReasoningStep {
  body: string;
  title: string;
}

export interface ReasoningPanelProps {
  className?: string;
  elapsed?: string;
  onOpenChange: (open: boolean) => void;
  open: boolean;
  restingLabel: string;
  steps: readonly ReasoningStep[];
  streaming: boolean;
  visibleSteps: number;
}

export function ReasoningPanel({
  className,
  elapsed,
  onOpenChange,
  open,
  restingLabel,
  steps,
  streaming,
  visibleSteps,
}: ReasoningPanelProps) {
  const shownSteps = steps.slice(0, Math.max(0, visibleSteps));

  return (
    <Disclosure
      className={cn("w-full", className)}
      data-slot="reasoning-panel"
      isExpanded={open}
      onExpandedChange={onOpenChange}
    >
      <Disclosure.Heading>
        <Disclosure.Trigger className="group flex min-h-7 items-center gap-1.5 p-0 text-[13.5px] text-muted hover:text-foreground">
          <span className="flex min-w-0 items-center gap-1.5 text-start">
            {streaming ? (
              <TextShimmer className="shrink-0 leading-none">Thinking...</TextShimmer>
            ) : (
              <span className="shrink-0">Thinking...</span>
            )}
            <code className="min-w-0 truncate rounded-md bg-foreground/[0.06] px-1.5 py-0.5 font-mono text-xs text-foreground/70">
              {restingLabel}
            </code>
            {elapsed !== undefined ? (
              <span className="shrink-0 font-mono text-xs tabular-nums opacity-50">{elapsed}</span>
            ) : null}
          </span>
          <ChevronDown
            aria-hidden
            className="size-3.5 shrink-0 opacity-60 transition-transform duration-200 group-aria-expanded:rotate-180 motion-reduce:transition-none"
          />
        </Disclosure.Trigger>
      </Disclosure.Heading>
      <Disclosure.Content>
        <Disclosure.Body style={{ padding: 0 }}>
          <div className="max-h-52 overflow-y-auto pb-1 pt-3">
            {shownSteps.map((step, index) => (
              <AssistantMarkdown
                className={cn(
                  "text-[13px] leading-relaxed text-muted [--foreground:var(--muted)]",
                  index > 0 && "mt-4",
                )}
                key={`${step.title}-${index}`}
              >
                {step.body}
              </AssistantMarkdown>
            ))}
          </div>
        </Disclosure.Body>
      </Disclosure.Content>
    </Disclosure>
  );
}
