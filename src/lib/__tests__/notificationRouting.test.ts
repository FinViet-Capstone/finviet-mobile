import {
  notificationEntityRoute,
  parseNotificationPushData,
} from '../notificationRouting';

describe('notification routing', () => {
  it.each([
    ['goal', 'goal/id', '/(tabs)/budgets/goals/goal%2Fid'],
    ['budget', 'budget-id', '/(tabs)/budgets'],
    ['wallet', 'wallet/id', '/(tabs)/wallets/wallet%2Fid'],
    ['system', null, '/notifications'],
    [null, null, '/notifications'],
  ] as const)('maps %s notifications to the supported route', (entityType, entityId, route) => {
    expect(notificationEntityRoute(entityType, entityId)).toBe(route);
  });

  it('opens the exact weekly report when its ID is present', () => {
    expect(notificationEntityRoute('report', 'report-id')).toEqual({
      pathname: '/(tabs)/home/weekly',
      params: { reportId: 'report-id' },
    });
    expect(notificationEntityRoute('report', null)).toBe('/(tabs)/home/weekly');
  });

  it('parses canonical push metadata', () => {
    expect(parseNotificationPushData({
      notificationId: 'notification-id',
      type: 'goal_milestone',
      entityType: 'goal',
      entityId: 'goal-id',
    })).toEqual({
      notificationId: 'notification-id',
      type: 'goal_milestone',
      entityType: 'goal',
      entityId: 'goal-id',
    });
  });

  it('falls back safely for malformed optional metadata', () => {
    expect(parseNotificationPushData({
      notificationId: 'notification-id',
      type: 'unknown',
      entityType: 'unknown',
    })).toEqual({
      notificationId: 'notification-id',
      type: 'announcement',
      entityType: null,
      entityId: null,
    });
    expect(parseNotificationPushData({ type: 'announcement' })).toBeNull();
  });
});
