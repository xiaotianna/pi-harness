import { TextShimmer } from "@agile-avocation/ui-pro";
import { cn } from "../../shared/utils/cn";

export interface ThinkingIndicatorProps {
  className?: string;
  elapsed?: string;
  label: string;
}

export function ThinkingIndicator({ className, elapsed, label }: ThinkingIndicatorProps) {
  return (
    <div className={cn("flex items-center gap-2.5 text-sm text-muted", className)} role="status">
      <TextShimmer key={label}>{label}</TextShimmer>
      {elapsed !== undefined ? (
        <span className="font-mono text-xs tabular-nums text-muted">{elapsed}</span>
      ) : null}
    </div>
  );
}
