import AsyncStorage from '@react-native-async-storage/async-storage';
import { Transaction } from './types';

const TRANSACTIONS_STORAGE_KEY = '@financas:transactions_v1';

const getInitialSeedTransactions = (): Transaction[] => {
  return [];
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
    const item: Transaction = {
      ...transaction,
      updatedAt: transaction.updatedAt || new Date().toISOString(),
    };
    const all = await this.getAll();
    const updated = [item, ...all.filter((t) => t.id !== item.id)];
    await this.saveAll(updated);
    return updated;
  }

  static async update(transaction: Transaction): Promise<Transaction[]> {
    const item: Transaction = {
      ...transaction,
      updatedAt: new Date().toISOString(),
    };
    const all = await this.getAll();
    const updated = all.map((t) => (t.id === item.id ? item : t));
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
