import { queryOptions } from "@tanstack/react-query";
import { getMemories } from "./memory-api";

export const memoryQueryKeys = { all: ["memories"] as const };

export const memoryQueryOptions = () =>
  queryOptions({
    queryFn: ({ signal }) => getMemories(signal),
    queryKey: memoryQueryKeys.all,
  });
