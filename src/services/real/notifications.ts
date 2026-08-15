/**
 * real/notifications.ts — real .NET notification service.
 *
 * Mirrors src/services/mock/notifications.ts so the barrel can swap mock ⇄ real.
 *
 * Backend: api/notifications/* (NotificationsController), ApiResponse<T> envelope.
 *   - GET    /notifications?unread=bool  → NotificationResponse[]
 *   - PATCH  /notifications/{id}/read    → 200 / 404
 *   - POST   /notifications/read-all     → { count }
 *   - PUT    /notifications/devices      → register/rotate this installation
 *   - DELETE /notifications/devices      → unregister this installation
 *
 * Reads are async here (HTTP) where the mock was synchronous — every consumer
 * goes through TanStack Query's queryFn, which awaits either shape.
 */

import { api, unwrap } from '@/lib/api';
import type { AppNotification } from '@/types';
import type { NotificationType, NotificationEntityType } from '@/types/notification';

// ─── Backend DTO ──────────────────────────────────────────────────────────────

interface NotificationDto {
  notificationId: string;
  type: string;
  title: string | null;
  message: string | null;
  entityType: string | null;
  entityId: string | null;
  isRead: boolean;
  sentAt: string | null;
}

// ─── Mappers ──────────────────────────────────────────────────────────────────

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

function toType(raw: string): NotificationType {
  const v = (raw ?? '').toLowerCase();
  return (NOTIFICATION_TYPES as string[]).includes(v)
    ? (v as NotificationType)
    : 'announcement';
}

function toEntityType(raw: string | null): NotificationEntityType | null {
  const v = (raw ?? '').toLowerCase();
  return (ENTITY_TYPES as string[]).includes(v)
    ? (v as NotificationEntityType)
    : null;
}

function toNotification(dto: NotificationDto): AppNotification {
  return {
    id: dto.notificationId,
    customerId: '',
    type: toType(dto.type),
    title: dto.title,
    body: dto.message,
    entityType: toEntityType(dto.entityType),
    entityId: dto.entityId,
    isRead: dto.isRead,
    sentAt: dto.sentAt ?? '',
  };
}

// ─── Reads ────────────────────────────────────────────────────────────────────

async function fetchNotifications(unread: boolean): Promise<AppNotification[]> {
  const res = await api.get('/notifications', { params: { unread } });
  return unwrap<NotificationDto[]>(res)
    .map(toNotification)
    .sort((a, b) => b.sentAt.localeCompare(a.sentAt));
}

export function getNotifications(): Promise<AppNotification[]> {
  return fetchNotifications(false);
}

export function getUnreadNotifications(): Promise<AppNotification[]> {
  return fetchNotifications(true);
}

// ─── Device registration ──────────────────────────────────────────────────────

export interface RegisterNotificationDeviceInput {
  token: string;
  platform: 'ios' | 'android';
  installationId: string;
}

export async function registerNotificationDevice(
  input: RegisterNotificationDeviceInput,
): Promise<void> {
  await api.put('/notifications/devices', input);
}

export async function unregisterNotificationDevice(installationId: string): Promise<void> {
  await api.delete('/notifications/devices', { data: { installationId } });
}

// ─── Writes ───────────────────────────────────────────────────────────────────

export async function markNotificationRead(id: string): Promise<void> {
  await api.patch(`/notifications/${id}/read`);
}

export async function markAllNotificationsRead(): Promise<{ count: number }> {
  const res = await api.post('/notifications/read-all');
  return unwrap<{ count: number }>(res);
}
