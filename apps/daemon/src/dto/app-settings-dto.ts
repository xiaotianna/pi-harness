import {
  OutputDetail,
  ReasoningSummary,
} from "@pi-harness/agent-runtime/model-response-preferences";
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

export const UpdateAppSettingsDtoSchema = Type.Object(
  {
    approvalPolicy: Type.Optional(ApprovalPolicyDtoSchema),
    busySubmitBehavior: Type.Optional(BusySubmitBehaviorDtoSchema),
    defaultModel: Type.Optional(DefaultModelSettingDtoSchema),
    fileOpenMode: Type.Optional(FileOpenModeDtoSchema),
    outputDetail: Type.Optional(OutputDetailDtoSchema),
    reasoningSummary: Type.Optional(ReasoningSummaryDtoSchema),
  },
  { minProperties: 1 },
);

export type UpdateAppSettingsDto = Static<typeof UpdateAppSettingsDtoSchema>;
