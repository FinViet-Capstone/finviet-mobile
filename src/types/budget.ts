/**
 * budget.ts - FinViet type definitions for the Budget domain
 *
 * Monetary amounts: number = whole Vietnamese Dong (VND).
 * One budget row per user per category; upsert on save.
 */

// -------------------------------------------------------------------------
// Budget status thresholds (SPEC: green <60%, yellow 60-80%, red >80%)
// -------------------------------------------------------------------------

export type BudgetStatus = 'safe' | 'warning' | 'danger';

// -------------------------------------------------------------------------
// Core budget row (mirrors the budgets DB table)
// -------------------------------------------------------------------------

export interface Budget {
  id: string;
  customerId: string;
  categoryId: string;
  /** Monthly spending cap in whole VND */
  monthlyLimit: number;
  /** Day of month on which the budget resets (default 1) */
  resetDay: number;
  /** ISO 8601 timestamp */
  createdAt: string;
  /** ISO 8601 timestamp */
  updatedAt: string;
}

// -------------------------------------------------------------------------
// BudgetWithSpend -- Budget + current-period spend for UI rendering
// (Phase 1 required export name; used by BudgetProgressBar and the budget list)
// -------------------------------------------------------------------------

export interface BudgetWithSpend extends Budget {
  /** Display name of the category in the active language */
  categoryName: string;
  /** Hex color for the category chip */
  categoryColor: string;
  /** Icon identifier for the category */
  categoryIcon: string;
  /** Total spent in the current budget period (whole VND) */
  spent: number;
  /** monthlyLimit - spent (may be negative when over budget) */
  remaining: number;
  /** (spent / monthlyLimit) * 100, clamped to 0-100 for progress bar */
  percentage: number;
  /** Derived from percentage: safe <60, warning 60-80, danger >80 */
  status: BudgetStatus;
}

// -------------------------------------------------------------------------
// Budget service input/return contracts (services/real/budgets.ts)
// -------------------------------------------------------------------------

export interface CreateBudgetInput {
  categoryId: string;
  monthlyLimit: number;
}

export interface UpdateBudgetInput {
  monthlyLimit?: number;
}

export interface MonthRange {
  startDate: string;
  endDate: string;
}

// -------------------------------------------------------------------------
// Bucket summary (50/30/20 pacing — GET /budgets/buckets)
// -------------------------------------------------------------------------

export interface BucketSummary {
  /** 'needs' | 'wants' | 'savings' */
  bucket: string;
  /** Target share of income for this bucket, 0–1 (e.g. 0.5). */
  allocationPct: number;
  /** Income × allocationPct — the monthly cap for the bucket. */
  allocationCap: number;
  /** Sum of category budget limits assigned to this bucket. */
  categoryLimitTotal: number;
  spent: number;
  remaining: number;
  /** spent / allocationCap × 100. */
  percentage: number;
  /** categoryLimitTotal exceeds the allocationCap. */
  overAllocated: boolean;
  /** Straight-line expected spend by today (cap × elapsed-fraction of month). */
  expectedSpent: number;
  /** spent − expectedSpent (positive = ahead of pace / overspending). */
  paceDeviation: number;
  /** 'ahead' | 'on_track' | 'behind' relative to straight-line pace. */
  paceStatus: string;
}

export interface BucketSummaryList {
  /** 'YYYY-MM' */
  month: string;
  monthlyIncome: number;
  budgetAdherenceScore: number;
  /** Uncategorized share of total expense, 0–1 (e.g. 0.1 = 10%). */
  uncategorizedRatio: number;
  uncategorizedWarning: boolean;
  buckets: BucketSummary[];
}
