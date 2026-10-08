export type TransactionType = 'income' | 'expense';

export type TransactionCategory =
  | 'Alimentação'
  | 'Moradia'
  | 'Transporte'
  | 'Lazer'
  | 'Saúde'
  | 'Educação'
  | 'Assinaturas'
  | 'Salário'
  | 'Investimentos'
  | 'Economia'
  | 'Extra'
  | 'Outros';

export interface Transaction {
  id: string;
  workspaceId: string;
  title: string;
  amount: number;
  type: TransactionType;
  category: TransactionCategory;
  date: string; // ISO date
  notes?: string;
  createdBy?: string;
  paidBy?: string;
  assignedTo?: string; // member name in shared workspace
  isRecurringGenerated?: boolean;
  updatedAt?: string; // ISO date timestamp for concurrency resolution
}

export interface MonthlySummary {
  totalIncome: number;
  totalExpense: number;
  balance: number;
  savingsRate: number; // percentage
}
