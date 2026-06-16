export interface SavingsGoal {
  id: string;
  customerId: string;
  name: string;
  iconEmoji?: string;
  targetAmount: number;
  currentAmount: number;
  deadline: string;
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
  /** Links to the expense transaction created when fundingWalletId is set */
  transactionId?: string;
}

export interface CreateGoalPayload {
  name: string;
  iconEmoji?: string;
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
