import { TransactionCategory } from '../transactions/types';

export interface Budget {
  id: string;
  workspaceId: string;
  category: TransactionCategory;
  limitAmount: number;
  month: number;
  year: number;
}

export interface BudgetProgress {
  budget: Budget;
  spent: number;
  remaining: number;
  percentage: number;
  isExceeded: boolean;
  isWarning: boolean; // >= 80%
}
