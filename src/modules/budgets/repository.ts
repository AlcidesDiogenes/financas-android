import AsyncStorage from '@react-native-async-storage/async-storage';
import { Budget } from './types';

const BUDGETS_STORAGE_KEY = '@financas:budgets_v1';

const getInitialSeedBudgets = (): Budget[] => {
  return [];
};

export class BudgetRepository {
  static async getAll(): Promise<Budget[]> {
    try {
      const data = await AsyncStorage.getItem(BUDGETS_STORAGE_KEY);
      if (!data) {
        const seed = getInitialSeedBudgets();
        await AsyncStorage.setItem(BUDGETS_STORAGE_KEY, JSON.stringify(seed));
        return seed;
      }
      return JSON.parse(data);
    } catch {
      return getInitialSeedBudgets();
    }
  }

  static async saveAll(budgets: Budget[]): Promise<void> {
    await AsyncStorage.setItem(BUDGETS_STORAGE_KEY, JSON.stringify(budgets));
  }

  static async addOrUpdate(budget: Budget): Promise<Budget[]> {
    const item: Budget = {
      ...budget,
      updatedAt: new Date().toISOString(),
    };
    const all = await this.getAll();
    const existingIndex = all.findIndex(
      (b) =>
        b.id === item.id ||
        (b.workspaceId === item.workspaceId && b.category === item.category)
    );

    let updated: Budget[];
    if (existingIndex >= 0) {
      updated = [...all];
      updated[existingIndex] = item;
    } else {
      updated = [item, ...all];
    }

    await this.saveAll(updated);
    return updated;
  }

  static async delete(id: string): Promise<Budget[]> {
    const all = await this.getAll();
    const updated = all.filter((b) => b.id !== id);
    await this.saveAll(updated);
    return updated;
  }
}
