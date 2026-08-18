/**
 * notification.ts - FinViet type definitions for the Notification domain
 *
 * Covers both push notifications delivered via FCM and the in-app
 * Notification Center (More -> Notification Center).
 *
 * Date fields:
 *   sentAt : full ISO 8601 timestamp string
 */

// -------------------------------------------------------------------------
// Notification type union
// Mirrors the notifications.type DB ENUM exactly.
// -------------------------------------------------------------------------

export type NotificationType =
  | 'budget_alert'    // Budget category reached 80% threshold
  | 'weekly_report'   // Monday weekly AI report is ready
  | 'goal_milestone'  // Savings goal progress milestone
  | 'announcement';   // Admin-broadcast announcement

/**
 * Origin entity kind for a notification, as reported by the backend. Mirrors
 * the notification_entity_type DB ENUM. Not currently used for FE routing —
 * every notification tap opens the static detail screen instead — but kept
 * for cache identity and any future entity-specific display.
 */
export type NotificationEntityType = 'budget' | 'goal' | 'report' | 'wallet' | 'system';

// -------------------------------------------------------------------------
// AppNotification -- single row from the notifications table
// -------------------------------------------------------------------------

export interface AppNotification {
  id: string;
  customerId: string;
  type: NotificationType;
  /** Short heading shown in push banner and Notification Center list */
  title: string | null;
  /** Body text of the notification */
  body: string | null;
  /** Related entity kind, informational only — see NotificationEntityType. */
  entityType: NotificationEntityType | null;
  /** Id of the related entity (goalId / budgetId / walletId); null for report/system. */
  entityId: string | null;
  isRead: boolean;
  /** ISO 8601 timestamp -- when the notification was dispatched */
  sentAt: string;
}
