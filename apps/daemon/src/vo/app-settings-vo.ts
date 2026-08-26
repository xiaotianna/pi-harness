import { type Static, Type } from "typebox";
import { ApprovalPolicyDtoSchema } from "../dto/app-settings-dto.js";

export const AppSettingsVoSchema = Type.Object({
  approvalPolicy: ApprovalPolicyDtoSchema,
});

export type AppSettingsVo = Static<typeof AppSettingsVoSchema>;
