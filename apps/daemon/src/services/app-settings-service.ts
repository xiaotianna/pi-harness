import type {
  OutputDetail,
  ReasoningSummary,
} from "@pi-harness/agent-runtime/model-response-preferences";
import type { BusySubmitBehavior } from "@pi-harness/agent-runtime/user-input";
import type { ApprovalPolicyValue } from "@pi-harness/policy";
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
}

export class AppSettingsService {
  public constructor(private readonly settings: AppSettingRepository) {}

  public get(): AppSettings {
    const fileOpenApplication = this.settings.getFileOpenApplication();
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
    };
  }

  public update(input: UpdateAppSettingsDto): AppSettings {
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
    return this.get();
  }
}
