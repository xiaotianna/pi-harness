import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  type AppSettings,
  type UpdateAppSettings,
  updateAppSettings,
} from "../api/app-settings-api";
import { appSettingsQueryKeys, appSettingsQueryOptions } from "../api/app-settings-queries";

export function useAppSettings() {
  const queryClient = useQueryClient();
  const settingsQuery = useQuery(appSettingsQueryOptions());
  const mutation = useMutation<AppSettings, Error, UpdateAppSettings, AppSettings | undefined>({
    mutationFn: updateAppSettings,
    onError: (_error, _update, previous) => {
      if (previous) queryClient.setQueryData(appSettingsQueryKeys.all, previous);
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
    onSuccess: (settings) => queryClient.setQueryData(appSettingsQueryKeys.all, settings),
  });

  return {
    isLoading: settingsQuery.isPending,
    isSaving: mutation.isPending,
    settings: settingsQuery.data,
    updateSettings: mutation.mutateAsync,
  };
}
