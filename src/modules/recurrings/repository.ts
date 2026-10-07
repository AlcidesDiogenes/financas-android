import AsyncStorage from '@react-native-async-storage/async-storage';
import { RecurringDebit } from './types';
import { withStorageLock } from '../../core/storageLock';

const RECURRINGS_STORAGE_KEY = '@financas:recurrings_v1';

const getInitialSeedRecurrings = (): RecurringDebit[] => {
  return [];
};

export class RecurringRepository {
  static async getAll(): Promise<RecurringDebit[]> {
    try {
      const data = await AsyncStorage.getItem(RECURRINGS_STORAGE_KEY);
      if (!data) {
        const seed = getInitialSeedRecurrings();
        await AsyncStorage.setItem(RECURRINGS_STORAGE_KEY, JSON.stringify(seed));
        return seed;
      }
      return JSON.parse(data);
    } catch {
      return getInitialSeedRecurrings();
    }
  }

  static async saveAll(recurrings: RecurringDebit[]): Promise<void> {
    await AsyncStorage.setItem(RECURRINGS_STORAGE_KEY, JSON.stringify(recurrings));
  }

  // Ler -> alterar -> gravar sob trava (evita sobrescrita concorrente com a sincronização)
  static mutate(fn: (all: RecurringDebit[]) => RecurringDebit[]): Promise<RecurringDebit[]> {
    return withStorageLock(RECURRINGS_STORAGE_KEY, async () => {
      const updated = fn(await this.getAll());
      await this.saveAll(updated);
      return updated;
    });
  }

  static async add(item: RecurringDebit): Promise<RecurringDebit[]> {
    const rec: RecurringDebit = {
      ...item,
      updatedAt: item.updatedAt || new Date().toISOString(),
    };
    return this.mutate((all) => [rec, ...all.filter((r) => r.id !== rec.id)]);
  }

  static async togglePaid(id: string): Promise<RecurringDebit[]> {
    return this.mutate((all) =>
      all.map((r) =>
        r.id === id ? { ...r, isPaidCurrentMonth: !r.isPaidCurrentMonth, updatedAt: new Date().toISOString() } : r
      )
    );
  }

  static async updateAmount(id: string, newAmount: number): Promise<RecurringDebit[]> {
    return this.mutate((all) =>
      all.map((r) => (r.id === id ? { ...r, amount: newAmount, updatedAt: new Date().toISOString() } : r))
    );
  }

  static async update(item: RecurringDebit): Promise<RecurringDebit[]> {
    const rec: RecurringDebit = {
      ...item,
      updatedAt: new Date().toISOString(),
    };
    return this.mutate((all) => all.map((r) => (r.id === rec.id ? rec : r)));
  }

  static async delete(id: string): Promise<RecurringDebit[]> {
    return this.mutate((all) => all.filter((r) => r.id !== id));
  }
}
