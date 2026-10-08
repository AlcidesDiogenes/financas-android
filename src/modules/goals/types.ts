export interface Goal {
  id: string;
  workspaceId: string;
  title: string;
  targetAmount: number;
  currentAmount: number;
  deadlineDate: string; // ISO date
  icon: string;
  color: string;
  notes?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface GoalProgress {
  goal: Goal;
  percentage: number;
  remainingAmount: number;
  isCompleted: boolean;
  monthsRemaining: number;
  monthlyNeeded: number;
}

export type GoalTransactionType = 'deposit' | 'withdraw';

export interface GoalTransaction {
  id: string;
  goalId: string;
  workspaceId: string;
  amount: number;
  type: GoalTransactionType;
  date: string; // ISO date
  createdBy?: string;
  notes?: string;
  updatedAt?: string;
}

