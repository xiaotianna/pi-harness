import { Check, LoaderCircle } from "lucide-react";
import { cn } from "../../shared/utils/cn";

export const TodoStatus = {
  COMPLETED: "completed",
  IN_PROGRESS: "in-progress",
  PENDING: "pending",
} as const;

export type TodoStatus = (typeof TodoStatus)[keyof typeof TodoStatus];

export interface TodoItem {
  id: string;
  status: TodoStatus;
  text: string;
}

export interface TodoListProps {
  className?: string;
  items: readonly TodoItem[];
  label?: string;
  revision?: number;
}

export function TodoList({ className, items, label = "待办事项", revision }: TodoListProps) {
  const done = items.filter((item) => item.status === TodoStatus.COMPLETED).length;

  return (
    <section className={cn("flex w-full max-w-sm flex-col gap-3", className)}>
      <header className="flex items-baseline justify-between">
        <span className="text-[13.5px] font-medium">{label}</span>
        <span className="font-mono text-xs tabular-nums text-muted">
          {done}/{items.length}
          {revision !== undefined ? ` · rev ${revision}` : null}
        </span>
      </header>
      <ul className="flex flex-col gap-1">
        {items.map((item) => (
          <li className="flex items-start gap-2.5 py-0.5 text-[13.5px]" key={item.id}>
            <span className="flex size-4 h-5 shrink-0 items-center justify-center">
              {item.status === TodoStatus.COMPLETED ? (
                <span className="flex size-3.5 items-center justify-center rounded-[5px] border border-separator bg-surface-secondary">
                  <Check aria-hidden className="size-2.5 text-muted" />
                </span>
              ) : item.status === TodoStatus.IN_PROGRESS ? (
                <LoaderCircle
                  aria-hidden
                  className="size-3.5 animate-spin text-accent motion-reduce:animate-none"
                />
              ) : (
                <span aria-hidden className="size-3.5 rounded-[5px] border border-separator" />
              )}
            </span>
            <span
              className={cn(
                "min-w-0 flex-1 leading-5 break-words",
                item.status === TodoStatus.COMPLETED && "text-muted line-through",
                item.status === TodoStatus.IN_PROGRESS && "text-foreground",
                item.status === TodoStatus.PENDING && "text-muted",
              )}
            >
              {item.text}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
