import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getNotifications,
  getUnreadNotifications,
  markNotificationRead,
  markAllNotificationsRead,
} from '@/services';

// ─── Queries ──────────────────────────────────────────────────────────────────

export const useNotifications = () =>
  useQuery({ queryKey: ['notifications'], queryFn: () => getNotifications() });

export const useUnreadNotifications = () =>
  useQuery({
    queryKey: ['notifications', 'unread'],
    queryFn: () => getUnreadNotifications(),
  });

// ─── Mutations ────────────────────────────────────────────────────────────────

export const useMarkNotificationRead = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => markNotificationRead(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  });
};

export const useMarkAllNotificationsRead = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => markAllNotificationsRead(),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  });
};
