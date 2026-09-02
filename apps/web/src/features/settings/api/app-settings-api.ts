import { ThinkingLevel } from "@pi-harness/agent-runtime/thinking-level";
import { BusySubmitBehavior } from "@pi-harness/agent-runtime/user-input";
import { ApprovalPolicy } from "@pi-harness/policy/approval-policy";
import { type Static, Type } from "typebox";
import { Value } from "typebox/value";
import { apiRequest } from "../../../api/request";

const ApprovalPolicySchema = Type.Union([
  Type.Literal(ApprovalPolicy.REQUEST_APPROVAL),
  Type.Literal(ApprovalPolicy.AUTO_APPROVE),
  Type.Literal(ApprovalPolicy.FULL_ACCESS),
]);

const DefaultModelSettingSchema = Type.Object({
  modelId: Type.String({ minLength: 1 }),
  providerId: Type.String({ minLength: 1 }),
  thinkingLevel: Type.Union([
    Type.Literal(ThinkingLevel.LOW),
    Type.Literal(ThinkingLevel.MEDIUM),
    Type.Literal(ThinkingLevel.HIGH),
  ]),
});

const AppSettingsSchema = Type.Object({
  approvalPolicy: ApprovalPolicySchema,
  busySubmitBehavior: Type.Union([
    Type.Literal(BusySubmitBehavior.QUEUE),
    Type.Literal(BusySubmitBehavior.STEER),
  ]),
  defaultModel: Type.Union([DefaultModelSettingSchema, Type.Null()]),
});

const UpdateAppSettingsSchema = Type.Object({
  approvalPolicy: Type.Optional(ApprovalPolicySchema),
  busySubmitBehavior: Type.Optional(
    Type.Union([Type.Literal(BusySubmitBehavior.QUEUE), Type.Literal(BusySubmitBehavior.STEER)]),
  ),
  defaultModel: Type.Optional(DefaultModelSettingSchema),
});

export type AppSettings = Static<typeof AppSettingsSchema>;
export type UpdateAppSettings = Static<typeof UpdateAppSettingsSchema>;

async function readAppSettings(response: Response): Promise<AppSettings> {
  const body = (await response.json()) as unknown;
  if (!Value.Check(AppSettingsSchema, body)) {
    throw new Error("daemon 返回了无效的应用设置");
  }
  return body;
}

export async function getAppSettings(signal?: AbortSignal): Promise<AppSettings> {
  return readAppSettings(await apiRequest("/api/settings", signal ? { signal } : undefined));
}

export async function updateAppSettings(settings: UpdateAppSettings): Promise<AppSettings> {
  return readAppSettings(
    await apiRequest("/api/settings", {
      body: JSON.stringify(settings),
      method: "PATCH",
    }),
  );
}
