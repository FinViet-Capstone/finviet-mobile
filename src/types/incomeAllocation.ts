/**
 * incomeAllocation.ts - the customer's monthly income + 50/30/20-style budget
 * bucket allocation, and scheduled changes to it (services/real/incomeAllocation.ts).
 */

export interface IncomeAllocationSetting {
  id: string;
  customerId: string;
  /** 'YYYY-MM' — the first calendar month this setting applies to. */
  effectiveMonth: string;
  monthlyIncome: number;
  needsPct: number;
  wantsPct: number;
  savingsPct: number;
  createdAt: string;
}

export interface ScheduleIncomeAllocationInput {
  monthlyIncome: number;
  needsPct: number;
  wantsPct: number;
  savingsPct: number;
}

/**
 * Why the goals do or don't fit the Savings bucket. Drives which copy the goals
 * screen shows — the backend deliberately returns a code, not a sentence.
 *
 * - `on_track` — the Savings cap already covers every active goal.
 * - `adjustable` — it doesn't, but moving Wants into Savings covers it; `proposed*` is set.
 * - `infeasible` — even at the Wants floor it can't; `maxFundableMonthlySavings` is set.
 *   The backend never proposes cutting Needs, so this is a real dead end for the
 *   current plan, not a number the user can accept their way out of.
 * - `no_goals` / `no_income` — nothing to fund / no income on record to take a percentage of.
 * - `invalid_allocation` — the stored split doesn't total 100, so no proposal can be applied.
 */
export type SavingsPlanStatus =
  | 'on_track'
  | 'adjustable'
  | 'infeasible'
  | 'no_goals'
  | 'no_income'
  | 'invalid_allocation';

/** GET /profile/income-allocation/recommendation. */
export interface SavingsPlanRecommendation {
  /** 'YYYY-MM' this was computed for. */
  month: string;
  status: SavingsPlanStatus;
  monthlyIncome: number;
  /** Σ of the per-goal monthly figure across active goals that still have a deadline. */
  requiredMonthlySavings: number;
  /** What the current split allocates to Savings, in VND. */
  currentSavingsCap: number;
  /** How far the goals outrun that cap. 0 when on track. */
  shortfall: number;
  goalsConsidered: number;
  /** Active goals with no deadline: excluded from the total, surfaced so we can say so. */
  goalsWithoutDeadline: number;
  /** Only set when status is 'adjustable'. */
  proposedNeedsPct: number | null;
  proposedWantsPct: number | null;
  proposedSavingsPct: number | null;
  /** Spending caps in VND implied by the proposed split. Null unless it is set. */
  proposedNeedsCap: number | null;
  proposedWantsCap: number | null;
  proposedSavingsCap: number | null;
  /** Only set when status is 'infeasible' — the ceiling without cutting Needs. */
  maxFundableMonthlySavings: number | null;
  /** Total still to be saved across the goals counted above. */
  totalRemainingAmount: number;
  /**
   * Shortest deadline that could ever work, in whole months. Only set when status is
   * 'infeasible' and the ceiling is above zero — i.e. exactly when the user needs to know how
   * far to push the deadline out.
   */
  minimumMonthsToFund: number | null;
  /**
   * Largest target that fits the existing deadline. Only set when status is 'infeasible' AND
   * exactly one goal was counted — with several there is no single target to lower.
   */
  maximumFundableTargetAmount: number | null;
  /**
   * The split already scheduled for next month, if any. Applying **replaces** it, so the screen
   * must warn before discarding a split the customer set themselves. Null when nothing is
   * scheduled, and `undefined` against a backend that predates this field.
   */
  pendingBeforeApply: IncomeAllocationSetting | null;
}
