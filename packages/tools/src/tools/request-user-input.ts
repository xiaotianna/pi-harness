import type { AgentTool } from "@earendil-works/pi-agent-core";
import { type Static, Type } from "typebox";

export const UserInputRequestKind = {
  PLAN_REVIEW: "plan_review",
  QUESTION: "question",
} as const;

export type UserInputRequestKind = (typeof UserInputRequestKind)[keyof typeof UserInputRequestKind];

export const UserInputResponseAction = {
  CONFIRM_PLAN: "confirm_plan",
  SUBMIT: "submit",
} as const;

export type UserInputResponseAction =
  (typeof UserInputResponseAction)[keyof typeof UserInputResponseAction];

const UserInputOptionSchema = Type.Object({
  description: Type.Optional(Type.String()),
  label: Type.String({ minLength: 1 }),
});

const UserInputQuestionSchema = Type.Object({
  header: Type.String({ minLength: 1 }),
  id: Type.String({ minLength: 1 }),
  allowCustomInput: Type.Optional(
    Type.Boolean({
      description: "是否提供自己输入；true 显示，false 隐藏。省略时兼容已有请求，默认显示。",
    }),
  ),
  multiSelect: Type.Optional(
    Type.Boolean({ description: "选项可以组合时设为 true；互斥决策省略或设为 false，默认单选。" }),
  ),
  options: Type.Array(UserInputOptionSchema),
  question: Type.String({ minLength: 1 }),
});

const RequestUserInputParameters = Type.Object({
  kind: Type.Optional(
    Type.Union([
      Type.Literal(UserInputRequestKind.QUESTION),
      Type.Literal(UserInputRequestKind.PLAN_REVIEW),
    ]),
  ),
  planMarkdown: Type.Optional(Type.String({ maxLength: 100_000, minLength: 1 })),
  questions: Type.Array(UserInputQuestionSchema, { minItems: 1 }),
});

export type RequestUserInputData = Static<typeof RequestUserInputParameters>;
export type UserInputQuestion = RequestUserInputData["questions"][number];

export interface UserInputAnswer {
  questionId: string;
  selectedOption?: string;
  selectedOptions?: string[];
  value: string;
}

export interface UserInputSubmission {
  action: UserInputResponseAction;
  answers: readonly UserInputAnswer[];
}

export type UserInputToolResult =
  | { status: "expired" }
  | ({ status: "submitted" } & UserInputSubmission);

export type UserInputRequestHandler = (
  data: RequestUserInputData,
  signal?: AbortSignal,
) => Promise<UserInputToolResult>;

export const RequestUserInputToolName = "request_user_input";

export function createRequestUserInputTool(
  onRequest: UserInputRequestHandler,
): AgentTool<typeof RequestUserInputParameters, UserInputToolResult> {
  return {
    description:
      "当任务缺少用户决策时提出问题；计划模式完成规划后，用 plan_review 携带完整 Markdown 计划书等待确认。每题在问题对象上设置 multiSelect 决定单选或多选，设置 allowCustomInput 决定是否提供自己输入；建议明确传入这两个布尔值。选项数量没有硬限制，但只提供完成决策所需的最少选项，通常 2-3 个，推荐项排在第一位。仅需自由输入时 options 可为空；关闭自由输入时必须提供选项。选项 description 可省略。",
    executionMode: "sequential",
    label: "Request user input",
    name: RequestUserInputToolName,
    parameters: RequestUserInputParameters,
    async execute(_toolCallId, input, signal) {
      const kind = input.kind ?? UserInputRequestKind.QUESTION;
      if (kind === UserInputRequestKind.PLAN_REVIEW && !input.planMarkdown?.trim()) {
        throw new Error("计划确认必须携带完整 Markdown 计划书");
      }
      if (kind === UserInputRequestKind.PLAN_REVIEW && input.questions.length !== 1) {
        throw new Error("计划确认只接受一个确认问题");
      }
      if (kind === UserInputRequestKind.QUESTION && input.planMarkdown !== undefined) {
        throw new Error("普通问题不能携带计划书");
      }
      if (new Set(input.questions.map(({ id }) => id)).size !== input.questions.length) {
        throw new Error("问题 ID 不能重复");
      }
      for (const question of input.questions) {
        if (
          question.allowCustomInput === false &&
          question.options.length === 0 &&
          kind !== UserInputRequestKind.PLAN_REVIEW
        ) {
          throw new Error(`问题 ${question.id} 必须提供选项或允许自己输入`);
        }
        if (new Set(question.options.map(({ label }) => label)).size !== question.options.length) {
          throw new Error(`问题 ${question.id} 的选项不能重复`);
        }
      }
      const result = await onRequest(
        {
          ...(input.kind === undefined ? {} : { kind: input.kind }),
          ...(input.planMarkdown === undefined ? {} : { planMarkdown: input.planMarkdown.trim() }),
          questions: input.questions,
        },
        signal,
      );
      return { content: [{ text: JSON.stringify(result), type: "text" }], details: result };
    },
  };
}
