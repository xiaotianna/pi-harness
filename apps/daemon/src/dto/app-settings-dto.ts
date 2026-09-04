import { ThinkingLevel } from "@pi-harness/agent-runtime/thinking-level";
import { BusySubmitBehavior } from "@pi-harness/agent-runtime/user-input";
import { ApprovalPolicy } from "@pi-harness/policy";
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

export const UpdateAppSettingsDtoSchema = Type.Object(
  {
    approvalPolicy: Type.Optional(ApprovalPolicyDtoSchema),
    busySubmitBehavior: Type.Optional(BusySubmitBehaviorDtoSchema),
    defaultModel: Type.Optional(DefaultModelSettingDtoSchema),
    fileOpenMode: Type.Optional(FileOpenModeDtoSchema),
  },
  { minProperties: 1 },
);

export type UpdateAppSettingsDto = Static<typeof UpdateAppSettingsDtoSchema>;
