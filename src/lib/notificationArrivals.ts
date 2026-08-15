import type { AppNotification } from '@/types/notification';

export interface NotificationArrivalState {
  isSeeded: boolean;
  seenIds: Set<string>;
}

export function collectNewUnreadNotifications(
  state: NotificationArrivalState,
  unread: AppNotification[],
): AppNotification[] {
  if (!state.isSeeded) {
    unread.forEach((notification) => state.seenIds.add(notification.id));
    state.isSeeded = true;
    return [];
  }

  return unread.filter((notification) => {
    if (state.seenIds.has(notification.id)) return false;
    state.seenIds.add(notification.id);
    return true;
  });
}
