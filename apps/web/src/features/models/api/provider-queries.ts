import { queryOptions } from "@tanstack/react-query";
import { listProviders } from "./provider-api";

export const providerQueryKeys = {
  all: ["providers"] as const,
};

export const providerQueryOptions = () =>
  queryOptions({
    queryFn: listProviders,
    queryKey: providerQueryKeys.all,
    staleTime: 10_000,
  });
