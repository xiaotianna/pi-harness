import { type Static, Type } from "typebox";
import {
  ApprovalPolicyDtoSchema,
  BusySubmitBehaviorDtoSchema,
  DefaultModelSettingDtoSchema,
  FileOpenModeDtoSchema,
  OutputDetailDtoSchema,
  ReasoningSummaryDtoSchema,
  SandboxAllowedDomainsDtoSchema,
  SandboxProfileDtoSchema,
} from "../dto/app-settings-dto.js";

export const FileOpenApplicationVoSchema = Type.Object({
  iconDataUrl: Type.Union([
    Type.String({ maxLength: 400_000, pattern: "^data:image/png;base64," }),
    Type.Null(),
  ]),
  name: Type.String({ maxLength: 200, minLength: 1 }),
});

export const ComputerUseAllowedAppVoSchema = Type.Object({
  bundleId: Type.String({ maxLength: 500, minLength: 3 }),
  name: Type.String({ maxLength: 200, minLength: 1 }),
});

export const ComputerUsePermissionsVoSchema = Type.Object({
  accessibility: Type.Boolean(),
  screenRecording: Type.Boolean(),
  supported: Type.Boolean(),
});

export const AppSettingsVoSchema = Type.Object({
  approvalPolicy: ApprovalPolicyDtoSchema,
  busySubmitBehavior: BusySubmitBehaviorDtoSchema,
  computerUseAllowedApps: Type.Array(ComputerUseAllowedAppVoSchema, { maxItems: 1_000 }),
  defaultModel: Type.Union([DefaultModelSettingDtoSchema, Type.Null()]),
  fileOpenApplication: Type.Union([FileOpenApplicationVoSchema, Type.Null()]),
  fileOpenMode: FileOpenModeDtoSchema,
  outputDetail: OutputDetailDtoSchema,
  reasoningSummary: ReasoningSummaryDtoSchema,
  sandboxAllowedDomains: SandboxAllowedDomainsDtoSchema,
  sandboxDeniedDomains: SandboxAllowedDomainsDtoSchema,
  sandboxProfile: SandboxProfileDtoSchema,
});

export type AppSettingsVo = Static<typeof AppSettingsVoSchema>;
