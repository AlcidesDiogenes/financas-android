import AsyncStorage from '@react-native-async-storage/async-storage';
import { RecurringMonthRecord } from './types';

const RECURRING_MONTH_STORAGE_KEY = '@financas:recurring_month_records_v1';

export class RecurringMonthRepository {
  static async getAll(): Promise<RecurringMonthRecord[]> {
    try {
      const data = await AsyncStorage.getItem(RECURRING_MONTH_STORAGE_KEY);
      if (!data) return [];
      return JSON.parse(data);
    } catch {
      return [];
    }
  }

  static async saveAll(records: RecurringMonthRecord[]): Promise<void> {
    await AsyncStorage.setItem(RECURRING_MONTH_STORAGE_KEY, JSON.stringify(records));
  }

  static async upsert(record: RecurringMonthRecord): Promise<RecurringMonthRecord[]> {
    const all = await this.getAll();
    const existingIndex = all.findIndex((r) => r.id === record.id);
    let updated: RecurringMonthRecord[];

    if (existingIndex >= 0) {
      updated = [...all];
      updated[existingIndex] = { ...updated[existingIndex], ...record };
    } else {
      updated = [record, ...all];
    }

    await this.saveAll(updated);
    return updated;
  }

  static async deleteByRecurringId(recurringId: string): Promise<RecurringMonthRecord[]> {
    const all = await this.getAll();
    const updated = all.filter((r) => r.recurringId !== recurringId);
    await this.saveAll(updated);
    return updated;
  }
}
