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

export function notificationEntityRoute(
  entityType: NotificationEntityType | null,
  entityId: string | null,
): Href {
  switch (entityType) {
    case 'goal':
      return entityId
        ? `/(tabs)/budgets/goals/${encodeURIComponent(entityId)}`
        : '/(tabs)/budgets/goals';
    case 'budget':
      return '/(tabs)/budgets';
    case 'report':
      return entityId
        ? { pathname: '/(tabs)/home/weekly', params: { reportId: entityId } }
        : '/(tabs)/home/weekly';
    case 'wallet':
      return entityId
        ? `/(tabs)/wallets/${encodeURIComponent(entityId)}`
        : '/(tabs)/wallets';
    case 'system':
    default:
      return '/notifications';
  }
}

export function notificationRoute(notification: AppNotification): Href {
  return notificationEntityRoute(notification.entityType, notification.entityId);
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
