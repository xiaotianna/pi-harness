import type {
  OutputDetail,
  ReasoningSummary,
} from "@pi-harness/agent-runtime/model-response-preferences";
import type { BusySubmitBehavior } from "@pi-harness/agent-runtime/user-input";
import {
  type ApprovalPolicyValue,
  readSandboxPolicy,
  type SandboxProfileValue,
  writeSandboxPolicy,
} from "@pi-harness/policy";
import type { UpdateAppSettingsDto } from "../dto/app-settings-dto.js";
import type { FileOpenMode } from "../schemas/file-open.js";
import type {
  AppSettingRepository,
  DefaultModelSetting,
  FileOpenApplicationSetting,
} from "../storage/database.js";

export interface AppSettings {
  approvalPolicy: ApprovalPolicyValue;
  busySubmitBehavior: BusySubmitBehavior;
  defaultModel: DefaultModelSetting | null;
  fileOpenApplication: Omit<FileOpenApplicationSetting, "path"> | null;
  fileOpenMode: FileOpenMode;
  outputDetail: OutputDetail;
  reasoningSummary: ReasoningSummary;
  sandboxAllowedDomains: string[];
  sandboxDeniedDomains: string[];
  sandboxProfile: SandboxProfileValue;
}

export class AppSettingsService {
  public constructor(
    private readonly settings: AppSettingRepository,
    private readonly globalRoot: string,
    private readonly onSandboxPolicyChanged: () => Promise<void>,
  ) {}

  public async get(): Promise<AppSettings> {
    const fileOpenApplication = this.settings.getFileOpenApplication();
    const sandboxPolicy = await readSandboxPolicy(this.globalRoot);
    return {
      approvalPolicy: this.settings.getApprovalPolicy(),
      busySubmitBehavior: this.settings.getBusySubmitBehavior(),
      defaultModel: this.settings.getDefaultModel(),
      fileOpenApplication: fileOpenApplication
        ? { iconDataUrl: fileOpenApplication.iconDataUrl, name: fileOpenApplication.name }
        : null,
      fileOpenMode: this.settings.getFileOpenMode(),
      outputDetail: this.settings.getOutputDetail(),
      reasoningSummary: this.settings.getReasoningSummary(),
      sandboxAllowedDomains: sandboxPolicy.network.allowedDomains,
      sandboxDeniedDomains: sandboxPolicy.network.deniedDomains,
      sandboxProfile: sandboxPolicy.profile,
    };
  }

  public async update(input: UpdateAppSettingsDto): Promise<AppSettings> {
    const updatedAt = Date.now();
    if (input.approvalPolicy !== undefined) {
      this.settings.setApprovalPolicy(input.approvalPolicy, updatedAt);
    }
    if (input.busySubmitBehavior !== undefined) {
      this.settings.setBusySubmitBehavior(input.busySubmitBehavior, updatedAt);
    }
    if (input.defaultModel !== undefined) {
      this.settings.setDefaultModel(input.defaultModel, updatedAt);
    }
    if (input.fileOpenMode !== undefined) {
      this.settings.setFileOpenMode(input.fileOpenMode, updatedAt);
    }
    if (input.outputDetail !== undefined) {
      this.settings.setOutputDetail(input.outputDetail, updatedAt);
    }
    if (input.reasoningSummary !== undefined) {
      this.settings.setReasoningSummary(input.reasoningSummary, updatedAt);
    }
    if (
      input.sandboxAllowedDomains !== undefined ||
      input.sandboxDeniedDomains !== undefined ||
      input.sandboxProfile !== undefined
    ) {
      const current = await readSandboxPolicy(this.globalRoot);
      await writeSandboxPolicy(this.globalRoot, {
        network: {
          allowedDomains: input.sandboxAllowedDomains ?? current.network.allowedDomains,
          deniedDomains: input.sandboxDeniedDomains ?? current.network.deniedDomains,
        },
        profile: input.sandboxProfile ?? current.profile,
      });
      await this.onSandboxPolicyChanged();
    }
    return this.get();
  }
}
