import type { QueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import type { AppNotification } from '@/types/notification';

export function insertNotificationInCache(
  queryClient: QueryClient,
  customerId: string,
  notification: AppNotification,
): void {
  queryClient.setQueryData<AppNotification[]>(
    queryKeys.notifications.list(customerId),
    (current = []) => upsertNotification(current, notification),
  );
  if (!notification.isRead) {
    queryClient.setQueryData<AppNotification[]>(
      queryKeys.notifications.unread(customerId),
      (current = []) => upsertNotification(current, notification),
    );
  }
}

export function markNotificationReadInCache(
  queryClient: QueryClient,
  customerId: string,
  notificationId: string,
): void {
  queryClient.setQueryData<AppNotification[]>(
    queryKeys.notifications.list(customerId),
    (current = []) => current.map((notification) =>
      notification.id === notificationId
        ? { ...notification, isRead: true }
        : notification),
  );
  queryClient.setQueryData<AppNotification[]>(
    queryKeys.notifications.unread(customerId),
    (current = []) => current.filter((notification) => notification.id !== notificationId),
  );
}

export function markAllNotificationsReadInCache(
  queryClient: QueryClient,
  customerId: string,
): void {
  queryClient.setQueryData<AppNotification[]>(
    queryKeys.notifications.list(customerId),
    (current = []) => current.map((notification) => ({ ...notification, isRead: true })),
  );
  queryClient.setQueryData<AppNotification[]>(queryKeys.notifications.unread(customerId), []);
}

function upsertNotification(
  current: AppNotification[],
  incoming: AppNotification,
): AppNotification[] {
  const withoutDuplicate = current.filter((notification) => notification.id !== incoming.id);
  return [incoming, ...withoutDuplicate].sort((a, b) => b.sentAt.localeCompare(a.sentAt));
}
