import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  type ComputerUsePermission,
  type ComputerUsePermissions,
  requestComputerUsePermission,
} from "../api/app-settings-api";
import {
  appSettingsQueryKeys,
  computerUsePermissionsQueryOptions,
} from "../api/app-settings-queries";

export function useComputerUsePermissions() {
  const queryClient = useQueryClient();
  const permissionsQuery = useQuery(computerUsePermissionsQueryOptions());
  const mutation = useMutation<ComputerUsePermissions, Error, ComputerUsePermission>({
    mutationFn: requestComputerUsePermission,
    onSuccess: (permissions) => {
      queryClient.setQueryData(appSettingsQueryKeys.computerUsePermissions, permissions);
    },
  });

  return {
    error: permissionsQuery.error,
    isLoading: permissionsQuery.isPending,
    pendingPermission: mutation.isPending ? mutation.variables : null,
    permissions: permissionsQuery.data,
    requestPermission: mutation.mutateAsync,
  };
}
