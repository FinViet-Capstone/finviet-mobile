/**
 * real/incomeAllocation.ts — real .NET income-allocation service.
 *
 * Backend: GET/POST /profile/income-allocation (ProfileController).
 *   - GET  → { current: IncomeAllocationEntry, pending: IncomeAllocationEntry | null }
 *     `current` is always resolved for *today's* calendar month (carry-forward
 *     from the latest scheduled entry with effectiveMonth <= now, or the
 *     customer's onboarding defaults) — there is no month-lookup parameter, so
 *     this only answers "what's in effect right now?", not "what was in effect
 *     in month X?" for an arbitrary past/future month.
 *   - POST → schedules a new entry, always effective next calendar month.
 *
 * getEffectiveIncomeAllocation(month) is therefore only precise when `month`
 * is the current month — which covers every real caller except the Budgets
 * screen's month-picker, and that screen was switched to source its
 * numbers from GET /budgets/buckets?month= instead (see
 * app/(tabs)/budgets/index.tsx), which the backend already resolves
 * correctly per-month. For any other month passed here, this falls back to
 * "current" rather than fabricating a wrong-but-plausible number.
 *
 * getIncomeAllocationHistory has no backend equivalent (no full-history
 * listing endpoint exists) and stays on the mock — it isn't called from any
 * hook/screen today.
 */

import { api, unwrap } from '@/lib/api';
import type {
  IncomeAllocationSetting,
  ScheduleIncomeAllocationInput,
} from '@/services/mock/incomeAllocation';

export { getIncomeAllocationHistory } from '@/services/mock/incomeAllocation';

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

function ymFrom(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

async function getSummary(): Promise<IncomeAllocationSummaryDto> {
  const res = await api.get('/profile/income-allocation');
  return unwrap<IncomeAllocationSummaryDto>(res);
}

// ─── Reads ──────────────────────────────────────────────────────────────────

export async function getEffectiveIncomeAllocation(month: string): Promise<IncomeAllocationSetting> {
  const summary = await getSummary();
  // See file header: only the current month is precisely resolvable here.
  return toSetting(summary.current, month === ymFrom(new Date()) ? 'current' : 'current-fallback');
}

export async function getScheduledIncomeAllocation(): Promise<IncomeAllocationSetting | null> {
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
