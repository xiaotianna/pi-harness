import { type Static, Type } from "typebox";
import { Value } from "typebox/value";
import { apiRequest } from "../../../api/request";

const UsageStatisticsSchema = Type.Array(
  Type.Object({
    date: Type.String({ pattern: "^\\d{4}-\\d{2}-\\d{2}$" }),
    providerId: Type.String({ minLength: 1 }),
    modelId: Type.String({ minLength: 1 }),
    requests: Type.Integer({ minimum: 0 }),
    input: Type.Number({ minimum: 0 }),
    output: Type.Number({ minimum: 0 }),
    cacheRead: Type.Number({ minimum: 0 }),
    cacheWrite: Type.Number({ minimum: 0 }),
    reasoning: Type.Number({ minimum: 0 }),
    totalTokens: Type.Number({ minimum: 0 }),
    cost: Type.Number({ minimum: 0 }),
  }),
);

export type UsageStatistic = Static<typeof UsageStatisticsSchema>[number];

export async function getUsageStatistics(signal?: AbortSignal): Promise<readonly UsageStatistic[]> {
  const body = (await (
    await apiRequest("/api/sessions/usage", signal ? { signal } : undefined)
  ).json()) as unknown;
  if (!Value.Check(UsageStatisticsSchema, body)) {
    throw new Error("daemon 返回了无效的用量统计");
  }
  return body;
}
