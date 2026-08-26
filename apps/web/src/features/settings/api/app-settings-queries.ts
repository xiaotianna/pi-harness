import { queryOptions } from "@tanstack/react-query";
import { getAppSettings } from "./app-settings-api";

export const appSettingsQueryKeys = {
  all: ["app-settings"] as const,
};

export const appSettingsQueryOptions = () =>
  queryOptions({
    queryFn: ({ signal }) => getAppSettings(signal),
    queryKey: appSettingsQueryKeys.all,
  });
