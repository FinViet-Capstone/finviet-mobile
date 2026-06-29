/**
 * real/goals.ts — real .NET saving-goal service.
 *
 * Mirrors src/services/mock/goals.ts so the barrel can swap mock ⇄ real.
 *
 * Backend: api/saving-goals/* (SavingGoalsController), ApiResponse<T> envelope.
 * The backend computes all progress fields server-side (SavingGoalResponse), so
 * we map them straight across rather than recomputing.
 *
 * Backend gaps vs the mock contract:
 *   - UpdateSavingGoalRequest has no fundingWalletId → that patch field is ignored.
 *   - ContributeSavingGoalRequest has no note → the note is ignored.
 */

import { api, unwrap } from '@/lib/api';
import type { SavingsGoalWithProgress } from '@/types';
import type {
  CreateGoalInput,
  UpdateGoalInput,
  AddContributionInput,
} from '@/services/mock/goals';

// ─── Backend DTO ──────────────────────────────────────────────────────────────

interface SavingGoalDto {
  goalId: string;
  customerId: string;
  goalName: string;
  targetAmount: number;
  currentAmount: number;
  deadline: string | null;
  fundingWalletId: string | null;
  remainingAmount: number;
  progressPercent: number;
  daysRemaining: number | null;
  isCompleted: boolean;
  monthlySavingNeeded: number | null;
  monthsRemaining: number | null;
}

// ─── Mapper ─────────────────────────────────────────────────────────────────

function toGoal(dto: SavingGoalDto): SavingsGoalWithProgress {
  return {
    id: dto.goalId,
    customerId: dto.customerId,
    name: dto.goalName,
    targetAmount: dto.targetAmount,
    currentAmount: dto.currentAmount,
    deadline: dto.deadline ?? '',
    fundingWalletId: dto.fundingWalletId ?? undefined,
    isCompleted: dto.isCompleted,
    isDeleted: false,
    createdAt: '',
    updatedAt: '',
    progressPercentage: dto.progressPercent,
    remainingAmount: dto.remainingAmount,
    requiredMonthlySaving: dto.monthlySavingNeeded ?? 0,
    monthsRemaining: dto.monthsRemaining ?? 0,
  };
}

// ─── Reads ──────────────────────────────────────────────────────────────────

export async function getGoals(): Promise<SavingsGoalWithProgress[]> {
  const res = await api.get('/saving-goals');
  return unwrap<SavingGoalDto[]>(res).map(toGoal);
}

export async function getGoalById(
  id: string,
): Promise<SavingsGoalWithProgress | undefined> {
  const res = await api.get(`/saving-goals/${id}`);
  return toGoal(unwrap<SavingGoalDto>(res));
}

// ─── Writes ─────────────────────────────────────────────────────────────────

export async function createGoal(
  input: CreateGoalInput,
): Promise<SavingsGoalWithProgress> {
  const res = await api.post('/saving-goals', {
    goalName: input.name.trim(),
    targetAmount: input.targetAmount,
    deadline: input.deadline || null,
    initialAmount: input.initialAmount ?? null,
    fundingWalletId: input.fundingWalletId ?? null,
  });
  return toGoal(unwrap<SavingGoalDto>(res));
}

export async function updateGoal(
  id: string,
  patch: UpdateGoalInput,
): Promise<SavingsGoalWithProgress> {
  const res = await api.patch(`/saving-goals/${id}`, {
    ...(patch.name !== undefined ? { goalName: patch.name.trim() } : {}),
    ...(patch.targetAmount !== undefined ? { targetAmount: patch.targetAmount } : {}),
    ...(patch.deadline !== undefined ? { deadline: patch.deadline || null } : {}),
  });
  return toGoal(unwrap<SavingGoalDto>(res));
}

export async function deleteGoal(id: string): Promise<void> {
  await api.delete(`/saving-goals/${id}`);
}

export async function addGoalContribution(
  goalId: string,
  input: AddContributionInput,
): Promise<SavingsGoalWithProgress> {
  const res = await api.post(`/saving-goals/${goalId}/contribute`, {
    amount: input.amount,
  });
  return toGoal(unwrap<SavingGoalDto>(res));
}
