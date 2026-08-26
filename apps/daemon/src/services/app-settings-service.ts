import type { ApprovalPolicyValue } from "@pi-harness/policy";
import type { AppSettingRepository } from "../storage/database.js";

export interface AppSettings {
  approvalPolicy: ApprovalPolicyValue;
}

export class AppSettingsService {
  public constructor(private readonly settings: AppSettingRepository) {}

  public get(): AppSettings {
    return { approvalPolicy: this.settings.getApprovalPolicy() };
  }

  public update(approvalPolicy: ApprovalPolicyValue): AppSettings {
    this.settings.setApprovalPolicy(approvalPolicy, Date.now());
    return { approvalPolicy };
  }
}
