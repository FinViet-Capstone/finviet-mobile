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
