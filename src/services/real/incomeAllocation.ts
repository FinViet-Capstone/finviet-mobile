/**
 * real/incomeAllocation.ts — real .NET income-allocation service.
 *
 * Backend: GET/POST /profile/income-allocation (ProfileController).
 *   - GET ?month=yyyy-MM → { current: IncomeAllocationEntry, pending: IncomeAllocationEntry | null }
 *     Without `month`, `current` resolves for today's calendar month
 *     (carry-forward from the latest scheduled entry with effectiveMonth <=
 *     month, or the customer's onboarding defaults). With `month`, the same
 *     carry-forward resolution runs against the requested month instead —
 *     answers "what was in effect for month X?" for any past/future month.
 *     `pending` is always null when `month` is given ("next month's draft"
 *     isn't meaningful relative to an arbitrary queried month), so callers
 *     that want the scheduled draft must query without `month`.
 *   - POST → schedules a new entry, always effective next calendar month.
 *
 * getIncomeAllocationHistory has no backend equivalent (no full-history
 * listing endpoint exists) and isn't called from any hook/screen — dropped
 * entirely rather than kept as a dead re-export.
 */

import { isAxiosError } from 'axios';
import { api, unwrap } from '@/lib/api';
import type {
  IncomeAllocationSetting,
  SavingsPlanRecommendation,
  SavingsPlanStatus,
  ScheduleIncomeAllocationInput,
} from '@/types';

// ─── Backend DTO ──────────────────────────────────────────────────────────────

interface IncomeAllocationEntryDto {
  effectiveMonth: string;
  monthlyIncome: number;
  needsPct: number;
  wantsPct: number;
  savingsPct: number;
}

interface IncomeAllocationSummaryDto {
  current: IncomeAllocationEntryDto;
  pending: IncomeAllocationEntryDto | null;
}

function toSetting(dto: IncomeAllocationEntryDto, id: string): IncomeAllocationSetting {
  return {
    id,
    customerId: '',
    effectiveMonth: dto.effectiveMonth,
    monthlyIncome: dto.monthlyIncome,
    needsPct: dto.needsPct,
    wantsPct: dto.wantsPct,
    savingsPct: dto.savingsPct,
    createdAt: '',
  };
}

async function getSummary(month?: string): Promise<IncomeAllocationSummaryDto> {
  const res = await api.get('/profile/income-allocation', {
    params: month ? { month } : undefined,
  });
  return unwrap<IncomeAllocationSummaryDto>(res);
}

// ─── Reads ──────────────────────────────────────────────────────────────────

export async function getEffectiveIncomeAllocation(month: string): Promise<IncomeAllocationSetting> {
  const summary = await getSummary(month);
  return toSetting(summary.current, 'current');
}

export async function getScheduledIncomeAllocation(): Promise<IncomeAllocationSetting | null> {
  // No `month` here — `pending` is only ever populated on the unfiltered query.
  const summary = await getSummary();
  return summary.pending ? toSetting(summary.pending, 'pending') : null;
}

// ─── Writes ─────────────────────────────────────────────────────────────────

/**
 * Always targets next calendar month server-side (POST /profile/income-allocation),
 * same as the mock — revising an already-scheduled draft is an upsert on the
 * backend too, so calling this again before rollover just updates the pending entry.
 */
export async function scheduleIncomeAllocationChange(
  input: ScheduleIncomeAllocationInput,
): Promise<IncomeAllocationSetting> {
  const res = await api.post('/profile/income-allocation', {
    monthlyIncome: input.monthlyIncome,
    needsPct: input.needsPct,
    wantsPct: input.wantsPct,
    savingsPct: input.savingsPct,
  });
  return toSetting(unwrap<IncomeAllocationEntryDto>(res), 'pending');
}

// ─── Savings-goal ↔ spending balance ────────────────────────────────────────

interface SavingsPlanRecommendationDto {
  month: string;
  status: SavingsPlanStatus;
  monthlyIncome: number;
  requiredMonthlySavings: number;
  currentSavingsCap: number;
  shortfall: number;
  goalsConsidered: number;
  goalsWithoutDeadline: number;
  proposed: IncomeAllocationEntryDto | null;
  proposedNeedsCap: number | null;
  proposedWantsCap: number | null;
  proposedSavingsCap: number | null;
  maxFundableMonthlySavings: number | null;
  totalRemainingAmount: number;
  minimumMonthsToFund: number | null;
  maximumFundableTargetAmount: number | null;
  pendingBeforeApply: IncomeAllocationEntryDto | null;
}

/**
 * Flattens the backend's nested `proposed` entry into sibling `proposed*Pct`
 * fields — the screen only ever needs the three percentages and the three caps,
 * never the entry's own effectiveMonth (applying always targets next month, and
 * the apply endpoint decides that server-side anyway).
 */
function toRecommendation(dto: SavingsPlanRecommendationDto): SavingsPlanRecommendation {
  return {
    month: dto.month,
    status: dto.status,
    monthlyIncome: dto.monthlyIncome,
    requiredMonthlySavings: dto.requiredMonthlySavings,
    currentSavingsCap: dto.currentSavingsCap,
    shortfall: dto.shortfall,
    goalsConsidered: dto.goalsConsidered,
    goalsWithoutDeadline: dto.goalsWithoutDeadline,
    proposedNeedsPct: dto.proposed?.needsPct ?? null,
    proposedWantsPct: dto.proposed?.wantsPct ?? null,
    proposedSavingsPct: dto.proposed?.savingsPct ?? null,
    proposedNeedsCap: dto.proposedNeedsCap,
    proposedWantsCap: dto.proposedWantsCap,
    proposedSavingsCap: dto.proposedSavingsCap,
    maxFundableMonthlySavings: dto.maxFundableMonthlySavings,
    totalRemainingAmount: dto.totalRemainingAmount,
    minimumMonthsToFund: dto.minimumMonthsToFund,
    maximumFundableTargetAmount: dto.maximumFundableTargetAmount,
    pendingBeforeApply: dto.pendingBeforeApply
      ? toSetting(dto.pendingBeforeApply, 'pending')
      : null,
  };
}

/**
 * Returns `null` when the deployed backend doesn't have this endpoint yet (404).
 *
 * This ships ahead of the backend change reaching Render, and the goals screen
 * keeps its own client-side affordability check as a fallback. Letting the 404
 * surface as a query error instead would make the over-allocation warning vanish
 * entirely against the current deployment — a silent regression of behaviour the
 * thesis council has already seen. Any other failure still throws.
 */
export async function getSavingsPlanRecommendation(
  month?: string,
): Promise<SavingsPlanRecommendation | null> {
  try {
    const res = await api.get('/profile/income-allocation/recommendation', {
      params: month ? { month } : undefined,
    });
    return toRecommendation(unwrap<SavingsPlanRecommendationDto>(res));
  } catch (err) {
    if (isAxiosError(err) && err.response?.status === 404) return null;
    throw err;
  }
}

/**
 * Applies the proposed split. The backend recomputes it server-side rather than
 * accepting one from here, so there is deliberately no payload — a proposal this
 * screen is holding may already be stale from a goal edit or contribution.
 * Returns the scheduled entry, which takes effect next calendar month.
 */
export async function applySavingsPlanRecommendation(): Promise<IncomeAllocationSetting> {
  const res = await api.post('/profile/income-allocation/recommendation/apply');
  return toSetting(unwrap<IncomeAllocationEntryDto>(res), 'pending');
}
