import AsyncStorage from '@react-native-async-storage/async-storage';
import { Transaction } from './types';
import { withStorageLock } from '../../core/storageLock';

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

  // Ler -> alterar -> gravar sob trava (evita sobrescrita concorrente com a sincronização)
  static mutate(fn: (all: Transaction[]) => Transaction[]): Promise<Transaction[]> {
    return withStorageLock(TRANSACTIONS_STORAGE_KEY, async () => {
      const updated = fn(await this.getAll());
      await this.saveAll(updated);
      return updated;
    });
  }

  static async add(transaction: Transaction): Promise<Transaction[]> {
    const item: Transaction = {
      ...transaction,
      updatedAt: transaction.updatedAt || new Date().toISOString(),
    };
    return this.mutate((all) => [item, ...all.filter((t) => t.id !== item.id)]);
  }

  static async update(transaction: Transaction): Promise<Transaction[]> {
    const item: Transaction = {
      ...transaction,
      updatedAt: new Date().toISOString(),
    };
    return this.mutate((all) => all.map((t) => (t.id === item.id ? item : t)));
  }

  static async delete(id: string): Promise<Transaction[]> {
    return this.mutate((all) => all.filter((t) => t.id !== id));
  }
}
