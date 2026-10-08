import AsyncStorage from '@react-native-async-storage/async-storage';
import { GoalTransaction } from './types';
import { withStorageLock } from '../../core/storageLock';

const GOAL_TRANSACTIONS_STORAGE_KEY = '@financas:goal_transactions_v1';

export class GoalTransactionRepository {
  static async getAll(): Promise<GoalTransaction[]> {
    try {
      const data = await AsyncStorage.getItem(GOAL_TRANSACTIONS_STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  static async getByGoalId(goalId: string): Promise<GoalTransaction[]> {
    const all = await this.getAll();
    return all
      .filter((t) => t.goalId === goalId)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }

  static async saveAll(txs: GoalTransaction[]): Promise<void> {
    await AsyncStorage.setItem(GOAL_TRANSACTIONS_STORAGE_KEY, JSON.stringify(txs));
  }

  static mutate(fn: (all: GoalTransaction[]) => GoalTransaction[]): Promise<GoalTransaction[]> {
    return withStorageLock(GOAL_TRANSACTIONS_STORAGE_KEY, async () => {
      const updated = fn(await this.getAll());
      await this.saveAll(updated);
      return updated;
    });
  }

  static async add(tx: GoalTransaction): Promise<GoalTransaction[]> {
    const item: GoalTransaction = {
      ...tx,
      updatedAt: tx.updatedAt || new Date().toISOString(),
    };
    return this.mutate((all) => [item, ...all.filter((t) => t.id !== item.id)]);
  }

  static async delete(id: string): Promise<GoalTransaction[]> {
    return this.mutate((all) => all.filter((t) => t.id !== id));
  }

  static async deleteByGoalId(goalId: string): Promise<GoalTransaction[]> {
    return this.mutate((all) => all.filter((t) => t.goalId !== goalId));
  }
}
