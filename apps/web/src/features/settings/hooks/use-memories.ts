import type {
  CreateMemoryInput,
  MemoryRecord,
  MemorySettings,
  MemoryState,
  UpdateMemoryInput,
  UpdateMemorySettingsInput,
} from "@pi-harness/memory/contract";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createMemory, deleteMemory, updateMemory, updateMemorySettings } from "../api/memory-api";
import { memoryQueryKeys, memoryQueryOptions } from "../api/memory-queries";

export function useMemories() {
  const queryClient = useQueryClient();
  const query = useQuery(memoryQueryOptions());
  const createMutation = useMutation({
    mutationFn: createMemory,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: memoryQueryKeys.all }),
  });
  const updateMutation = useMutation<
    MemoryRecord,
    Error,
    { input: UpdateMemoryInput; memoryId: string }
  >({
    mutationFn: ({ input, memoryId }) => updateMemory(memoryId, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: memoryQueryKeys.all }),
  });
  const deleteMutation = useMutation<void, Error, { expectedRevision: number; memoryId: string }>({
    mutationFn: ({ expectedRevision, memoryId }) => deleteMemory(memoryId, expectedRevision),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: memoryQueryKeys.all }),
  });
  const settingsMutation = useMutation<MemorySettings, Error, UpdateMemorySettingsInput>({
    mutationFn: updateMemorySettings,
    onSuccess: (settings) => {
      queryClient.setQueryData<MemoryState>(memoryQueryKeys.all, (current) =>
        current ? { ...current, settings } : current,
      );
    },
  });

  return {
    create: (input: CreateMemoryInput) => createMutation.mutateAsync(input),
    isCreating: createMutation.isPending,
    isDeleting: deleteMutation.isPending ? deleteMutation.variables?.memoryId : null,
    isSavingSettings: settingsMutation.isPending,
    isUpdating: updateMutation.isPending ? updateMutation.variables?.memoryId : null,
    query,
    remove: (memoryId: string, expectedRevision: number) =>
      deleteMutation.mutateAsync({ expectedRevision, memoryId }),
    update: (memoryId: string, input: UpdateMemoryInput) =>
      updateMutation.mutateAsync({ input, memoryId }),
    updateSettings: settingsMutation.mutateAsync,
  };
}
