export interface SavingsGoal {
  id: string;
  userId: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  deadline: string; // ISO date string
  fundingWalletId?: string;
  isCompleted: boolean;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SavingsGoalWithProgress extends SavingsGoal {
  progressPercentage: number;
  remainingAmount: number;
  requiredMonthlySaving: number; // auto-calculated
  monthsRemaining: number;
}

export interface GoalContribution {
  id: string;
  goalId: string;
  amount: number;
  contributedAt: string;
  note?: string;
}

export interface CreateGoalPayload {
  name: string;
  targetAmount: number;
  deadline: string;
  fundingWalletId?: string;
}

export interface UpdateGoalPayload {
  name?: string;
  targetAmount?: number;
  deadline?: string;
  fundingWalletId?: string;
}

export interface AddContributionPayload {
  amount: number;
  note?: string;
}
