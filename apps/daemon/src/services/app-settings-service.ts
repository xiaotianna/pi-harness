import type { ApprovalPolicyValue } from "@pi-harness/policy";
import type { UpdateAppSettingsDto } from "../dto/app-settings-dto.js";
import type { AppSettingRepository, DefaultModelSetting } from "../storage/database.js";

export interface AppSettings {
  approvalPolicy: ApprovalPolicyValue;
  defaultModel: DefaultModelSetting | null;
}

export class AppSettingsService {
  public constructor(private readonly settings: AppSettingRepository) {}

  public get(): AppSettings {
    return {
      approvalPolicy: this.settings.getApprovalPolicy(),
      defaultModel: this.settings.getDefaultModel(),
    };
  }

  public update(input: UpdateAppSettingsDto): AppSettings {
    const updatedAt = Date.now();
    if (input.approvalPolicy !== undefined) {
      this.settings.setApprovalPolicy(input.approvalPolicy, updatedAt);
    }
    if (input.defaultModel !== undefined) {
      this.settings.setDefaultModel(input.defaultModel, updatedAt);
    }
    return this.get();
  }
}
