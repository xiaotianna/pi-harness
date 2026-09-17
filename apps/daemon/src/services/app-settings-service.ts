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
  ComputerUseAllowedApp,
  DefaultModelSetting,
  FileOpenApplicationSetting,
} from "../storage/database.js";
import { readMacApplicationIconByBundleId } from "../utils/mac-application-icon.js";

export interface AppSettings {
  approvalPolicy: ApprovalPolicyValue;
  busySubmitBehavior: BusySubmitBehavior;
  computerUseAllowedApps: ComputerUseAllowedApp[];
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
    private readonly onExecutionPolicyChanged: () => Promise<void>,
  ) {}

  public async get(): Promise<AppSettings> {
    const fileOpenApplication = this.settings.getFileOpenApplication();
    const sandboxPolicy = await readSandboxPolicy(this.globalRoot);
    return {
      approvalPolicy: this.settings.getApprovalPolicy(),
      busySubmitBehavior: this.settings.getBusySubmitBehavior(),
      computerUseAllowedApps: this.settings.getComputerUseAllowedApps(),
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
      const changed = input.approvalPolicy !== this.settings.getApprovalPolicy();
      this.settings.setApprovalPolicy(input.approvalPolicy, updatedAt);
      if (changed) await this.onExecutionPolicyChanged();
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
      await this.onExecutionPolicyChanged();
    }
    return this.get();
  }

  public revokeComputerUseApp(bundleId: string): void {
    this.settings.revokeComputerUseApp(bundleId);
  }

  public getComputerUseAppIcon(bundleId: string, signal: AbortSignal): Promise<Buffer | null> {
    return this.settings.isComputerUseAppAllowed(bundleId)
      ? readMacApplicationIconByBundleId(bundleId, signal)
      : Promise.resolve(null);
  }
}
