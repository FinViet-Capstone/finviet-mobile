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
