/**
 * queryKeys.ts - Single source of truth for every TanStack Query cache key.
 *
 * Why this exists: a query writes under a key and a mutation invalidates by
 * key; they only line up because the arrays match. Inline string keys make a
 * typo a *silent* cache miss (stale UI, no error). Deriving every key here
 * makes a wrong key a compile error instead, and gives one place to see what
 * invalidates what.
 *
 * Invalidation in TanStack Query is prefix-matched, so invalidating `.all()`
 * also clears the nested detail/list/etc. keys built from it.
 *
 * Keys intentionally preserve the exact shapes the hooks used before this was
 * centralised, so cache identity (and existing invalidations) are unchanged.
 */

import type { TransactionFilters } from '@/services';

export const queryKeys = {
  user: {
    all: () => ['user'] as const,
    session: (id: string | null, email: string | null) =>
      [...queryKeys.user.all(), id, email] as const,
  },
  wallets: {
    all: () => ['wallets'] as const,
    detail: (id: string | undefined) => [...queryKeys.wallets.all(), id] as const,
  },
  transactions: {
    all: () => ['transactions'] as const,
    list: (filters: TransactionFilters | null) =>
      [...queryKeys.transactions.all(), filters] as const,
    detail: (id: string | undefined) =>
      [...queryKeys.transactions.all(), 'byId', id] as const,
    recent: (n: number) => [...queryKeys.transactions.all(), 'recent', n] as const,
  },
  budgets: {
    all: () => ['budgets'] as const,
    /** Month-scoped list. `range = null` → current calendar month. */
    list: (range: { startDate: string; endDate: string } | null) =>
      [...queryKeys.budgets.all(), 'list', range] as const,
    detail: (id: string | undefined) => [...queryKeys.budgets.all(), id] as const,
  },
  goals: {
    all: () => ['goals'] as const,
    detail: (id: string | undefined) => [...queryKeys.goals.all(), id] as const,
  },
  reports: {
    all: () => ['reports'] as const,
    score: () => [...queryKeys.reports.all(), 'score'] as const,
    weekly: () => [...queryKeys.reports.all(), 'weekly'] as const,
    chat: () => [...queryKeys.reports.all(), 'chat'] as const,
  },
  notifications: {
    all: () => ['notifications'] as const,
    unread: () => [...queryKeys.notifications.all(), 'unread'] as const,
  },
  rules: {
    all: () => ['rules'] as const,
  },
  linkedWallet: {
    institutions: (country: string) => ['institutions', country] as const,
    accounts: (accessToken: string | undefined) =>
      ['linked-accounts', accessToken] as const,
  },
  customerCategories: (customerId: string | null) =>
    ['customer-categories', customerId] as const,
  categoryRequests: (customerId: string | null) =>
    ['category-requests', customerId] as const,
} as const;

/**
 * Named staleTime buckets so freshness is a deliberate choice, not the global
 * default of 0 (which refetches on every remount/refocus). Pick the bucket that
 * matches how fast the data actually changes.
 */
export const STALE_TIME = {
  /** Frequently-changing lists: transactions, notifications. */
  short: 1000 * 60 * 1, // 1 min
  /** Standard entity data: wallets, budgets, goals. */
  medium: 1000 * 60 * 2, // 2 min
  /** Expensive / slow-moving data: AI reports, linked-bank accounts. */
  long: 1000 * 60 * 5, // 5 min
  /** Effectively static reference data: bank/institution list. */
  reference: 1000 * 60 * 60, // 1 hr
} as const;
