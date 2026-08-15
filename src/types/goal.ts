export interface SavingsGoal {
  id: string;
  customerId: string;
  name: string;
  iconEmoji?: string;
  targetAmount: number;
  currentAmount: number;
  deadline: string | null;
  fundingWalletId?: string;
  isCompleted: boolean;
  isDeleted: boolean;
  createdAt: string | null;
  updatedAt: string | null;
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
  /** 'contribution' adds to the goal; 'withdrawal' takes savings back out. */
  type: 'contribution' | 'withdrawal';
  contributedAt: string;
  note?: string;
  /** Links to the expense/income transaction created when a wallet is involved */
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
}

export interface AddContributionPayload {
  amount: number;
  note?: string;
}
