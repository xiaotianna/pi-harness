import type { AgentTool } from "@earendil-works/pi-agent-core";
import { type Static, Type } from "typebox";
import { Value } from "typebox/value";

export const PlanStepStatus = {
  COMPLETED: "completed",
  IN_PROGRESS: "in_progress",
  PENDING: "pending",
} as const;

export type PlanStepStatus = (typeof PlanStepStatus)[keyof typeof PlanStepStatus];

const PlanStepSchema = Type.Object({
  status: Type.Union([
    Type.Literal(PlanStepStatus.PENDING),
    Type.Literal(PlanStepStatus.IN_PROGRESS),
    Type.Literal(PlanStepStatus.COMPLETED),
  ]),
  step: Type.String({ maxLength: 1_000, minLength: 1 }),
});

const PlanFields = {
  explanation: Type.Optional(Type.String({ maxLength: 2_000 })),
  plan: Type.Array(PlanStepSchema, { maxItems: 32, minItems: 1 }),
};

const UpdatePlanParameters = Type.Object(PlanFields);
const PlanUpdatedDataSchema = Type.Object({
  ...PlanFields,
  updatedAt: Type.Integer({ minimum: 0 }),
});

export type PlanUpdatedData = Static<typeof PlanUpdatedDataSchema>;
export type PlanUpdateHandler = (data: PlanUpdatedData) => Promise<void> | void;

export function isPlanUpdatedData(value: unknown): value is PlanUpdatedData {
  return Value.Check(PlanUpdatedDataSchema, value);
}

export function createUpdatePlanTool(
  onUpdate: PlanUpdateHandler,
): AgentTool<typeof UpdatePlanParameters, PlanUpdatedData> {
  return {
    description:
      "更新当前任务的执行计划。计划应反映真实进度，同时最多只有一个步骤处于 in_progress。",
    executionMode: "sequential",
    label: "Update plan",
    name: "update_plan",
    parameters: UpdatePlanParameters,
    async execute(_toolCallId, input) {
      const activeSteps = input.plan.filter((item) => item.status === PlanStepStatus.IN_PROGRESS);
      if (activeSteps.length > 1) throw new Error("计划中最多只能有一个进行中的步骤");
      const data: PlanUpdatedData = {
        ...(input.explanation === undefined ? {} : { explanation: input.explanation }),
        plan: input.plan,
        updatedAt: Date.now(),
      };
      await onUpdate(data);
      return { content: [{ text: JSON.stringify(data), type: "text" }], details: data };
    },
  };
}
