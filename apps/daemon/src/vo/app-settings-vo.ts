import { type Static, Type } from "typebox";
import {
  ApprovalPolicyDtoSchema,
  BusySubmitBehaviorDtoSchema,
  DefaultModelSettingDtoSchema,
} from "../dto/app-settings-dto.js";

export const AppSettingsVoSchema = Type.Object({
  approvalPolicy: ApprovalPolicyDtoSchema,
  busySubmitBehavior: BusySubmitBehaviorDtoSchema,
  defaultModel: Type.Union([DefaultModelSettingDtoSchema, Type.Null()]),
});

export type AppSettingsVo = Static<typeof AppSettingsVoSchema>;
