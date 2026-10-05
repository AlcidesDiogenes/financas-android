import { TransactionCategory } from '../transactions/types';

export type RecurringFrequency = 'monthly' | 'yearly' | 'weekly';

export interface RecurringDebit {
  id: string;
  workspaceId: string;
  title: string;
  amount: number;
  category: TransactionCategory;
  frequency: RecurringFrequency;
  dueDay: number; // 1 to 31
  isPaidCurrentMonth: boolean;
  reminderEnabled: boolean;
  notes?: string;
  createdAt: string;
}
