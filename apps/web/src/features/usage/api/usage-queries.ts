import { queryOptions } from "@tanstack/react-query";
import { getUsageStatistics } from "./usage-api";

export const usageQueryKeys = { all: ["usage-statistics"] as const };

export const usageStatisticsQueryOptions = () =>
  queryOptions({
    queryFn: ({ signal }) => getUsageStatistics(signal),
    queryKey: usageQueryKeys.all,
    staleTime: 30_000,
  });
