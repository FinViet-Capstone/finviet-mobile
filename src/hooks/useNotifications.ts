import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getNotifications,
  getUnreadNotifications,
  markNotificationRead,
  markAllNotificationsRead,
} from '@/services';
import { queryKeys, STALE_TIME } from '@/lib/queryKeys';

// ─── Queries ──────────────────────────────────────────────────────────────────

export const useNotifications = () =>
  useQuery({
    queryKey: queryKeys.notifications.all(),
    queryFn: () => getNotifications(),
    staleTime: STALE_TIME.short,
  });

export const useUnreadNotifications = () =>
  useQuery({
    queryKey: queryKeys.notifications.unread(),
    queryFn: () => getUnreadNotifications(),
    staleTime: STALE_TIME.short,
  });

// ─── Mutations ────────────────────────────────────────────────────────────────

export const useMarkNotificationRead = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => markNotificationRead(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.notifications.all() }),
  });
};

export const useMarkAllNotificationsRead = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => markAllNotificationsRead(),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.notifications.all() }),
  });
};
