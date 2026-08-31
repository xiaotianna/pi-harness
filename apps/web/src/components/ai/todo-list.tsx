import { Check, CircleExclamation, CircleMinus } from "@gravity-ui/icons";
import { LoaderCircle } from "lucide-react";
import { cn } from "../../shared/utils/cn";

export const TodoStatus = {
  BLOCKED: "blocked",
  CANCELLED: "cancelled",
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

export function TodoList({ className, items, label = "Todos", revision }: TodoListProps) {
  const done = items.filter((item) => item.status === TodoStatus.COMPLETED).length;

  return (
    <section className={cn("flex w-full max-w-sm flex-col gap-3", className)} data-slot="todo-list">
      <header className="flex items-center justify-between">
        <span className="text-[13.5px] font-medium">{label}</span>
        <span className="font-mono text-xs tabular-nums text-foreground/35">
          {done}/{items.length}
          {revision !== undefined ? ` · rev ${revision}` : null}
        </span>
      </header>
      <ul className="flex flex-col gap-2.5">
        {items.map((item) => (
          <li className="flex items-center gap-2.5 text-[13.5px]" key={item.id}>
            <span className="flex size-4 shrink-0 items-center justify-center">
              {item.status === TodoStatus.COMPLETED ? (
                <span className="flex size-3.5 items-center justify-center rounded-[5px] border border-success/25 bg-success-soft">
                  <Check aria-hidden className="size-2.5 text-success-soft-foreground" />
                </span>
              ) : item.status === TodoStatus.IN_PROGRESS ? (
                <LoaderCircle
                  aria-hidden
                  className="size-3.5 animate-spin text-accent motion-reduce:animate-none"
                />
              ) : item.status === TodoStatus.BLOCKED ? (
                <CircleExclamation aria-hidden className="size-3.5 text-danger" />
              ) : item.status === TodoStatus.CANCELLED ? (
                <CircleMinus aria-hidden className="size-3.5 text-foreground/35" />
              ) : (
                <span aria-hidden className="size-3.5 rounded-[5px] border border-foreground/15" />
              )}
            </span>
            <span
              className={cn(
                "min-w-0 flex-1 leading-5 break-words",
                item.status === TodoStatus.COMPLETED && "text-foreground/40 line-through",
                item.status === TodoStatus.CANCELLED && "text-foreground/40 line-through",
                item.status === TodoStatus.BLOCKED && "text-danger",
                item.status === TodoStatus.IN_PROGRESS && "text-foreground/90",
                item.status === TodoStatus.PENDING && "text-foreground/35",
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
