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
  userId: string;
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

/**
 * @deprecated Prefer BudgetWithSpend -- retained for backward compatibility.
 */
export type BudgetWithProgress = BudgetWithSpend;

// -------------------------------------------------------------------------
// API payload for creating or updating a budget (upsert)
// -------------------------------------------------------------------------

export interface UpsertBudgetPayload {
  categoryId: string;
  /** Monthly spending cap in whole VND */
  monthlyLimit: number;
  /** Defaults to 1 if omitted */
  resetDay?: number;
}
