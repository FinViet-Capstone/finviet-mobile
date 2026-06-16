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
 * Typed destination for a notification. FE maps (entityType, entityId) → route
 * at render time instead of storing a brittle path string. Mirrors the
 * notification_entity_type DB ENUM. null = no actionable destination.
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
  /** Related entity kind; FE derives the route from this + entityId. null = no destination. */
  entityType: NotificationEntityType | null;
  /** Id of the related entity (goalId / budgetId / walletId); null for report/system. */
  entityId: string | null;
  isRead: boolean;
  /** ISO 8601 timestamp -- when the notification was dispatched */
  sentAt: string;
}
