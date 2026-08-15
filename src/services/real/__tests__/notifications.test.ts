import AxiosMockAdapter from 'axios-mock-adapter';
import { api } from '@/lib/api';
import {
  getUnreadNotifications,
  registerNotificationDevice,
  unregisterNotificationDevice,
} from '@/services/real/notifications';

describe('real notification service', () => {
  const mock = new AxiosMockAdapter(api);

  afterEach(() => mock.reset());
  afterAll(() => mock.restore());

  it('registers and unregisters the exact installation', async () => {
    mock.onPut('/notifications/devices').reply((config) => {
      expect(JSON.parse(config.data)).toEqual({
        token: 'ExponentPushToken[test]',
        platform: 'android',
        installationId: 'installation-id',
      });
      return [200, { success: true, data: null }];
    });
    mock.onDelete('/notifications/devices').reply((config) => {
      expect(JSON.parse(config.data)).toEqual({ installationId: 'installation-id' });
      return [200, { success: true, data: null }];
    });

    await registerNotificationDevice({
      token: 'ExponentPushToken[test]',
      platform: 'android',
      installationId: 'installation-id',
    });
    await unregisterNotificationDevice('installation-id');

    expect(mock.history.put).toHaveLength(1);
    expect(mock.history.delete).toHaveLength(1);
  });

  it('maps canonical unread rows newest first', async () => {
    mock.onGet('/notifications').reply((config) => {
      expect(config.params).toEqual({ unread: true });
      return [200, {
        success: true,
        data: [
          {
            notificationId: 'older',
            type: 'goal_milestone',
            title: 'Older',
            message: 'Body',
            entityType: 'goal',
            entityId: 'goal-id',
            isRead: false,
            sentAt: '2026-08-15T01:00:00Z',
          },
          {
            notificationId: 'newer',
            type: 'unknown',
            title: 'Newer',
            message: null,
            entityType: 'unknown',
            entityId: null,
            isRead: false,
            sentAt: '2026-08-15T02:00:00Z',
          },
        ],
      }];
    });

    const rows = await getUnreadNotifications();

    expect(rows.map((row) => row.id)).toEqual(['newer', 'older']);
    expect(rows[0]).toMatchObject({ type: 'announcement', entityType: null });
    expect(rows[1]).toMatchObject({
      type: 'goal_milestone',
      entityType: 'goal',
      entityId: 'goal-id',
    });
  });
});
