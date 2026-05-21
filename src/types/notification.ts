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

// -------------------------------------------------------------------------
// AppNotification -- single row from the notifications table
// -------------------------------------------------------------------------

export interface AppNotification {
  id: string;
  userId: string;
  type: NotificationType;
  /** Short heading shown in push banner and Notification Center list */
  title: string | null;
  /** Body text of the notification */
  body: string | null;
  /**
   * In-app deep link path, e.g. "/budget/uuid" or "/report/weekly".
   * null when the notification has no actionable destination.
   */
  deepLink: string | null;
  isRead: boolean;
  /** ISO 8601 timestamp -- when the notification was dispatched */
  sentAt: string;
}
