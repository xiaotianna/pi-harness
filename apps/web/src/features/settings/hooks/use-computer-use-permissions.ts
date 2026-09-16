import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import {
  ComputerUsePermission,
  type ComputerUsePermissions,
  openComputerUsePermissionSettings,
  requestComputerUsePermission,
} from "../api/app-settings-api";
import {
  appSettingsQueryKeys,
  computerUsePermissionsQueryOptions,
} from "../api/app-settings-queries";

export function useComputerUsePermissions() {
  const queryClient = useQueryClient();
  const permissionsQuery = useQuery(computerUsePermissionsQueryOptions());
  const [verifyingPermissions, setVerifyingPermissions] = useState<Set<ComputerUsePermission>>(
    () => new Set(),
  );
  const [pendingPermissions, setPendingPermissions] = useState<Set<ComputerUsePermission>>(
    () => new Set(),
  );
  const refreshPermissions = async () => {
    const result = await permissionsQuery.refetch();
    if (result.isSuccess) setVerifyingPermissions(new Set());
  };
  useEffect(() => {
    if (verifyingPermissions.size === 0) return;
    const refreshOnFocus = () => {
      if (document.visibilityState === "visible") {
        void permissionsQuery.refetch().then((result) => {
          if (result.isSuccess) setVerifyingPermissions(new Set());
        });
      }
    };
    window.addEventListener("focus", refreshOnFocus);
    return () => window.removeEventListener("focus", refreshOnFocus);
  }, [permissionsQuery.refetch, verifyingPermissions.size]);
  const mutation = useMutation<
    ComputerUsePermissions | null,
    Error,
    { permission: ComputerUsePermission; action: "request" | "open_settings" }
  >({
    mutationFn: async ({ permission, action }) => {
      if (action === "request") return requestComputerUsePermission(permission);
      await openComputerUsePermissionSettings(permission);
      return null;
    },
    onMutate: ({ permission }) => {
      setPendingPermissions((current) => new Set(current).add(permission));
      setVerifyingPermissions((current) => new Set(current).add(permission));
    },
    onSuccess: (permissions, { action, permission }) => {
      const isGranted =
        permission === ComputerUsePermission.ACCESSIBILITY
          ? permissions?.accessibility
          : permissions?.screenRecording;
      if (action === "request" && permissions !== null && isGranted) {
        queryClient.setQueryData<ComputerUsePermissions>(
          appSettingsQueryKeys.computerUsePermissions,
          (current) => ({
            ...(current ?? permissions),
            [permission === ComputerUsePermission.ACCESSIBILITY
              ? "accessibility"
              : "screenRecording"]: true,
          }),
        );
        setVerifyingPermissions((current) => {
          const next = new Set(current);
          next.delete(permission);
          return next;
        });
      }
    },
    onError: (_error, { permission }) => {
      setVerifyingPermissions((current) => {
        const next = new Set(current);
        next.delete(permission);
        return next;
      });
    },
    onSettled: (_data, _error, { permission }) => {
      setPendingPermissions((current) => {
        const next = new Set(current);
        next.delete(permission);
        return next;
      });
    },
  });

  return {
    error: permissionsQuery.error,
    isLoading: permissionsQuery.isPending,
    isRefreshing: permissionsQuery.isFetching,
    pendingPermissions,
    permissions: permissionsQuery.data,
    refreshPermissions,
    requestPermission: (permission: ComputerUsePermission) =>
      mutation.mutateAsync({ action: "request", permission }),
    openPermissionSettings: (permission: ComputerUsePermission) =>
      mutation.mutateAsync({ action: "open_settings", permission }),
    verifyingPermissions,
  };
}
