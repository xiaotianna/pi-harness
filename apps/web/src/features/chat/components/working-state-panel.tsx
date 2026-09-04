import { ChevronUp, ListCheck, ListTimeline } from "@gravity-ui/icons";
import { Disclosure, Separator, Surface } from "@heroui/react";
import {
  PlanStepStatus,
  type PlanUpdatedData,
  TodoStatus as RuntimeTodoStatus,
  type TodoUpdatedData,
} from "@pi-harness/agent-runtime/working-state";
import { useState } from "react";
import { AgentPlan } from "../../../components/ai/agent-plan";
import { TodoList, TodoStatus } from "../../../components/ai/todo-list";
import { cn } from "../../../shared/utils/cn";

export interface WorkingStatePanelProps {
  className?: string;
  plan: PlanUpdatedData | null;
  todoRevision: number;
  todos: TodoUpdatedData | null;
}

export function WorkingStatePanel({
  className,
  plan,
  todoRevision,
  todos,
}: WorkingStatePanelProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  if (plan === null && todos === null) return null;

  const activeIndex =
    plan?.plan.findIndex((item) => item.status !== PlanStepStatus.COMPLETED) ?? -1;
  const completedPlanSteps =
    plan?.plan.filter((item) => item.status === PlanStepStatus.COMPLETED).length ?? 0;
  const completedTodos =
    todos?.todos.filter((item) => item.status === RuntimeTodoStatus.COMPLETED).length ?? 0;
  const activePlanStep = activeIndex >= 0 ? plan?.plan[activeIndex]?.step : undefined;
  const activeTodo =
    todos?.todos.find((item) => item.status === RuntimeTodoStatus.IN_PROGRESS) ??
    todos?.todos.find(
      (item) =>
        item.status !== RuntimeTodoStatus.COMPLETED && item.status !== RuntimeTodoStatus.CANCELLED,
    );

  return (
    <Disclosure
      className={cn(
        "relative mx-auto w-[calc(100%-2rem)] pb-3 sm:w-full",
        plan && todos ? "sm:max-w-[640px]" : "sm:max-w-80",
        className,
      )}
      isExpanded={isExpanded}
      onExpandedChange={setIsExpanded}
    >
      <Disclosure.Content className="absolute inset-x-0 bottom-full z-20 mb-3 w-full">
        <Disclosure.Body style={{ padding: 0 }}>
          <Surface className="rounded-[32px] p-4">
            <div className={cn("grid gap-6", plan && todos && "sm:grid-cols-2")}>
              {plan ? (
                <AgentPlan
                  activeIndex={activeIndex === -1 ? plan.plan.length : activeIndex}
                  className="max-h-56 max-w-none"
                  label="Plans"
                  steps={plan.plan.map((item) => item.step)}
                />
              ) : null}
              {todos ? (
                <TodoList
                  className="max-h-56 max-w-none"
                  items={todos.todos.map((todo) => ({
                    id: todo.id,
                    status:
                      todo.status === RuntimeTodoStatus.IN_PROGRESS
                        ? TodoStatus.IN_PROGRESS
                        : todo.status,
                    text: todo.content,
                  }))}
                  revision={todoRevision}
                />
              ) : null}
            </div>
          </Surface>
        </Disclosure.Body>
      </Disclosure.Content>
      <Disclosure.Heading className="flex w-full items-center justify-center">
        <Disclosure.Trigger
          aria-label={isExpanded ? "收起 Plans 和 Todos" : "展开 Plans 和 Todos"}
          className="group relative flex h-10 w-full min-w-0 max-w-full items-center gap-3 rounded-full bg-surface px-4 text-sm text-foreground shadow-surface transition-colors hover:bg-surface-hover data-[focus-visible]:bg-surface-hover data-[pressed]:bg-surface-hover motion-reduce:transition-none"
        >
          {plan ? (
            <span className="flex min-w-0 flex-1 items-center justify-center gap-1.5 sm:justify-start">
              <ListTimeline aria-hidden className="size-4 shrink-0 text-accent" />
              <span className="shrink-0 font-medium">Plans</span>
              <span className="shrink-0 font-mono text-xs tabular-nums text-accent">
                {completedPlanSteps}/{plan.plan.length}
              </span>
              {activePlanStep ? (
                <span className="hidden min-w-0 max-w-40 truncate text-muted sm:inline">
                  · {activePlanStep}
                </span>
              ) : null}
            </span>
          ) : null}
          {plan && todos ? <Separator className="h-4 self-center" orientation="vertical" /> : null}
          {todos ? (
            <span className="flex min-w-0 flex-1 items-center justify-center gap-1.5 sm:justify-start">
              <ListCheck aria-hidden className="size-4 shrink-0 text-success" />
              <span className="shrink-0 font-medium">Todos</span>
              <span className="shrink-0 font-mono text-xs tabular-nums text-success">
                {completedTodos}/{todos.todos.length}
              </span>
              {activeTodo ? (
                <span className="hidden min-w-0 max-w-40 truncate text-muted sm:inline">
                  · {activeTodo.content}
                </span>
              ) : null}
            </span>
          ) : null}
          <ChevronUp
            aria-hidden
            className="absolute end-4 size-4 shrink-0 text-muted transition-transform duration-200 group-aria-expanded:rotate-180 motion-reduce:transition-none"
          />
        </Disclosure.Trigger>
      </Disclosure.Heading>
    </Disclosure>
  );
}
