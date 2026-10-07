import AsyncStorage from '@react-native-async-storage/async-storage';
import { Goal } from './types';
import { withStorageLock } from '../../core/storageLock';

const GOALS_STORAGE_KEY = '@financas:goals_v1';

const getInitialSeedGoals = (): Goal[] => {
  if (!__DEV__) {
    return [];
  }
  const currentYear = new Date().getFullYear();

  return [
    {
      id: 'goal-1',
      workspaceId: 'ws-solo',
      title: 'Reserva de Emergência (6 Meses)',
      targetAmount: 25000.0,
      currentAmount: 14500.0,
      deadlineDate: `${currentYear + 1}-12-31T00:00:00.000Z`,
      icon: 'shield-checkmark-outline',
      color: '#10B981',
      notes: 'Investido em Tesouro Selic / CDB 100%',
      createdAt: new Date().toISOString(),
    },
    {
      id: 'goal-2',
      workspaceId: 'ws-solo',
      title: 'Viagem de Fim de Ano',
      targetAmount: 6000.0,
      currentAmount: 3800.0,
      deadlineDate: `${currentYear}-12-20T00:00:00.000Z`,
      icon: 'airplane-outline',
      color: '#3B82F6',
      createdAt: new Date().toISOString(),
    },
    {
      id: 'goal-3',
      workspaceId: 'ws-shared',
      title: 'Entrada do Apartamento Próprio',
      targetAmount: 80000.0,
      currentAmount: 32000.0,
      deadlineDate: `${currentYear + 2}-06-30T00:00:00.000Z`,
      icon: 'business-outline',
      color: '#8B5CF6',
      notes: 'Meta conjunta do casal',
      createdAt: new Date().toISOString(),
    },
  ];
};

export class GoalRepository {
  static async getAll(): Promise<Goal[]> {
    try {
      const data = await AsyncStorage.getItem(GOALS_STORAGE_KEY);
      if (!data) {
        const seed = getInitialSeedGoals();
        await AsyncStorage.setItem(GOALS_STORAGE_KEY, JSON.stringify(seed));
        return seed;
      }
      return JSON.parse(data);
    } catch {
      return getInitialSeedGoals();
    }
  }

  static async saveAll(goals: Goal[]): Promise<void> {
    await AsyncStorage.setItem(GOALS_STORAGE_KEY, JSON.stringify(goals));
  }

  // Ler -> alterar -> gravar sob trava (evita sobrescrita concorrente com a sincronização)
  static mutate(fn: (all: Goal[]) => Goal[]): Promise<Goal[]> {
    return withStorageLock(GOALS_STORAGE_KEY, async () => {
      const updated = fn(await this.getAll());
      await this.saveAll(updated);
      return updated;
    });
  }

  static async add(goal: Goal): Promise<Goal[]> {
    const item: Goal = {
      ...goal,
      updatedAt: goal.updatedAt || new Date().toISOString(),
    };
    return this.mutate((all) => [item, ...all.filter((g) => g.id !== item.id)]);
  }

  static async update(goal: Goal): Promise<Goal[]> {
    const item: Goal = {
      ...goal,
      updatedAt: new Date().toISOString(),
    };
    return this.mutate((all) => all.map((g) => (g.id === item.id ? item : g)));
  }

  static async deposit(id: string, amount: number): Promise<Goal[]> {
    return this.mutate((all) =>
      all.map((g) =>
        g.id === id ? { ...g, currentAmount: g.currentAmount + amount, updatedAt: new Date().toISOString() } : g
      )
    );
  }

  static async withdraw(id: string, amount: number): Promise<Goal[]> {
    return this.mutate((all) =>
      all.map((g) =>
        g.id === id
          ? { ...g, currentAmount: Math.max(0, g.currentAmount - amount), updatedAt: new Date().toISOString() }
          : g
      )
    );
  }

  static async delete(id: string): Promise<Goal[]> {
    return this.mutate((all) => all.filter((g) => g.id !== id));
  }
}
