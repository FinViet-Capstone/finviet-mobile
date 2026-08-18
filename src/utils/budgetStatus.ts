import type { BudgetStatus } from '@/types/budget';

/**
 * safe <60% | warning 60–80% | danger >80% — the single threshold set for
 * needs/wants spend-pacing status, shared by Home's BudgetOverviewCard and
 * the Budgets tab's BucketCard. Matches `BudgetWithSpend.status`'s own
 * derivation (mock/budgets.ts, real/budgets.ts — already identical to each
 * other), which these two UI-side recomputations had drifted from
 * (previously >85/>60 on Home, >80/>60 — no `=` — on the Budgets tab).
 *
 * Does not apply to the Savings bucket, which uses a different, deliberately
 * asymmetric scheme (exceeding a savings target is good, not bad) — see
 * `real/budgets.ts`'s `toStatus` and the Budgets tab's `BucketCard`.
 */
export function getBudgetStatus(percentage: number): BudgetStatus {
  if (percentage > 80) return 'danger';
  if (percentage >= 60) return 'warning';
  return 'safe';
}
