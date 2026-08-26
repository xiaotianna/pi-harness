import { TextShimmer } from "@agile-avocation/ui-pro";
import { cn } from "../../shared/utils/cn";

export interface GenerationLoaderProps {
  className?: string;
  label: string;
}

export function GenerationLoader({ className, label }: GenerationLoaderProps) {
  return (
    <div aria-label={label} className={cn("w-fit", className)} role="status">
      <TextShimmer className="text-sm">{label}</TextShimmer>
    </div>
  );
}
