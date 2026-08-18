import type { Href } from 'expo-router';
import type {
  AppNotification,
  NotificationEntityType,
  NotificationType,
} from '@/types/notification';

const NOTIFICATION_TYPES: NotificationType[] = [
  'budget_alert',
  'weekly_report',
  'goal_milestone',
  'announcement',
];

const ENTITY_TYPES: NotificationEntityType[] = [
  'budget',
  'goal',
  'report',
  'wallet',
  'system',
];

export interface NotificationPushData {
  notificationId: string;
  type: NotificationType;
  entityType: NotificationEntityType | null;
  entityId: string | null;
}

export function notificationDetailRoute(params: {
  id: string;
  title: string | null;
  body: string | null;
}): Href {
  return {
    pathname: '/notification-detail',
    params: {
      id: params.id,
      title: params.title ?? '',
      body: params.body ?? '',
    },
  };
}

export function notificationRoute(notification: AppNotification): Href {
  return notificationDetailRoute({
    id: notification.id,
    title: notification.title,
    body: notification.body,
  });
}

export function parseNotificationPushData(
  data: Record<string, unknown>,
): NotificationPushData | null {
  const notificationId = readString(data.notificationId);
  if (!notificationId) return null;

  const rawType = readString(data.type)?.toLowerCase();
  const type = NOTIFICATION_TYPES.includes(rawType as NotificationType)
    ? (rawType as NotificationType)
    : 'announcement';
  const rawEntityType = readString(data.entityType)?.toLowerCase();
  const entityType = ENTITY_TYPES.includes(rawEntityType as NotificationEntityType)
    ? (rawEntityType as NotificationEntityType)
    : null;

  return {
    notificationId,
    type,
    entityType,
    entityId: readString(data.entityId),
  };
}

function readString(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}
