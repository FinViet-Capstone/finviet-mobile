/**
 * notificationPrefsCache.ts — device-local cache of the three notification
 * toggles (budget-alert on/off, weekly report, savings milestone) that have
 * no backend field at all: `finviet-be`'s `UpdateProfileSettingsRequest`
 * only carries `Theme` and `NotifBudgetThresholds` (a threshold pair, not a
 * per-category boolean), so there is nowhere server-side to persist these.
 *
 * Keyed per customer id so switching accounts on one device can't leak one
 * customer's local choice onto another. `real/auth.ts`'s `toCustomer` reads
 * this to seed `Customer.notifications` on every login/profile fetch instead
 * of hardcoding `true`; `useUpdatePreferences` writes here whenever a
 * notifications patch comes through.
 *
 * Same shape as `src/lib/themeCache.ts` (SecureStore-backed), but reads are
 * async here since callers already await the surrounding profile mapping.
 */

import * as SecureStore from 'expo-secure-store';

export interface NotificationPrefs {
  budget: boolean;
  report: boolean;
  goals: boolean;
}

const DEFAULT_PREFS: NotificationPrefs = { budget: true, report: true, goals: true };

function keyFor(customerId: string): string {
  return `notif.prefs.${customerId}`;
}

function isNotificationPrefs(value: unknown): value is NotificationPrefs {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  return typeof v.budget === 'boolean' && typeof v.report === 'boolean' && typeof v.goals === 'boolean';
}

/** Last-saved prefs for a customer, or the all-on default if none were ever saved. */
export async function getNotificationPrefs(customerId: string): Promise<NotificationPrefs> {
  if (!customerId) return DEFAULT_PREFS;
  const raw = await SecureStore.getItemAsync(keyFor(customerId));
  if (!raw) return DEFAULT_PREFS;
  try {
    const parsed: unknown = JSON.parse(raw);
    return isNotificationPrefs(parsed) ? parsed : DEFAULT_PREFS;
  } catch {
    return DEFAULT_PREFS;
  }
}

/** Merge a patch into the saved prefs for a customer and persist the result. */
export async function setNotificationPrefs(
  customerId: string,
  patch: Partial<NotificationPrefs>,
): Promise<NotificationPrefs> {
  const current = await getNotificationPrefs(customerId);
  const next = { ...current, ...patch };
  if (customerId) await SecureStore.setItemAsync(keyFor(customerId), JSON.stringify(next));
  return next;
}
