import { type Static, Type } from "typebox";
import { ApprovalPolicyDtoSchema, DefaultModelSettingDtoSchema } from "../dto/app-settings-dto.js";

export const AppSettingsVoSchema = Type.Object({
  approvalPolicy: ApprovalPolicyDtoSchema,
  defaultModel: Type.Union([DefaultModelSettingDtoSchema, Type.Null()]),
});

export type AppSettingsVo = Static<typeof AppSettingsVoSchema>;
