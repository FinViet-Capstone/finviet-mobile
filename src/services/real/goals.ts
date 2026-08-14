/**
 * real/goals.ts — real .NET saving-goal service.
 *
 * Mirrors src/services/mock/goals.ts so the barrel can swap mock ⇄ real.
 *
 * Backend: api/saving-goals/* (SavingGoalsController), ApiResponse<T> envelope.
 * The backend computes all progress fields server-side (SavingGoalResponse), so
 * we map them straight across rather than recomputing.
 *
 * Backend gap that remains (by design, not a missing feature):
 *   - UpdateSavingGoalRequest has no fundingWalletId, and there is intentionally
 *     no "reassign the goal's funding wallet" endpoint — a goal never has a
 *     static, permanent funding wallet. Wallet choice happens per-action
 *     instead: addGoalContribution's fundingWalletId and withdrawFromGoal's
 *     required walletId below.
 */

import { isAxiosError } from 'axios';
import { api, unwrap } from '@/lib/api';
import { idempotentConfig } from '@/lib/idempotency';
import type { SavingsGoalWithProgress, GoalContribution } from '@/types';
import type {
  CreateGoalInput,
  UpdateGoalInput,
  AddContributionInput,
  WithdrawGoalInput,
} from '@/services/mock/goals';

// ─── Backend DTO ──────────────────────────────────────────────────────────────

interface SavingGoalDto {
  goalId: string;
  customerId: string;
  goalName: string;
  iconEmoji: string | null;
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
  isDeleted: boolean;
  createdAt: string | null;
  updatedAt: string | null;
}

// ─── Mapper ─────────────────────────────────────────────────────────────────

function toGoal(dto: SavingGoalDto): SavingsGoalWithProgress {
  return {
    id: dto.goalId,
    customerId: dto.customerId,
    name: dto.goalName,
    iconEmoji: dto.iconEmoji ?? undefined,
    targetAmount: dto.targetAmount,
    currentAmount: dto.currentAmount,
    deadline: dto.deadline,
    fundingWalletId: dto.fundingWalletId ?? undefined,
    isCompleted: dto.isCompleted,
    isDeleted: dto.isDeleted,
    createdAt: dto.createdAt,
    updatedAt: dto.updatedAt,
    progressPercentage: dto.progressPercent,
    remainingAmount: dto.remainingAmount,
    requiredMonthlySaving: dto.monthlySavingNeeded ?? 0,
    monthsRemaining: dto.monthsRemaining ?? 0,
  };
}

// ─── Reads ──────────────────────────────────────────────────────────────────

export async function getGoals(
  archived = false,
): Promise<SavingsGoalWithProgress[]> {
  const res = await api.get('/saving-goals', { params: { archived } });
  return unwrap<SavingGoalDto[]>(res).map(toGoal);
}

export async function getGoalById(
  id: string,
): Promise<SavingsGoalWithProgress | undefined> {
  try {
    const res = await api.get(`/saving-goals/${encodeURIComponent(id)}`);
    return toGoal(unwrap<SavingGoalDto>(res));
  } catch (error) {
    if (isAxiosError(error) && error.response?.status === 404) return undefined;
    throw error;
  }
}

interface SavingGoalContributionDto {
  contributionId: string;
  goalId: string;
  amount: number;
  type: 'contribution' | 'withdrawal';
  contributedAt: string;
  note: string | null;
  transactionId: string | null;
}

function toContribution(dto: SavingGoalContributionDto): GoalContribution {
  return {
    id: dto.contributionId,
    goalId: dto.goalId,
    amount: dto.amount,
    type: dto.type,
    contributedAt: dto.contributedAt,
    note: dto.note ?? undefined,
    transactionId: dto.transactionId ?? undefined,
  };
}

/** GET /saving-goals/{id}/contributions — combined contribution+withdrawal ledger, newest first. */
export async function getContributionsByGoalId(
  goalId: string,
): Promise<GoalContribution[]> {
  const res = await api.get(
    `/saving-goals/${encodeURIComponent(goalId)}/contributions`,
  );
  return unwrap<SavingGoalContributionDto[]>(res).map(toContribution);
}

// ─── Writes ─────────────────────────────────────────────────────────────────

export async function createGoal(
  input: CreateGoalInput,
  idempotencyKey?: string,
): Promise<SavingsGoalWithProgress> {
  const res = await api.post('/saving-goals', {
    goalName: input.name.trim(),
    iconEmoji: input.iconEmoji ?? null,
    targetAmount: input.targetAmount,
    deadline: input.deadline || null,
    initialAmount: input.initialAmount ?? null,
    fundingWalletId: input.fundingWalletId ?? null,
  }, idempotentConfig(idempotencyKey));
  return toGoal(unwrap<SavingGoalDto>(res));
}

export async function updateGoal(
  id: string,
  patch: UpdateGoalInput,
): Promise<SavingsGoalWithProgress> {
  const res = await api.patch(`/saving-goals/${encodeURIComponent(id)}`, {
    ...(patch.name !== undefined ? { goalName: patch.name.trim() } : {}),
    ...(patch.targetAmount !== undefined ? { targetAmount: patch.targetAmount } : {}),
    ...(patch.deadline !== undefined ? { deadline: patch.deadline } : {}),
  });
  return toGoal(unwrap<SavingGoalDto>(res));
}

export async function deleteGoal(id: string): Promise<void> {
  await api.delete(`/saving-goals/${encodeURIComponent(id)}`);
}

export async function addGoalContribution(
  goalId: string,
  input: AddContributionInput,
  idempotencyKey?: string,
): Promise<SavingsGoalWithProgress> {
  const res = await api.post(
    `/saving-goals/${encodeURIComponent(goalId)}/contribute`,
    {
      amount: input.amount,
      fundingWalletId: input.fundingWalletId ?? null,
      note: input.note?.trim() || null,
    },
    idempotentConfig(idempotencyKey),
  );
  return toGoal(unwrap<SavingGoalDto>(res));
}

/**
 * POST /saving-goals/{id}/withdraw — walletId is required on every call (no
 * static withdrawal wallet on the goal, mirrors contribute's per-action
 * wallet choice). Credits the wallet, decrements currentAmount, records a
 * type="withdrawal" ledger row.
 */
export async function withdrawFromGoal(
  goalId: string,
  input: WithdrawGoalInput,
  idempotencyKey?: string,
): Promise<SavingsGoalWithProgress> {
  const res = await api.post(
    `/saving-goals/${encodeURIComponent(goalId)}/withdraw`,
    {
      amount: input.amount,
      walletId: input.walletId,
      note: input.note?.trim() || null,
    },
    idempotentConfig(idempotencyKey),
  );
  return toGoal(unwrap<SavingGoalDto>(res));
}
