import type { Href } from 'expo-router';
import type {
  AppNotification,
  NotificationEntityType,
  NotificationType,
} from '@/types/notification';

/** Marker on a notification's `data` payload identifying it as purely local/client-side
 * (never a backend AppNotification row) — lib/notifications.ts's scheduleCsvImportReadyNotification
 * sets it, and NotificationProvider's generic response/receive handlers check for it (via
 * csvImportReadyRoute below) to skip their normal backend-notification handling. Lives here
 * rather than in lib/notifications.ts so this file — and its tests — don't have to import the
 * (heavy, Expo-Go-warning-on-import) expo-notifications SDK just for routing logic. */
export const CSV_IMPORT_READY_KIND = 'csv_import_ready';

export interface CsvImportReadyData {
  [key: string]: unknown;
  localKind: typeof CSV_IMPORT_READY_KIND;
  fileUri: string;
  fileName: string;
}

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

/** Purely local notification (see lib/notifications.ts) — never a backend AppNotification row,
 * so it's routed straight to the CSV review screen rather than through parseNotificationPushData/
 * notification-detail. Returns null for any payload that isn't one of these, so callers can use
 * it both to route a tap and to guard NotificationProvider's generic backend-notification
 * handling against treating this as a real notification. */
export function csvImportReadyRoute(data: Record<string, unknown>): Href | null {
  if ((data as Partial<CsvImportReadyData>).localKind !== CSV_IMPORT_READY_KIND) return null;

  const fileUri = readString(data.fileUri) ?? '';
  const fileName = readString(data.fileName) ?? 'statement.csv';
  return {
    pathname: '/(tabs)/entry/csv-review',
    params: { fileUri, fileName },
  };
}

function readString(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}
