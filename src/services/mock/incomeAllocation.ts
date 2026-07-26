/**
 * mock/incomeAllocation.ts — versioned income + 50/30/20 allocation history.
 *
 * Replaces a single mutable income/allocation row with one entry per
 * "effective month". Edits always schedule for the *next* calendar month —
 * they never touch the current or a past month's entry — so a customer's
 * budget-adherence score for a given month is always computed against
 * whatever was in effect when that month started, and never shifts
 * retroactively when the customer changes their mind later.
 *
 * See context/fe-plan-2026-07-revamp.md item 4 for the full rationale.
 */

import { USER_ID } from './walletStore';
import { getCustomer } from './user';

const delay = (ms = 300) => new Promise<void>((r) => setTimeout(r, ms));

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

function genId(): string {
  return `ias_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
}

function ymFrom(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function currentMonth(): string {
  return ymFrom(new Date());
}

function nextMonth(): string {
  const now = new Date();
  return ymFrom(new Date(now.getFullYear(), now.getMonth() + 1, 1));
}

// Seed history with the customer's existing onboarding income/allocation as
// the entry effective from the current month, so getBudgetBuckets always has
// something to resolve without requiring a "schedule" first.
let HISTORY: IncomeAllocationSetting[] = (() => {
  const customer = getCustomer();
  return [
    {
      id: genId(),
      customerId: USER_ID,
      effectiveMonth: currentMonth(),
      monthlyIncome: customer.monthlyIncome ?? 0,
      needsPct: customer.needsPct ?? 50,
      wantsPct: customer.wantsPct ?? 30,
      savingsPct: customer.savingsPct ?? 20,
      createdAt: customer.createdAt,
    },
  ];
})();

function defaultSetting(month: string): IncomeAllocationSetting {
  const customer = getCustomer();
  return {
    id: 'default',
    customerId: USER_ID,
    effectiveMonth: month,
    monthlyIncome: customer.monthlyIncome ?? 0,
    needsPct: customer.needsPct ?? 50,
    wantsPct: customer.wantsPct ?? 30,
    savingsPct: customer.savingsPct ?? 20,
    createdAt: customer.createdAt,
  };
}

/** Resolve the setting in effect for a given 'YYYY-MM' month: latest entry with effectiveMonth <= month. */
export function getEffectiveIncomeAllocationSync(month: string): IncomeAllocationSetting {
  const eligible = HISTORY
    .filter((h) => h.effectiveMonth <= month)
    .sort((a, b) => b.effectiveMonth.localeCompare(a.effectiveMonth));
  return eligible[0] ?? defaultSetting(month);
}

export async function getEffectiveIncomeAllocation(month: string): Promise<IncomeAllocationSetting> {
  await delay();
  return getEffectiveIncomeAllocationSync(month);
}

export async function getIncomeAllocationHistory(): Promise<IncomeAllocationSetting[]> {
  await delay();
  return [...HISTORY].sort((a, b) => a.effectiveMonth.localeCompare(b.effectiveMonth));
}

/** The entry already scheduled for next month, if the customer has drafted one. */
export async function getScheduledIncomeAllocation(): Promise<IncomeAllocationSetting | null> {
  await delay();
  const target = nextMonth();
  return HISTORY.find((h) => h.effectiveMonth === target) ?? null;
}

export interface ScheduleIncomeAllocationInput {
  monthlyIncome: number;
  needsPct: number;
  wantsPct: number;
  savingsPct: number;
}

/**
 * Always targets next calendar month. Calling this again before rollover just
 * revises the pending draft (upsert on effectiveMonth) — it never creates or
 * touches an entry for the current or a past month.
 */
export async function scheduleIncomeAllocationChange(
  input: ScheduleIncomeAllocationInput,
): Promise<IncomeAllocationSetting> {
  await delay();
  const targetMonth = nextMonth();
  const existing = HISTORY.find((h) => h.effectiveMonth === targetMonth);
  if (existing) {
    const updated: IncomeAllocationSetting = { ...existing, ...input };
    HISTORY = HISTORY.map((h) => (h.id === existing.id ? updated : h));
    return updated;
  }
  const created: IncomeAllocationSetting = {
    id: genId(),
    customerId: USER_ID,
    effectiveMonth: targetMonth,
    ...input,
    createdAt: new Date().toISOString(),
  };
  HISTORY = [...HISTORY, created];
  return created;
}
