import {
  collectNewUnreadNotifications,
  type NotificationArrivalState,
} from '@/lib/notificationArrivals';
import type { AppNotification } from '@/types/notification';

function notification(id: string): AppNotification {
  return {
    id,
    customerId: 'customer',
    type: 'announcement',
    title: id,
    body: null,
    entityType: null,
    entityId: null,
    isRead: false,
    sentAt: '2026-08-15T00:00:00Z',
  };
}

describe('collectNewUnreadNotifications', () => {
  let state: NotificationArrivalState;

  beforeEach(() => {
    state = { isSeeded: false, seenIds: new Set<string>() };
  });

  it('seeds historical unread notifications without replaying banners', () => {
    expect(collectNewUnreadNotifications(state, [notification('old-1'), notification('old-2')]))
      .toEqual([]);
    expect(state.isSeeded).toBe(true);
    expect(state.seenIds).toEqual(new Set(['old-1', 'old-2']));
  });

  it('returns only newly observed rows in server order', () => {
    collectNewUnreadNotifications(state, [notification('old')]);

    const arrivals = collectNewUnreadNotifications(state, [
      notification('new-2'),
      notification('new-1'),
      notification('old'),
    ]);

    expect(arrivals.map((item) => item.id)).toEqual(['new-2', 'new-1']);
    expect(collectNewUnreadNotifications(state, arrivals)).toEqual([]);
  });
});
