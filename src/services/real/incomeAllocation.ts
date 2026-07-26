/**
 * real/incomeAllocation.ts — no .NET endpoint yet, forwards to the mock.
 *
 * BE is building the matching history endpoint (see
 * context/fe-plan-2026-07-revamp.md item 4 reconciliation). Once it ships,
 * replace these re-exports with real `api` calls — no other call site needs
 * to change, since screens/hooks only ever import from the `@/services`
 * barrel. Same pattern as `changePassword` in real/auth.ts.
 */
export {
  getEffectiveIncomeAllocation,
  getIncomeAllocationHistory,
  getScheduledIncomeAllocation,
  scheduleIncomeAllocationChange,
  type IncomeAllocationSetting,
  type ScheduleIncomeAllocationInput,
} from '@/services/mock/incomeAllocation';
