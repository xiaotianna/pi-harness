import type { ApprovalPolicy as ApprovalPolicyValue } from "@pi-harness/policy/approval-policy";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { type AppSettings, updateAppSettings } from "../api/app-settings-api";
import { appSettingsQueryKeys, appSettingsQueryOptions } from "../api/app-settings-queries";

export function useApprovalPolicySetting() {
  const queryClient = useQueryClient();
  const settingsQuery = useQuery(appSettingsQueryOptions());
  const mutation = useMutation<AppSettings, Error, ApprovalPolicyValue, AppSettings | undefined>({
    mutationFn: (approvalPolicy) => updateAppSettings({ approvalPolicy }),
    onError: (_error, _approvalPolicy, previous) => {
      if (previous) queryClient.setQueryData(appSettingsQueryKeys.all, previous);
    },
    onMutate: async (approvalPolicy) => {
      await queryClient.cancelQueries({ queryKey: appSettingsQueryKeys.all });
      const previous = queryClient.getQueryData<AppSettings>(appSettingsQueryKeys.all);
      queryClient.setQueryData<AppSettings>(appSettingsQueryKeys.all, { approvalPolicy });
      return previous;
    },
    onSuccess: (settings) => queryClient.setQueryData(appSettingsQueryKeys.all, settings),
  });

  return {
    approvalPolicy: settingsQuery.data?.approvalPolicy,
    isPending: settingsQuery.isPending || mutation.isPending,
    setApprovalPolicy: (approvalPolicy: ApprovalPolicyValue) =>
      mutation.mutateAsync(approvalPolicy).then(() => undefined),
  };
}
