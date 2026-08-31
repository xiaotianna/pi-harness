import type { AgentTool } from "@earendil-works/pi-agent-core";
import { type Static, Type } from "typebox";
import { Value } from "typebox/value";

export const TodoStatus = {
  BLOCKED: "blocked",
  CANCELLED: "cancelled",
  COMPLETED: "completed",
  IN_PROGRESS: "in_progress",
  PENDING: "pending",
} as const;

export type TodoStatus = (typeof TodoStatus)[keyof typeof TodoStatus];

const TodoItemFields = {
  content: Type.String({ maxLength: 1_000, minLength: 1 }),
  id: Type.String({ maxLength: 100, minLength: 1 }),
  planStepId: Type.Optional(Type.String({ maxLength: 100, minLength: 1 })),
  status: Type.Union([
    Type.Literal(TodoStatus.PENDING),
    Type.Literal(TodoStatus.IN_PROGRESS),
    Type.Literal(TodoStatus.COMPLETED),
    Type.Literal(TodoStatus.BLOCKED),
    Type.Literal(TodoStatus.CANCELLED),
  ]),
};

const TodoInputItemSchema = Type.Object(TodoItemFields);
const TodoItemSchema = Type.Object({
  ...TodoItemFields,
  evidence: Type.Optional(
    Type.Array(Type.String({ maxLength: 200, minLength: 1, pattern: "^tool:.+" }), {
      maxItems: 8,
    }),
  ),
});

const TodoInputFields = {
  todos: Type.Array(TodoInputItemSchema, { maxItems: 64 }),
};

const TodoDataFields = {
  todos: Type.Array(TodoItemSchema, { maxItems: 64 }),
};

const UpdateTodosParameters = Type.Object(TodoInputFields);
const TodoUpdatedDataSchema = Type.Object({
  ...TodoDataFields,
  updatedAt: Type.Integer({ minimum: 0 }),
});

export type TodoUpdatedData = Static<typeof TodoUpdatedDataSchema>;
export type TodoUpdateHandler = (
  data: TodoUpdatedData,
) => Promise<TodoUpdatedData> | TodoUpdatedData;

export function isTodoUpdatedData(value: unknown): value is TodoUpdatedData {
  return Value.Check(TodoUpdatedDataSchema, value);
}

export function attachSuccessfulTodoEvidence(
  data: TodoUpdatedData,
  successfulToolCallIds: readonly string[],
): TodoUpdatedData {
  const evidence = successfulToolCallIds.slice(-8).map((toolCallId) => `tool:${toolCallId}`);
  return {
    ...data,
    todos: data.todos.map((todo) => {
      if (todo.status !== TodoStatus.COMPLETED) return todo;
      if (evidence.length === 0) {
        throw new Error(`Todo ${todo.id} 完成前至少需要一个成功工具结果`);
      }
      return { ...todo, evidence };
    }),
  };
}

export function createUpdateTodosTool(
  onUpdate: TodoUpdateHandler,
): AgentTool<typeof UpdateTodosParameters, TodoUpdatedData> {
  return {
    description:
      "替换当前任务的 Todo 清单。completed 项的 evidence 由 Runtime 自动关联最近成功的工具结果，不要传入或猜测 toolCallId。",
    executionMode: "sequential",
    label: "Update todos",
    name: "update_todos",
    parameters: UpdateTodosParameters,
    async execute(_toolCallId, input) {
      const ids = new Set(input.todos.map((todo) => todo.id));
      if (ids.size !== input.todos.length) throw new Error("Todo id 不能重复");
      const data: TodoUpdatedData = {
        todos: input.todos.map((todo) => ({
          content: todo.content,
          id: todo.id,
          ...(todo.planStepId === undefined ? {} : { planStepId: todo.planStepId }),
          status: todo.status,
        })),
        updatedAt: Date.now(),
      };
      const updated = await onUpdate(data);
      return { content: [{ text: JSON.stringify(updated), type: "text" }], details: updated };
    },
  };
}
