import { TransactionCategory } from '../transactions/types';

export type RecurringFrequency = 'monthly' | 'yearly' | 'weekly';
export type RecurringType = 'expense' | 'income';

export interface RecurringDebit {
  id: string;
  workspaceId: string;
  title: string;
  amount: number;
  category: TransactionCategory;
  frequency: RecurringFrequency;
  type?: RecurringType; // default 'expense'
  dueDay: number; // 1 to 31
  isPaidCurrentMonth: boolean;
  reminderEnabled: boolean;
  assignedTo?: string; // member name in shared workspace
  notes?: string;
  createdAt: string;
  startDate?: string; // YYYY-MM (ex: '2026-01')
  endDate?: string;   // YYYY-MM (ex: '2026-12')
  updatedAt?: string;
  paidAt?: string;    // Data em que foi pago na competência
  orderIndex?: number; // Ordem personalizada de exibição
  isPaused?: boolean;  // Pausado temporariamente
}

export interface RecurringMonthRecord {
  id: string; // `${recurringId}-${year}-${month}`
  recurringId: string;
  workspaceId: string;
  month: number;
  year: number;
  amount: number;
  isPaid: boolean;
  paidAt?: string;
  transactionId?: string;
  updatedAt?: string;
}

export const isRecurringActiveInMonth = (
  recurring: RecurringDebit,
  month: number,
  year: number
): boolean => {
  const compIndex = year * 12 + month;

  // Check start
  if (recurring.startDate) {
    const parts = recurring.startDate.split('-');
    if (parts.length >= 2) {
      const sYear = parseInt(parts[0], 10);
      const sMonth = parseInt(parts[1], 10);
      if (!isNaN(sYear) && !isNaN(sMonth)) {
        const startIndex = sYear * 12 + sMonth;
        if (compIndex < startIndex) return false;
      }
    }
  }

  // Check end
  if (recurring.endDate) {
    const parts = recurring.endDate.split('-');
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

