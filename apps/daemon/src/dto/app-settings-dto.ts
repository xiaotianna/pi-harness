import {
  OutputDetail,
  ReasoningSummary,
} from "@pi-harness/agent-runtime/model-response-preferences";
import { ThinkingLevel } from "@pi-harness/agent-runtime/thinking-level";
import { BusySubmitBehavior } from "@pi-harness/agent-runtime/user-input";
import { ComputerUsePermission } from "@pi-harness/computer-use";
import { ApprovalPolicy, SandboxProfile } from "@pi-harness/policy";
import { type Static, Type } from "typebox";
import { FileOpenMode } from "../schemas/file-open.js";

export const ApprovalPolicyDtoSchema = Type.Union([
  Type.Literal(ApprovalPolicy.REQUEST_APPROVAL),
  Type.Literal(ApprovalPolicy.AUTO_APPROVE),
  Type.Literal(ApprovalPolicy.FULL_ACCESS),
]);

export const DefaultModelSettingDtoSchema = Type.Object({
  modelId: Type.String({ maxLength: 200, minLength: 1 }),
  providerId: Type.String({ maxLength: 200, minLength: 1 }),
  thinkingLevel: Type.Union([
    Type.Literal(ThinkingLevel.OFF),
    Type.Literal(ThinkingLevel.MINIMAL),
    Type.Literal(ThinkingLevel.LOW),
    Type.Literal(ThinkingLevel.MEDIUM),
    Type.Literal(ThinkingLevel.HIGH),
    Type.Literal(ThinkingLevel.XHIGH),
    Type.Literal(ThinkingLevel.MAX),
  ]),
});

export const BusySubmitBehaviorDtoSchema = Type.Union([
  Type.Literal(BusySubmitBehavior.QUEUE),
  Type.Literal(BusySubmitBehavior.STEER),
]);

export const FileOpenModeDtoSchema = Type.Union([
  Type.Literal(FileOpenMode.ALWAYS),
  Type.Literal(FileOpenMode.ASK),
]);

export const OutputDetailDtoSchema = Type.Union([
  Type.Literal(OutputDetail.MODEL_DEFAULT),
  Type.Literal(OutputDetail.LOW),
  Type.Literal(OutputDetail.MEDIUM),
  Type.Literal(OutputDetail.HIGH),
]);

export const ReasoningSummaryDtoSchema = Type.Union([
  Type.Literal(ReasoningSummary.AUTO),
  Type.Literal(ReasoningSummary.CONCISE),
  Type.Literal(ReasoningSummary.DETAILED),
]);

export const SandboxAllowedDomainsDtoSchema = Type.Array(
  Type.String({
    maxLength: 260,
    minLength: 1,
  }),
  { maxItems: 100, uniqueItems: true },
);

export const SandboxProfileDtoSchema = Type.Union([
  Type.Literal(SandboxProfile.READ_ONLY),
  Type.Literal(SandboxProfile.WORKSPACE_WRITE),
]);

export const UpdateAppSettingsDtoSchema = Type.Object(
  {
    approvalPolicy: Type.Optional(ApprovalPolicyDtoSchema),
    busySubmitBehavior: Type.Optional(BusySubmitBehaviorDtoSchema),
    defaultModel: Type.Optional(DefaultModelSettingDtoSchema),
    fileOpenMode: Type.Optional(FileOpenModeDtoSchema),
    outputDetail: Type.Optional(OutputDetailDtoSchema),
    reasoningSummary: Type.Optional(ReasoningSummaryDtoSchema),
    sandboxAllowedDomains: Type.Optional(SandboxAllowedDomainsDtoSchema),
    sandboxDeniedDomains: Type.Optional(SandboxAllowedDomainsDtoSchema),
    sandboxProfile: Type.Optional(SandboxProfileDtoSchema),
  },
  { minProperties: 1 },
);

export const ComputerUseAllowedAppParamsSchema = Type.Object({
  bundleId: Type.String({
    maxLength: 500,
    minLength: 3,
    pattern: "^[A-Za-z0-9][A-Za-z0-9-]*(?:\\.[A-Za-z0-9][A-Za-z0-9-]*)+$",
  }),
});

export const ComputerUsePermissionParamsSchema = Type.Object({
  permission: Type.Union([
    Type.Literal(ComputerUsePermission.ACCESSIBILITY),
    Type.Literal(ComputerUsePermission.SCREEN_RECORDING),
  ]),
});

export type UpdateAppSettingsDto = Static<typeof UpdateAppSettingsDtoSchema>;
export type ComputerUseAllowedAppParams = Static<typeof ComputerUseAllowedAppParamsSchema>;
export type ComputerUsePermissionParams = Static<typeof ComputerUsePermissionParamsSchema>;
