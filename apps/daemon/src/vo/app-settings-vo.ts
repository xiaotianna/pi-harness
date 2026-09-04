import { type Static, Type } from "typebox";
import {
  ApprovalPolicyDtoSchema,
  BusySubmitBehaviorDtoSchema,
  DefaultModelSettingDtoSchema,
  FileOpenModeDtoSchema,
  OutputDetailDtoSchema,
  ReasoningSummaryDtoSchema,
} from "../dto/app-settings-dto.js";

export const FileOpenApplicationVoSchema = Type.Object({
  iconDataUrl: Type.Union([
    Type.String({ maxLength: 400_000, pattern: "^data:image/png;base64," }),
    Type.Null(),
  ]),
  name: Type.String({ maxLength: 200, minLength: 1 }),
});

export const AppSettingsVoSchema = Type.Object({
  approvalPolicy: ApprovalPolicyDtoSchema,
  busySubmitBehavior: BusySubmitBehaviorDtoSchema,
  defaultModel: Type.Union([DefaultModelSettingDtoSchema, Type.Null()]),
  fileOpenApplication: Type.Union([FileOpenApplicationVoSchema, Type.Null()]),
  fileOpenMode: FileOpenModeDtoSchema,
  outputDetail: OutputDetailDtoSchema,
  reasoningSummary: ReasoningSummaryDtoSchema,
});

export type AppSettingsVo = Static<typeof AppSettingsVoSchema>;
