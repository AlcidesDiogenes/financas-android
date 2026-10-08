import AsyncStorage from '@react-native-async-storage/async-storage';
import { withStorageLock } from '../../core/storageLock';

// Fila persistente de alterações locais que ainda não chegaram à nuvem (outbox).
// Guarda apenas a referência (tabela + id + operação); no envio, a versão mais recente
// do item é lida do armazenamento local.

export type SyncTable =
  | 'transactions'
  | 'recurrings'
  | 'recurring_month_records'
  | 'budgets'
  | 'goals'
  | 'goal_transactions';
export type SyncOperation = 'upsert' | 'delete';

export interface SyncQueueEntry {
  table: SyncTable;
  id: string;
  op: SyncOperation;
  queuedAt: string;
  // Tentativas recusadas por o espaço ainda não existir na nuvem (chave estrangeira)
  attempts?: number;
}

const SYNC_QUEUE_STORAGE_KEY = '@financas:sync_outbox_v1';

export const syncQueueKey = (table: SyncTable, id: string): string => `${table}:${id}`;

export class SyncQueue {
  static async getAll(): Promise<SyncQueueEntry[]> {
    try {
      const data = await AsyncStorage.getItem(SYNC_QUEUE_STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  private static mutate(fn: (all: SyncQueueEntry[]) => SyncQueueEntry[]): Promise<SyncQueueEntry[]> {
    return withStorageLock(SYNC_QUEUE_STORAGE_KEY, async () => {
      const updated = fn(await this.getAll());
      await AsyncStorage.setItem(SYNC_QUEUE_STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
  }

  // Uma única entrada por item: a operação mais recente substitui a anterior
  static async enqueueMany(items: { table: SyncTable; id: string; op: SyncOperation }[]): Promise<void> {
    if (items.length === 0) return;
    const queuedAt = new Date().toISOString();
    await this.mutate((all) => {
      const byKey = new Map(all.map((e) => [syncQueueKey(e.table, e.id), e]));
      for (const item of items) {
        byKey.set(syncQueueKey(item.table, item.id), { ...item, queuedAt });
      }
      return Array.from(byKey.values());
    });
  }

  static async enqueue(table: SyncTable, id: string, op: SyncOperation): Promise<void> {
    await this.enqueueMany([{ table, id, op }]);
  }

  // Remove somente as entradas que não foram substituídas por uma operação mais nova durante o envio
  static async removeSent(sent: SyncQueueEntry[]): Promise<void> {
    if (sent.length === 0) return;
    const sentKeys = new Set(sent.map((e) => `${syncQueueKey(e.table, e.id)}|${e.op}|${e.queuedAt}`));
    await this.mutate((all) =>
      all.filter((e) => !sentKeys.has(`${syncQueueKey(e.table, e.id)}|${e.op}|${e.queuedAt}`))
    );
  }

  // Conta mais uma tentativa recusada; a entrada só é afetada se não foi substituída durante o envio
  static async incrementAttempts(failed: SyncQueueEntry[]): Promise<void> {
    if (failed.length === 0) return;
    const failedKeys = new Set(failed.map((e) => `${syncQueueKey(e.table, e.id)}|${e.op}|${e.queuedAt}`));
    await this.mutate((all) =>
      all.map((e) =>
        failedKeys.has(`${syncQueueKey(e.table, e.id)}|${e.op}|${e.queuedAt}`)
          ? { ...e, attempts: (e.attempts || 0) + 1 }
          : e
      )
    );
  }

  static async count(): Promise<number> {
    return (await this.getAll()).length;
  }

  static async clear(): Promise<void> {
    await this.mutate(() => []);
  }
}
