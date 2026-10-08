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
  isPaused?: boolean;  // Pausado temporariamente
  monthlyOverrides?: Record<string, number>; // Overrides de valor por competência (ex: { '2026-10': 150 })
  excludedMonths?: string[]; // Competências excluídas da recorrência (ex: ['2026-10'])
}

export type DeleteRecurringScope = 'month' | 'forward' | 'all';

export interface RecurringMonthRecord {
  id: string; // `${recurringId}-${year}-${month}`
  recurringId: string;
  workspaceId: string;
  month: number;
  year: number;
  amount: number;
  isPaid: boolean;
  paidAt?: string;
  paidBy?: string;
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

  // Anual: vence uma vez por ano, no mês de referência
  if (recurring.frequency === 'yearly') {
    const referenceMonth = getYearlyReferenceMonth(recurring);
    if (referenceMonth !== null && month !== referenceMonth) return false;
  }

  return true;
};

// Mês (1-12) em que uma conta anual vence: o mês do início da vigência ou, sem ele,
// o mês em que a conta foi criada.
export const getYearlyReferenceMonth = (recurring: RecurringDebit): number | null => {
  if (recurring.startDate) {
    const month = parseInt(recurring.startDate.split('-')[1], 10);
    if (month >= 1 && month <= 12) return month;
  }
  const created = recurring.createdAt ? new Date(recurring.createdAt) : null;
  if (created && !isNaN(created.getTime())) return created.getMonth() + 1;
  return null;
};

