import {
  csvImportReadyRoute,
  notificationDetailRoute,
  notificationRoute,
  parseNotificationPushData,
} from '../notificationRouting';
import type { AppNotification } from '@/types/notification';

describe('notification routing', () => {
  it('routes every notification to the static detail screen with its title and body', () => {
    expect(notificationDetailRoute({ id: 'n-1', title: 'Tiêu đề', body: 'Nội dung' })).toEqual({
      pathname: '/notification-detail',
      params: { id: 'n-1', title: 'Tiêu đề', body: 'Nội dung' },
    });
  });

  it('falls back to empty strings for missing title/body', () => {
    expect(notificationDetailRoute({ id: 'n-2', title: null, body: null })).toEqual({
      pathname: '/notification-detail',
      params: { id: 'n-2', title: '', body: '' },
    });
  });

  it('derives the detail route from a full notification regardless of entityType', () => {
    const notification: AppNotification = {
      id: 'n-3',
      customerId: 'customer',
      type: 'goal_milestone',
      title: 'Mục tiêu',
      body: 'Chi tiết mục tiêu',
      entityType: 'goal',
      entityId: 'goal-id',
      isRead: false,
      sentAt: '2026-08-15T00:00:00Z',
    };
    expect(notificationRoute(notification)).toEqual({
      pathname: '/notification-detail',
      params: { id: 'n-3', title: 'Mục tiêu', body: 'Chi tiết mục tiêu' },
    });
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

describe('csvImportReadyRoute', () => {
  it('routes a local CSV-import-ready payload back to the review screen with its params', () => {
    expect(csvImportReadyRoute({
      localKind: 'csv_import_ready',
      fileUri: 'file:///tmp/statement.csv',
      fileName: 'statement.csv',
    })).toEqual({
      pathname: '/(tabs)/entry/csv-review',
      params: { fileUri: 'file:///tmp/statement.csv', fileName: 'statement.csv' },
    });
  });

  it('falls back to a default file name when missing', () => {
    expect(csvImportReadyRoute({ localKind: 'csv_import_ready', fileUri: 'file:///tmp/x.csv' }))
      .toEqual({
        pathname: '/(tabs)/entry/csv-review',
        params: { fileUri: 'file:///tmp/x.csv', fileName: 'statement.csv' },
      });
  });

  it('returns null for a real backend notification payload, never confusing the two', () => {
    expect(csvImportReadyRoute({
      notificationId: 'notification-id',
      type: 'announcement',
    })).toBeNull();
  });

  it('returns null for an empty payload', () => {
    expect(csvImportReadyRoute({})).toBeNull();
  });
});
