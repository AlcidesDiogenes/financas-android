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
  isRecurringGenerated?: boolean;
}

export interface MonthlySummary {
  totalIncome: number;
  totalExpense: number;
  balance: number;
  savingsRate: number; // percentage
}
