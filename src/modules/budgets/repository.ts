import AsyncStorage from '@react-native-async-storage/async-storage';
import { Budget } from './types';

const BUDGETS_STORAGE_KEY = '@financas:budgets_v1';

const getInitialSeedBudgets = (): Budget[] => {
  if (!__DEV__) {
    return [];
  }
  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();

  return [
    {
      id: 'bdg-1',
      workspaceId: 'ws-solo',
      category: 'Alimentação',
      limitAmount: 1200.0,
      month,
      year,
    },
    {
      id: 'bdg-2',
      workspaceId: 'ws-solo',
      category: 'Transporte',
      limitAmount: 400.0,
      month,
      year,
    },
    {
      id: 'bdg-3',
      workspaceId: 'ws-solo',
      category: 'Lazer',
      limitAmount: 350.0,
      month,
      year,
    },
    {
      id: 'bdg-4',
      workspaceId: 'ws-shared',
      category: 'Alimentação',
      limitAmount: 1800.0,
      month,
      year,
    },
  ];
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
    const all = await this.getAll();
    const existingIndex = all.findIndex(
      (b) =>
        b.workspaceId === budget.workspaceId &&
        b.category === budget.category &&
        b.month === budget.month &&
        b.year === budget.year
    );

    let updated: Budget[];
    if (existingIndex >= 0) {
      updated = [...all];
      updated[existingIndex] = budget;
    } else {
      updated = [budget, ...all];
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
