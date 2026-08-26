import { ApprovalPolicy } from "@pi-harness/policy/approval-policy";
import { type Static, Type } from "typebox";
import { Value } from "typebox/value";
import { apiRequest } from "../../../api/request";

const AppSettingsSchema = Type.Object({
  approvalPolicy: Type.Union([
    Type.Literal(ApprovalPolicy.REQUEST_APPROVAL),
    Type.Literal(ApprovalPolicy.AUTO_APPROVE),
    Type.Literal(ApprovalPolicy.FULL_ACCESS),
  ]),
});

export type AppSettings = Static<typeof AppSettingsSchema>;

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

export async function updateAppSettings(settings: AppSettings): Promise<AppSettings> {
  return readAppSettings(
    await apiRequest("/api/settings", {
      body: JSON.stringify(settings),
      method: "PATCH",
    }),
  );
}
