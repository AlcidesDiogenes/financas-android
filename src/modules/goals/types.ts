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
