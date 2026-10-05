import AsyncStorage from '@react-native-async-storage/async-storage';
import { Transaction } from './types';

const TRANSACTIONS_STORAGE_KEY = '@financas:transactions_v1';

const getInitialSeedTransactions = (): Transaction[] => {
  // Em produção, inicia 100% limpo com zero transações de teste
  if (!__DEV__) {
    return [];
  }

  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');

  return [
    {
      id: 'tx-1',
      workspaceId: 'ws-solo',
      title: 'Salário Mensal',
      amount: 6500.0,
      type: 'income',
      category: 'Salário',
      date: `${year}-${month}-05T08:00:00.000Z`,
      notes: 'Depósito em conta corrente',
    },
    {
      id: 'tx-2',
      workspaceId: 'ws-solo',
      title: 'Supermercado Mensal',
      amount: 850.4,
      type: 'expense',
      category: 'Alimentação',
      date: `${year}-${month}-06T14:30:00.000Z`,
      notes: 'Compras do mês',
    },
    {
      id: 'tx-3',
      workspaceId: 'ws-solo',
      title: 'Plano de Saúde',
      amount: 420.0,
      type: 'expense',
      category: 'Saúde',
      date: `${year}-${month}-08T10:00:00.000Z`,
    },
    {
      id: 'tx-4',
      workspaceId: 'ws-solo',
      title: 'Combustível / Posto',
      amount: 230.0,
      type: 'expense',
      category: 'Transporte',
      date: `${year}-${month}-10T18:15:00.000Z`,
    },
    {
      id: 'tx-5',
      workspaceId: 'ws-solo',
      title: 'Rendimento CDI',
      amount: 145.2,
      type: 'income',
      category: 'Investimentos',
      date: `${year}-${month}-12T09:00:00.000Z`,
    },
    // Shared workspace seed
    {
      id: 'tx-s1',
      workspaceId: 'ws-shared',
      title: 'Aluguel do Apartamento',
      amount: 2200.0,
      type: 'expense',
      category: 'Moradia',
      date: `${year}-${month}-05T10:00:00.000Z`,
      notes: 'Divisão 50/50',
    },
    {
      id: 'tx-s2',
      workspaceId: 'ws-shared',
      title: 'Feira e Hortifruti',
      amount: 320.0,
      type: 'expense',
      category: 'Alimentação',
      date: `${year}-${month}-07T11:00:00.000Z`,
    },
    {
      id: 'tx-s3',
      workspaceId: 'ws-shared',
      title: 'Aporte Conjunto',
      amount: 3000.0,
      type: 'income',
      category: 'Extra',
      date: `${year}-${month}-02T09:00:00.000Z`,
    },
  ];
};

export class TransactionRepository {
  static async getAll(): Promise<Transaction[]> {
    try {
      const data = await AsyncStorage.getItem(TRANSACTIONS_STORAGE_KEY);
      if (!data) {
        const seed = getInitialSeedTransactions();
        await AsyncStorage.setItem(TRANSACTIONS_STORAGE_KEY, JSON.stringify(seed));
        return seed;
      }
      return JSON.parse(data);
    } catch {
      return getInitialSeedTransactions();
    }
  }

  static async saveAll(transactions: Transaction[]): Promise<void> {
    await AsyncStorage.setItem(TRANSACTIONS_STORAGE_KEY, JSON.stringify(transactions));
  }

  static async add(transaction: Transaction): Promise<Transaction[]> {
    const all = await this.getAll();
    const updated = [transaction, ...all];
    await this.saveAll(updated);
    return updated;
  }

  static async delete(id: string): Promise<Transaction[]> {
    const all = await this.getAll();
    const updated = all.filter((t) => t.id !== id);
    await this.saveAll(updated);
    return updated;
  }
}
