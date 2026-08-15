import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getAiPreferences, updateAiPreferences } from '@/services';
import { queryKeys, STALE_TIME } from '@/lib/queryKeys';
import { useAuthStore } from '@/stores/authStore';
import type { AiPreferences, UpdateAiPreferencesInput } from '@/services';

export function useAiPreferences() {
  const customerId = useAuthStore((state) => state.customer?.id ?? null);
  return useQuery({
    queryKey: queryKeys.aiPreferences.detail(customerId),
    queryFn: getAiPreferences,
    staleTime: STALE_TIME.medium,
  });
}

export function useUpdateAiPreferences() {
  const queryClient = useQueryClient();
  const customerId = useAuthStore((state) => state.customer?.id ?? null);
  const detailKey = queryKeys.aiPreferences.detail(customerId);

  return useMutation({
    mutationFn: (patch: UpdateAiPreferencesInput) => updateAiPreferences(patch),
    onMutate: async (patch) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.aiPreferences.all() });
      const previous = queryClient.getQueryData<AiPreferences>(detailKey);

      if (previous) {
        queryClient.setQueryData<AiPreferences>(detailKey, {
          ...previous,
          ...patch,
        });
      }

      return { previous };
    },
    onError: (_error, _patch, context) => {
      if (context?.previous) {
        queryClient.setQueryData(detailKey, context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.aiPreferences.all() });
    },
  });
}
