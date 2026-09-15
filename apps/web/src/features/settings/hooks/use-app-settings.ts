import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { pick } from "es-toolkit";
import {
  type AppSettings,
  revokeComputerUseAllowedApp,
  selectDefaultFileOpenApplication,
  type UpdateAppSettings,
  updateAppSettings,
} from "../api/app-settings-api";
import { appSettingsQueryKeys, appSettingsQueryOptions } from "../api/app-settings-queries";

export function useAppSettings() {
  const queryClient = useQueryClient();
  const settingsQuery = useQuery(appSettingsQueryOptions());
  const mutation = useMutation<AppSettings, Error, UpdateAppSettings, AppSettings | undefined>({
    mutationFn: updateAppSettings,
    onError: (_error, update, previous) => {
      if (!previous) return;
      const keys = Object.keys(update) as Array<keyof UpdateAppSettings>;
      queryClient.setQueryData<AppSettings>(appSettingsQueryKeys.all, (current) =>
        current ? { ...current, ...pick(previous, keys) } : previous,
      );
    },
    onMutate: async (update) => {
      await queryClient.cancelQueries({ queryKey: appSettingsQueryKeys.all });
      const previous = queryClient.getQueryData<AppSettings>(appSettingsQueryKeys.all);
      if (previous) {
        queryClient.setQueryData<AppSettings>(appSettingsQueryKeys.all, {
          ...previous,
          ...update,
        });
      }
      return previous;
    },
    onSuccess: (settings, update) => {
      const keys = Object.keys(update) as Array<keyof UpdateAppSettings>;
      queryClient.setQueryData<AppSettings>(appSettingsQueryKeys.all, (current) =>
        current ? { ...current, ...pick(settings, keys) } : settings,
      );
    },
  });
  const applicationMutation = useMutation({
    mutationFn: selectDefaultFileOpenApplication,
    onSuccess: (settings) => {
      if (settings) queryClient.setQueryData(appSettingsQueryKeys.all, settings);
    },
  });
  const computerUseAppMutation = useMutation<void, Error, string, AppSettings | undefined>({
    mutationFn: revokeComputerUseAllowedApp,
    onError: (_error, _bundleId, previous) => {
      if (previous) queryClient.setQueryData(appSettingsQueryKeys.all, previous);
    },
    onMutate: async (bundleId) => {
      await queryClient.cancelQueries({ queryKey: appSettingsQueryKeys.all });
      const previous = queryClient.getQueryData<AppSettings>(appSettingsQueryKeys.all);
      if (previous) {
        queryClient.setQueryData<AppSettings>(appSettingsQueryKeys.all, {
          ...previous,
          computerUseAllowedApps: previous.computerUseAllowedApps.filter(
            (app) => app.bundleId !== bundleId,
          ),
        });
      }
      return previous;
    },
  });

  return {
    error: settingsQuery.error,
    isLoading: settingsQuery.isPending,
    isSaving: (key: keyof UpdateAppSettings) =>
      mutation.isPending &&
      mutation.variables !== undefined &&
      Object.hasOwn(mutation.variables, key),
    isSelectingFileOpenApplication: applicationMutation.isPending,
    revokingComputerUseApp: computerUseAppMutation.isPending
      ? computerUseAppMutation.variables
      : null,
    revokeComputerUseApp: computerUseAppMutation.mutateAsync,
    selectFileOpenApplication: applicationMutation.mutateAsync,
    settings: settingsQuery.data,
    updateSettings: mutation.mutateAsync,
  };
}
