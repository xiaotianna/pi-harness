import { ThinkingLevel } from "@pi-harness/agent-runtime/thinking-level";
import { ApprovalPolicy } from "@pi-harness/policy";
import { type Static, Type } from "typebox";

export const ApprovalPolicyDtoSchema = Type.Union([
  Type.Literal(ApprovalPolicy.REQUEST_APPROVAL),
  Type.Literal(ApprovalPolicy.AUTO_APPROVE),
  Type.Literal(ApprovalPolicy.FULL_ACCESS),
]);

export const DefaultModelSettingDtoSchema = Type.Object({
  modelId: Type.String({ maxLength: 200, minLength: 1 }),
  providerId: Type.String({ maxLength: 200, minLength: 1 }),
  thinkingLevel: Type.Union([
    Type.Literal(ThinkingLevel.LOW),
    Type.Literal(ThinkingLevel.MEDIUM),
    Type.Literal(ThinkingLevel.HIGH),
  ]),
});

export const UpdateAppSettingsDtoSchema = Type.Object(
  {
    approvalPolicy: Type.Optional(ApprovalPolicyDtoSchema),
    defaultModel: Type.Optional(DefaultModelSettingDtoSchema),
  },
  { minProperties: 1 },
);

export type UpdateAppSettingsDto = Static<typeof UpdateAppSettingsDtoSchema>;
