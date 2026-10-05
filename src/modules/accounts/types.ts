export type AccountType = 'checking' | 'cash' | 'credit_card' | 'investment';

export interface Account {
  id: string;
  name: string;
  type: AccountType;
  balance: number;
  color: string;
  icon: string;
  // If credit card
  creditLimit?: number;
  closingDay?: number; // dia do fechamento da fatura
  dueDay?: number;     // dia do vencimento da fatura
}
