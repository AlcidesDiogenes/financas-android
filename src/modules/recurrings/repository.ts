import AsyncStorage from '@react-native-async-storage/async-storage';
import { RecurringDebit } from './types';

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

  static async add(item: RecurringDebit): Promise<RecurringDebit[]> {
    const all = await this.getAll();
    const updated = [item, ...all];
    await this.saveAll(updated);
    return updated;
  }

  static async togglePaid(id: string): Promise<RecurringDebit[]> {
    const all = await this.getAll();
    const updated = all.map((r) =>
      r.id === id ? { ...r, isPaidCurrentMonth: !r.isPaidCurrentMonth } : r
    );
    await this.saveAll(updated);
    return updated;
  }

  static async updateAmount(id: string, newAmount: number): Promise<RecurringDebit[]> {
    const all = await this.getAll();
    const updated = all.map((r) =>
      r.id === id ? { ...r, amount: newAmount } : r
    );
    await this.saveAll(updated);
    return updated;
  }

  static async update(item: RecurringDebit): Promise<RecurringDebit[]> {
    const all = await this.getAll();
    const updated = all.map((r) => (r.id === item.id ? item : r));
    await this.saveAll(updated);
    return updated;
  }

  static async delete(id: string): Promise<RecurringDebit[]> {
    const all = await this.getAll();
    const updated = all.filter((r) => r.id !== id);
    await this.saveAll(updated);
    return updated;
  }
}
