import AsyncStorage from '@react-native-async-storage/async-storage';
import { RecurringMonthRecord } from './types';
import { withStorageLock } from '../../core/storageLock';

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

  // Ler -> alterar -> gravar sob trava (evita sobrescrita concorrente com a sincronização)
  static mutate(fn: (all: RecurringMonthRecord[]) => RecurringMonthRecord[]): Promise<RecurringMonthRecord[]> {
    return withStorageLock(RECURRING_MONTH_STORAGE_KEY, async () => {
      const updated = fn(await this.getAll());
      await this.saveAll(updated);
      return updated;
    });
  }

  static async upsert(record: RecurringMonthRecord): Promise<RecurringMonthRecord[]> {
    const item: RecurringMonthRecord = {
      ...record,
      updatedAt: record.updatedAt || new Date().toISOString(),
    };
    return this.mutate((all) => {
      const existingIndex = all.findIndex((r) => r.id === item.id);
      if (existingIndex < 0) return [item, ...all];
      const updated = [...all];
      updated[existingIndex] = { ...updated[existingIndex], ...item, updatedAt: new Date().toISOString() };
      return updated;
    });
  }

  static async deleteByIds(ids: string[]): Promise<RecurringMonthRecord[]> {
    const idSet = new Set(ids);
    return this.mutate((all) => all.filter((r) => !idSet.has(r.id)));
  }

  static async deleteByRecurringId(recurringId: string): Promise<RecurringMonthRecord[]> {
    return this.mutate((all) => all.filter((r) => r.recurringId !== recurringId));
  }
}
