import { queryOptions } from "@tanstack/react-query";
import { getAppSettings, getComputerUsePermissions } from "./app-settings-api";

export const appSettingsQueryKeys = {
  all: ["app-settings"] as const,
  computerUsePermissions: ["app-settings", "computer-use-permissions"] as const,
};

export const appSettingsQueryOptions = () =>
  queryOptions({
    queryFn: ({ signal }) => getAppSettings(signal),
    queryKey: appSettingsQueryKeys.all,
  });

export const computerUsePermissionsQueryOptions = () =>
  queryOptions({
    queryFn: ({ signal }) => getComputerUsePermissions(signal),
    queryKey: appSettingsQueryKeys.computerUsePermissions,
    refetchOnWindowFocus: false,
  });
