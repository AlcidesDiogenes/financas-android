import { TransactionCategory } from '../transactions/types';

export interface Budget {
  id: string;
  workspaceId: string;
  category: TransactionCategory;
  limitAmount: number;
  month: number;
  year: number;
  startDate?: string; // YYYY-MM
  endDate?: string;   // YYYY-MM
  updatedAt?: string;
}

export interface BudgetProgress {
  budget: Budget;
  spent: number;
  remaining: number;
  percentage: number;
  isExceeded: boolean;
  isWarning: boolean; // >= 80%
  dailyRemainingBudget?: number;
}

export const isBudgetActiveInMonth = (
  budget: Budget,
  month: number,
  year: number
): boolean => {
  const compIndex = year * 12 + month;

  // Check start
  if (budget.startDate) {
    const parts = budget.startDate.split('-');
    if (parts.length >= 2) {
      const sYear = parseInt(parts[0], 10);
      const sMonth = parseInt(parts[1], 10);
      if (!isNaN(sYear) && !isNaN(sMonth)) {
        const startIndex = sYear * 12 + sMonth;
        if (compIndex < startIndex) return false;
      }
    }
  } else if (budget.year && budget.month) {
    // If no explicit startDate, fallback to creation month/year
    const startIndex = budget.year * 12 + budget.month;
    if (compIndex < startIndex) return false;
  }

  // Check end
  if (budget.endDate) {
    const parts = budget.endDate.split('-');
    if (parts.length >= 2) {
      const eYear = parseInt(parts[0], 10);
      const eMonth = parseInt(parts[1], 10);
      if (!isNaN(eYear) && !isNaN(eMonth)) {
        const endIndex = eYear * 12 + eMonth;
        if (compIndex > endIndex) return false;
      }
    }
  }

  return true;
};
