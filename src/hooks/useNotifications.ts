import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/authStore';
import {
  getNotifications,
  getUnreadNotifications,
  markNotificationRead,
  markAllNotificationsRead,
} from '@/services';
import { queryKeys, STALE_TIME } from '@/lib/queryKeys';
import {
  markAllNotificationsReadInCache,
  markNotificationReadInCache,
} from '@/lib/notificationCache';

// ─── Queries ──────────────────────────────────────────────────────────────────

export const useNotifications = () => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const customerId = useAuthStore((state) => state.customer?.id ?? null);
  return useQuery({
    queryKey: queryKeys.notifications.list(customerId),
    queryFn: () => getNotifications(),
    enabled: isAuthenticated,
    staleTime: STALE_TIME.short,
  });
};

export const useUnreadNotifications = (options?: {
  refetchInterval?: number | false;
}) => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const customerId = useAuthStore((state) => state.customer?.id ?? null);
  return useQuery({
    queryKey: queryKeys.notifications.unread(customerId),
    queryFn: () => getUnreadNotifications(),
    enabled: isAuthenticated,
    staleTime: STALE_TIME.short,
    refetchInterval: options?.refetchInterval,
  });
};

// ─── Mutations ────────────────────────────────────────────────────────────────

export const useMarkNotificationRead = () => {
  const queryClient = useQueryClient();
  const customerId = useAuthStore((state) => state.customer?.id ?? null);
  return useMutation({
    mutationFn: async (id: string) => {
      if (customerId) markNotificationReadInCache(queryClient, customerId, id);
      await markNotificationRead(id);
    },
    onError: () => queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all() }),
  });
};

export const useMarkAllNotificationsRead = () => {
  const queryClient = useQueryClient();
  const customerId = useAuthStore((state) => state.customer?.id ?? null);
  return useMutation({
    mutationFn: async () => {
      if (customerId) markAllNotificationsReadInCache(queryClient, customerId);
      return markAllNotificationsRead();
    },
    onError: () => queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all() }),
  });
};
