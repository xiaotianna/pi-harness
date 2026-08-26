import { CircleAlert } from "lucide-react";
import { cn } from "../../shared/utils/cn";

export interface ErrorStateProps {
  className?: string;
  detail: string;
  title: string;
}

export function ErrorState({ className, detail, title }: ErrorStateProps) {
  return (
    <div
      className={cn(
        "flex w-full items-start gap-2.5 rounded-2xl bg-danger-soft px-4 py-3 text-sm",
        className,
      )}
      data-slot="error-state"
      role="alert"
    >
      <CircleAlert aria-hidden className="mt-0.5 size-4 shrink-0 text-danger" />
      <div className="min-w-0 flex-1">
        <p className="font-medium text-danger">{title}</p>
        <p className="mt-0.5 break-words text-[13px] leading-snug text-danger/70">{detail}</p>
      </div>
    </div>
  );
}
