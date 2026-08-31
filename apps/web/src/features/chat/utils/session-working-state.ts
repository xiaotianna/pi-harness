import { type HarnessEvent, HarnessEventType } from "@pi-harness/agent-runtime/harness-event";
import {
  isPlanUpdatedData,
  isTodoUpdatedData,
  type PlanUpdatedData,
  type TodoUpdatedData,
} from "@pi-harness/agent-runtime/working-state";
import { findActiveRunId } from "./session-messages";

export interface SessionWorkingState {
  plan: PlanUpdatedData | null;
  todoRevision: number;
  todos: TodoUpdatedData | null;
}

export function readSessionWorkingState(events: readonly HarnessEvent[]): SessionWorkingState {
  const activeRunId = findActiveRunId(events);
  let plan: PlanUpdatedData | null = null;
  let todoRevision = 0;
  let todos: TodoUpdatedData | null = null;

  if (activeRunId === null) return { plan, todoRevision, todos };

  for (const event of events) {
    if (event.runId !== activeRunId) continue;
    if (event.type === HarnessEventType.CONTEXT_WORKING_STATE_RESET) {
      plan = null;
      todoRevision = 0;
      todos = null;
    } else if (event.type === HarnessEventType.PLAN_UPDATED && isPlanUpdatedData(event.data)) {
      plan = event.data;
    } else if (event.type === HarnessEventType.TODO_UPDATED && isTodoUpdatedData(event.data)) {
      todoRevision += 1;
      todos = event.data.todos.length === 0 ? null : event.data;
    }
  }

  return { plan, todoRevision, todos };
}
