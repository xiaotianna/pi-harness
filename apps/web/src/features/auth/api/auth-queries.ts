import { queryOptions } from "@tanstack/react-query";
import { getAuthSession } from "./auth-api";

export const authQueryKeys = {
  all: ["auth"] as const,
  session: () => [...authQueryKeys.all, "session"] as const,
};

export const authSessionQueryOptions = () =>
  queryOptions({
    queryFn: getAuthSession,
    queryKey: authQueryKeys.session(),
    retry: 5,
    retryDelay: (attemptIndex) => Math.min(500 * 2 ** attemptIndex, 2_000),
    staleTime: 10_000,
  });
