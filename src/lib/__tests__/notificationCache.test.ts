import { QueryClient } from '@tanstack/react-query';
import {
  insertNotificationInCache,
  markAllNotificationsReadInCache,
  markNotificationReadInCache,
} from '../notificationCache';
import { queryKeys } from '../queryKeys';
import type { AppNotification } from '@/types/notification';

const CUSTOMER_ID = 'customer';

function notification(id: string, sentAt: string): AppNotification {
  return {
    id,
    customerId: CUSTOMER_ID,
    type: 'announcement',
    title: id,
    body: null,
    entityType: null,
    entityId: null,
    isRead: false,
    sentAt,
  };
}

describe('notification cache', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient();
  });

  afterEach(() => {
    queryClient.clear();
  });

  it('deduplicates push and polling arrivals by canonical ID', () => {
    const incoming = notification('same-id', '2026-08-15T02:00:00Z');

    insertNotificationInCache(queryClient, CUSTOMER_ID, incoming);
    insertNotificationInCache(queryClient, CUSTOMER_ID, {
      ...incoming,
      title: 'updated title',
    });

    expect(queryClient.getQueryData(queryKeys.notifications.unread(CUSTOMER_ID))).toEqual([
      { ...incoming, title: 'updated title' },
    ]);
  });

  it('marks one or every notification read in both caches', () => {
    const first = notification('first', '2026-08-15T02:00:00Z');
    const second = notification('second', '2026-08-15T01:00:00Z');
    queryClient.setQueryData(queryKeys.notifications.list(CUSTOMER_ID), [first, second]);
    queryClient.setQueryData(queryKeys.notifications.unread(CUSTOMER_ID), [first, second]);

    markNotificationReadInCache(queryClient, CUSTOMER_ID, 'first');
    expect(queryClient.getQueryData<AppNotification[]>(
      queryKeys.notifications.unread(CUSTOMER_ID),
    )).toEqual([second]);
    expect(queryClient.getQueryData<AppNotification[]>(
      queryKeys.notifications.list(CUSTOMER_ID),
    )?.[0].isRead).toBe(true);

    markAllNotificationsReadInCache(queryClient, CUSTOMER_ID);
    expect(queryClient.getQueryData(queryKeys.notifications.unread(CUSTOMER_ID))).toEqual([]);
    expect(queryClient.getQueryData<AppNotification[]>(
      queryKeys.notifications.list(CUSTOMER_ID),
    )?.every((item) => item.isRead)).toBe(true);
  });
});
