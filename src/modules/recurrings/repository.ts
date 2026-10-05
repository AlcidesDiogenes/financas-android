import AsyncStorage from '@react-native-async-storage/async-storage';
import { RecurringDebit } from './types';

const RECURRINGS_STORAGE_KEY = '@financas:recurrings_v1';

const getInitialSeedRecurrings = (): RecurringDebit[] => {
  if (!__DEV__) {
    return [];
  }
  return [
  {
    id: 'rec-1',
    workspaceId: 'ws-solo',
    title: 'Internet Fibra 500MB',
    amount: 119.9,
    category: 'Moradia',
    frequency: 'monthly',
    dueDay: 10,
    isPaidCurrentMonth: true,
    reminderEnabled: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'rec-2',
    workspaceId: 'ws-solo',
    title: 'Netflix 4K',
    amount: 55.9,
    category: 'Assinaturas',
    frequency: 'monthly',
    dueDay: 15,
    isPaidCurrentMonth: false,
    reminderEnabled: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'rec-3',
    workspaceId: 'ws-solo',
    title: 'Mensalidade Academia',
    amount: 120.0,
    category: 'Saúde',
    frequency: 'monthly',
    dueDay: 20,
    isPaidCurrentMonth: false,
    reminderEnabled: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'rec-4',
    workspaceId: 'ws-shared',
    title: 'Energia Elétrica (Enel)',
    amount: 210.0,
    category: 'Moradia',
    frequency: 'monthly',
    dueDay: 12,
    isPaidCurrentMonth: false,
    reminderEnabled: true,
    createdAt: new Date().toISOString(),
  },
];
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

  static async delete(id: string): Promise<RecurringDebit[]> {
    const all = await this.getAll();
    const updated = all.filter((r) => r.id !== id);
    await this.saveAll(updated);
    return updated;
  }
}
