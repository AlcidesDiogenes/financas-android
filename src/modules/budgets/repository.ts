import AsyncStorage from '@react-native-async-storage/async-storage';
import { Budget } from './types';
import { withStorageLock } from '../../core/storageLock';

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

  // Ler -> alterar -> gravar sob trava (evita sobrescrita concorrente com a sincronização)
  static mutate(fn: (all: Budget[]) => Budget[]): Promise<Budget[]> {
    return withStorageLock(BUDGETS_STORAGE_KEY, async () => {
      const updated = fn(await this.getAll());
      await this.saveAll(updated);
      return updated;
    });
  }

  static async addOrUpdate(budget: Budget): Promise<Budget[]> {
    const item: Budget = {
      ...budget,
      updatedAt: new Date().toISOString(),
    };
    return this.mutate((all) => {
      const existingIndex = all.findIndex(
        (b) =>
          b.id === item.id ||
          (b.workspaceId === item.workspaceId && b.category === item.category)
      );
      if (existingIndex < 0) return [item, ...all];
      const updated = [...all];
      updated[existingIndex] = item;
      return updated;
    });
  }

  static async delete(id: string): Promise<Budget[]> {
    return this.mutate((all) => all.filter((b) => b.id !== id));
  }
}
