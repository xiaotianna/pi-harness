import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { pick } from "es-toolkit";
import {
  type AppSettings,
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

  return {
    isLoading: settingsQuery.isPending,
    isSaving: (key: keyof UpdateAppSettings) =>
      mutation.isPending &&
      mutation.variables !== undefined &&
      Object.hasOwn(mutation.variables, key),
    isSelectingFileOpenApplication: applicationMutation.isPending,
    selectFileOpenApplication: applicationMutation.mutateAsync,
    settings: settingsQuery.data,
    updateSettings: mutation.mutateAsync,
  };
}
