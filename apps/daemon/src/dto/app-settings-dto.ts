import { ApprovalPolicy } from "@pi-harness/policy";
import { type Static, Type } from "typebox";

export const ApprovalPolicyDtoSchema = Type.Union([
  Type.Literal(ApprovalPolicy.REQUEST_APPROVAL),
  Type.Literal(ApprovalPolicy.AUTO_APPROVE),
  Type.Literal(ApprovalPolicy.FULL_ACCESS),
]);

export const UpdateAppSettingsDtoSchema = Type.Object({
  approvalPolicy: ApprovalPolicyDtoSchema,
});

export type UpdateAppSettingsDto = Static<typeof UpdateAppSettingsDtoSchema>;
