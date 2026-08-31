import { Check } from "@gravity-ui/icons";
import { ProgressBar } from "@heroui/react";
import { LoaderCircle } from "lucide-react";
import { cn } from "../../shared/utils/cn";

export interface AgentPlanProps {
  activeIndex: number;
  className?: string;
  label?: string;
  steps: readonly string[];
}

export function AgentPlan({ activeIndex, className, label = "Plan", steps }: AgentPlanProps) {
  const currentIndex = !Number.isNaN(activeIndex)
    ? Math.min(Math.max(Math.trunc(activeIndex), 0), steps.length)
    : 0;

  return (
    <section
      className={cn("flex w-full max-w-sm flex-col gap-3", className)}
      data-slot="agent-plan"
    >
      <header className="flex items-center justify-between">
        <span className="text-[13.5px] font-medium">{label}</span>
        <span className="font-mono text-xs tabular-nums text-foreground/35">
          {currentIndex} of {steps.length}
        </span>
      </header>
      <ProgressBar
        aria-label={`${label}完成进度`}
        className="gap-0"
        color="default"
        maxValue={steps.length || 1}
        value={currentIndex}
      >
        <ProgressBar.Track className="h-[3px] bg-foreground/[0.06]">
          <ProgressBar.Fill className="bg-foreground/80 transition-[width] duration-500" />
        </ProgressBar.Track>
      </ProgressBar>
      <ul className="flex flex-col gap-2.5">
        {steps.map((step, index) => {
          const isCompleted = index < currentIndex;
          const isActive = index === currentIndex && currentIndex < steps.length;

          return (
            <li className="flex items-center gap-2.5 text-[13.5px]" key={`${index}:${step}`}>
              <span className="flex size-4 shrink-0 items-center justify-center">
                {isCompleted ? (
                  <Check aria-hidden className="size-3.5 text-success" />
                ) : isActive ? (
                  <LoaderCircle
                    aria-hidden
                    className="size-3.5 animate-spin text-accent motion-reduce:animate-none"
                  />
                ) : (
                  <span aria-hidden className="size-1.5 rounded-full bg-foreground/15" />
                )}
              </span>
              <span
                className={cn(
                  "min-w-0 flex-1 leading-5 break-words",
                  isCompleted && "text-foreground/40",
                  isActive ? "text-foreground/90" : "text-foreground/35",
                )}
              >
                {step}
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
