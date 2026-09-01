import { ListCheck, ListTimeline } from "@gravity-ui/icons";
import { Chip, Disclosure, ScrollShadow, Surface } from "@heroui/react";
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

  return (
    <Surface
      className={cn("relative -mb-6 rounded-t-[32px] bg-default pb-6", className)}
      variant="secondary"
    >
      <Disclosure isExpanded={isExpanded} onExpandedChange={setIsExpanded}>
        <Disclosure.Heading className="relative flex h-8 items-center">
          <Disclosure.Trigger
            aria-label={isExpanded ? "收起 Plans 和 Todos" : "展开 Plans 和 Todos"}
            className={cn(
              "p-0",
              isExpanded
                ? "absolute left-1/2 flex size-8 -translate-x-1/2 items-center justify-center"
                : "ml-4 flex h-8 w-fit items-center justify-start gap-2",
            )}
          >
            {isExpanded ? (
              <span className="block h-0.5 w-5 rounded-full bg-foreground/80" />
            ) : (
              <div className="flex items-center gap-2">
                {plan ? (
                  <Chip color="accent" size="sm" variant="soft">
                    <span className="flex items-center gap-1.5">
                      <ListTimeline aria-hidden className="size-3.5" />
                      Plans
                      <span className="font-mono tabular-nums">
                        {completedPlanSteps}/{plan.plan.length}
                      </span>
                    </span>
                  </Chip>
                ) : null}
                {todos ? (
                  <Chip color="success" size="sm" variant="soft">
                    <span className="flex items-center gap-1.5">
                      <ListCheck aria-hidden className="size-3.5" />
                      Todos
                      <span className="font-mono tabular-nums">
                        {completedTodos}/{todos.todos.length}
                      </span>
                    </span>
                  </Chip>
                ) : null}
              </div>
            )}
          </Disclosure.Trigger>
        </Disclosure.Heading>
        <Disclosure.Content>
          <Disclosure.Body style={{ padding: 0 }}>
            <div className={cn("grid gap-8 px-6 pb-2", plan && todos && "sm:grid-cols-2")}>
              {plan ? (
                <ScrollShadow hideScrollBar className="max-h-56 min-w-0" size={24}>
                  <AgentPlan
                    activeIndex={activeIndex === -1 ? plan.plan.length : activeIndex}
                    className="max-w-none"
                    label="Plans"
                    steps={plan.plan.map((item) => item.step)}
                  />
                </ScrollShadow>
              ) : null}
              {todos ? (
                <ScrollShadow hideScrollBar className="max-h-56 min-w-0" size={24}>
                  <TodoList
                    className="max-w-none"
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
                </ScrollShadow>
              ) : null}
            </div>
          </Disclosure.Body>
        </Disclosure.Content>
      </Disclosure>
    </Surface>
  );
}
