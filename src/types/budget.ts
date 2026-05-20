export type BudgetStatus = 'safe' | 'warning' | 'danger';

export interface Budget {
  id: string;
  userId: string;
  categoryId: string;
  monthlyLimit: number;
  resetDay: number;
  createdAt: string;
  updatedAt: string;
}

export interface BudgetWithProgress extends Budget {
  categoryName: string;
  categoryColor: string;
  categoryIcon: string;
  spent: number;
  remaining: number;
  percentage: number;
  status: BudgetStatus;
}

export interface UpsertBudgetPayload {
  categoryId: string;
  monthlyLimit: number;
  resetDay?: number;
}
