import AsyncStorage from '@react-native-async-storage/async-storage';
import { SupabaseService } from './supabaseClient';
import { SyncOperation, SyncQueue, SyncQueueEntry, SyncTable, syncQueueKey } from './SyncQueue';
import { withStorageLock } from '../../core/storageLock';
import { TransactionRepository } from '../../modules/transactions/repository';
import { RecurringRepository } from '../../modules/recurrings/repository';
import { RecurringMonthRepository } from '../../modules/recurrings/monthRepository';
import { BudgetRepository } from '../../modules/budgets/repository';
import { GoalRepository } from '../../modules/goals/repository';
import { GoalTransactionRepository } from '../../modules/goals/transactionRepository';
import { Transaction } from '../../modules/transactions/types';
import { RecurringDebit, RecurringMonthRecord } from '../../modules/recurrings/types';
import { Budget } from '../../modules/budgets/types';
import { Goal, GoalTransaction } from '../../modules/goals/types';
import {
  CloudRow,
  PendingSets,
  PushResult,
  RowContext,
  MAX_MISSING_PARENT_ATTEMPTS,
  budgetToRow,
  classifyError,
  goalToRow,
  goalTransactionToRow,
  mergeById,
  monthRecordToRow,
  recurringToRow,
  rowToBudget,
  rowToGoal,
  rowToGoalTransaction,
  rowToMonthRecord,
  rowToRecurring,
  rowToTransaction,
  toTime,
  transactionToRow,
} from './syncMerge';

export {
  encodeRecurringNotes,
  decodeRecurringNotes,
  encodeTransactionNotes,
  decodeTransactionNotes,
} from './syncMerge';

const UPSERT_ORDER: SyncTable[] = [
  'transactions',
  'recurrings',
  'recurring_month_records',
  'budgets',
  'goals',
  'goal_transactions',
];
const DELETE_ORDER: SyncTable[] = [...UPSERT_ORDER].reverse();

const BOOTSTRAP_KEY_PREFIX = '@financas:sync_bootstrap_v1:';
const FLUSH_LOCK_KEY = '@financas:sync_flush';
const PAGE_SIZE = 1000; // limite padrão de linhas por consulta no Supabase
const UPSERT_CHUNK = 500;

type CloudClient = Awaited<ReturnType<typeof SupabaseService.getClient>>;

export class CloudSyncService {
  private static async getAuthenticatedClient() {
    try {
      const client = await SupabaseService.getClient();
      const {
        data: { session },
      } = await client.auth.getSession();
      if (!session?.user) {
        return null;
      }
      return { client, user: session.user };
    } catch {
      return null;
    }
  }


  // ---------- Envio (fila de pendências) ----------

  // Grava a operação na fila e tenta enviar na hora; se falhar, ela fica para a próxima tentativa.
  private static async queueAndFlush(table: SyncTable, id: string, op: SyncOperation): Promise<void> {
    try {
      const auth = await this.getAuthenticatedClient();
      if (!auth) return; // modo visitante: sem nuvem
      await SyncQueue.enqueue(table, id, op);
      await this.flushQueue();
    } catch {}
  }

  static async autoUpsertTransaction(t: Transaction): Promise<void> {
    await this.queueAndFlush('transactions', t.id, 'upsert');
  }

  static async autoDeleteTransaction(id: string): Promise<void> {
    await this.queueAndFlush('transactions', id, 'delete');
  }

  static async autoUpsertRecurring(r: RecurringDebit): Promise<void> {
    await this.queueAndFlush('recurrings', r.id, 'upsert');
  }

  static async autoDeleteRecurring(id: string): Promise<void> {
    await this.queueAndFlush('recurrings', id, 'delete');
  }

  static async autoUpsertRecurringMonthRecord(rec: RecurringMonthRecord): Promise<void> {
    await this.queueAndFlush('recurring_month_records', rec.id, 'upsert');
  }

  static async autoDeleteRecurringMonthRecord(id: string): Promise<void> {
    await this.queueAndFlush('recurring_month_records', id, 'delete');
  }

  static async autoUpsertBudget(b: Budget): Promise<void> {
    await this.queueAndFlush('budgets', b.id, 'upsert');
  }

  static async autoDeleteBudget(id: string): Promise<void> {
    await this.queueAndFlush('budgets', id, 'delete');
  }

  static async autoUpsertGoal(g: Goal): Promise<void> {
    await this.queueAndFlush('goals', g.id, 'upsert');
  }

  static async autoDeleteGoal(id: string): Promise<void> {
    await this.queueAndFlush('goals', id, 'delete');
  }

  static async autoUpsertGoalTransaction(gt: GoalTransaction): Promise<void> {
    await this.queueAndFlush('goal_transactions', gt.id, 'upsert');
  }

  static async autoDeleteGoalTransaction(id: string): Promise<void> {
    await this.queueAndFlush('goal_transactions', id, 'delete');
  }

  static async getPendingCount(): Promise<number> {
    return SyncQueue.count();
  }

  // Envia tudo o que está na fila. Devolve quantas operações continuam pendentes.
  static flushQueue(): Promise<number> {
    return withStorageLock(FLUSH_LOCK_KEY, async () => {
      const entries = await SyncQueue.getAll();
      if (entries.length === 0) return 0;

      const auth = await this.getAuthenticatedClient();
      if (!auth) return entries.length;

      const ctx: RowContext = {
        personalWsId: `ws-${auth.user.id}`,
        userEmail: auth.user.email || null,
      };
      const done: SyncQueueEntry[] = [];
      const missingParent: SyncQueueEntry[] = [];
      const recurringsStillPending = new Set<string>();

      for (const table of UPSERT_ORDER) {
        const upserts = entries.filter((e) => e.table === table && e.op === 'upsert');
        if (upserts.length === 0) continue;

        const localRows = await this.buildLocalRows(table, ctx, new Set(upserts.map((e) => e.id)));
        const toSend: { entry: SyncQueueEntry; row: Record<string, unknown> }[] = [];
        for (const entry of upserts) {
          const row = localRows.get(entry.id);
          if (!row) {
            done.push(entry); // não existe mais no aparelho: nada a enviar
          } else if (
            table === 'recurring_month_records' &&
            recurringsStillPending.has(String(row.recurring_id))
          ) {
            // A recorrente ainda não chegou à nuvem: aguarda para não violar a chave estrangeira
          } else {
            toSend.push({ entry, row });
          }
        }

        const results = await this.pushRows(auth.client, table, toSend.map((s) => s.row));
        toSend.forEach((s, idx) => {
          const result = results[idx];
          if (result === 'missing_parent' && (s.entry.attempts || 0) + 1 >= MAX_MISSING_PARENT_ATTEMPTS) {
            done.push(s.entry); // desiste: o espaço não existe mesmo na nuvem
          } else if (result === 'transient' || result === 'missing_parent') {
            if (result === 'missing_parent') missingParent.push(s.entry);
            if (table === 'recurrings') recurringsStillPending.add(s.entry.id);
          } else {
            done.push(s.entry);
          }
        });
      }

      for (const table of DELETE_ORDER) {
        for (const entry of entries.filter((e) => e.table === table && e.op === 'delete')) {
          try {
            const { error } = await auth.client.from(table).delete().eq('id', entry.id);
            const result = classifyError(error);
            if (result !== 'transient' && result !== 'missing_parent') done.push(entry);
          } catch {}
        }
      }

      await SyncQueue.removeSent(done);
      await SyncQueue.incrementAttempts(missingParent);
      return SyncQueue.count();
    });
  }

  // Converte para o formato do banco apenas os itens que estão na fila (e não a tabela inteira)
  private static async buildLocalRows(
    table: SyncTable,
    ctx: RowContext,
    ids: Set<string>
  ): Promise<Map<string, Record<string, unknown>>> {
    const pick = <T extends { id: string }>(items: T[], toRow: (item: T, c: RowContext) => Record<string, unknown>) =>
      new Map(items.filter((item) => ids.has(item.id)).map((item) => [item.id, toRow(item, ctx)]));

    switch (table) {
      case 'transactions':
        return pick(await TransactionRepository.getAll(), transactionToRow);
      case 'recurrings':
        return pick(await RecurringRepository.getAll(), recurringToRow);
      case 'recurring_month_records':
        return pick(await RecurringMonthRepository.getAll(), monthRecordToRow);
      case 'budgets':
        return pick(await BudgetRepository.getAll(), budgetToRow);
      case 'goals':
        return pick(await GoalRepository.getAll(), goalToRow);
      case 'goal_transactions':
        return pick(await GoalTransactionRepository.getAll(), goalTransactionToRow);
    }
  }

  // Envia em lotes; se um lote for recusado pelo banco, isola linha a linha
  // para que uma única linha inválida não derrube as demais.
  private static async pushRows(
    client: CloudClient,
    table: SyncTable,
    rows: Record<string, unknown>[]
  ): Promise<PushResult[]> {
    const results: PushResult[] = [];
    for (let i = 0; i < rows.length; i += UPSERT_CHUNK) {
      const chunk = rows.slice(i, i + UPSERT_CHUNK);
      let batchError: { code?: string } | null;
      try {
        const { error } = await client.from(table).upsert(chunk);
        batchError = error;
      } catch {
        batchError = { code: '' };
      }

      const batchResult = classifyError(batchError);
      if (batchResult === 'ok' || batchResult === 'transient' || chunk.length === 1) {
        results.push(...chunk.map(() => batchResult));
        continue;
      }

      for (const row of chunk) {
        try {
          const { error } = await client.from(table).upsert(row);
          results.push(classifyError(error));
        } catch {
          results.push('transient');
        }
      }
    }
    return results;
  }

  // Na primeira sincronização desta versão, coloca na fila tudo o que existe no aparelho.
  // Garante que dados que nunca subiram (falhas antigas) cheguem à nuvem antes que a
  // sincronização passe a remover itens ausentes na nuvem.
  private static async ensureBootstrap(userId: string): Promise<void> {
    const key = `${BOOTSTRAP_KEY_PREFIX}${userId}`;
    if (await AsyncStorage.getItem(key)) return;

    const [transactions, recurrings, monthRecords, budgets, goals] = await Promise.all([
      TransactionRepository.getAll(),
      RecurringRepository.getAll(),
      RecurringMonthRepository.getAll(),
      BudgetRepository.getAll(),
      GoalRepository.getAll(),
    ]);
    const op: SyncOperation = 'upsert';
    await SyncQueue.enqueueMany([
      ...transactions.map((t) => ({ table: 'transactions' as const, id: t.id, op })),
      ...recurrings.map((r) => ({ table: 'recurrings' as const, id: r.id, op })),
      ...monthRecords.map((m) => ({ table: 'recurring_month_records' as const, id: m.id, op })),
      ...budgets.map((b) => ({ table: 'budgets' as const, id: b.id, op })),
      ...goals.map((g) => ({ table: 'goals' as const, id: g.id, op })),
    ]);
    await AsyncStorage.setItem(key, new Date().toISOString());
  }

  // ---------- Download ----------

  // Lê todas as linhas paginando (o Supabase devolve no máximo 1000 por consulta).
  // Devolve null se qualquer página falhar, para que a tabela não seja reconciliada pela metade.
  private static async fetchAllRows(
    client: CloudClient,
    table: SyncTable,
    workspaceIds: string[]
  ): Promise<CloudRow[] | null> {
    const rows: CloudRow[] = [];
    try {
      for (let from = 0; ; from += PAGE_SIZE) {
        const { data, error } = await client
          .from(table)
          .select('*')
          .in('workspace_id', workspaceIds)
          .order('id', { ascending: true })
          .range(from, from + PAGE_SIZE - 1);
        if (error || !Array.isArray(data)) return null;
        rows.push(...data);
        if (data.length < PAGE_SIZE) return rows;
      }
    } catch {
      return null;
    }
  }

  static async syncCloudToLocal(): Promise<{ success: boolean; message: string }> {
    try {
      const auth = await this.getAuthenticatedClient();
      if (!auth) {
        return { success: false, message: 'Nenhuma conta conectada. Sincronização offline desabilitada.' };
      }

      const client = auth.client;
      const user = auth.user;
      const userEmail = user.email?.toLowerCase().trim() || '';
      const personalWsId = `ws-${user.id}`;

      // 1. Envia antes o que está pendente
      await this.ensureBootstrap(user.id);
      await this.flushQueue();

      // 2. Espaços em que o usuário é membro aprovado. Se não der para saber, não reconcilia nada:
      // sem essa lista, os dados dos espaços compartilhados seriam descartados do aparelho.
      const { data: memberRows, error: memberErr } = await client
        .from('workspace_members')
        .select('workspace_id, role')
        .eq('email', userEmail);
      if (memberErr || !Array.isArray(memberRows)) {
        return { success: false, message: 'Não foi possível verificar seus espaços na nuvem.' };
      }
      const allowed = new Set<string>([
        personalWsId,
        ...memberRows.filter((m) => m.role !== 'pending').map((m) => String(m.workspace_id)),
      ]);
      const allowedIds = Array.from(allowed);

      // 3. Download completo
      const fetchStartedAt = Date.now();
      const [txRows, recRows, monthRows, budgetRows, goalRows, goalTxRows] = await Promise.all([
        this.fetchAllRows(client, 'transactions', allowedIds),
        this.fetchAllRows(client, 'recurrings', allowedIds),
        this.fetchAllRows(client, 'recurring_month_records', allowedIds),
        this.fetchAllRows(client, 'budgets', allowedIds),
        this.fetchAllRows(client, 'goals', allowedIds),
        this.fetchAllRows(client, 'goal_transactions', allowedIds).catch(() => null),
      ]);

      // 4. Pendências atuais (protegem alterações locais ainda não enviadas)
      const queue = await SyncQueue.getAll();
      const pending: PendingSets = {
        upsert: new Set(queue.filter((e) => e.op === 'upsert').map((e) => syncQueueKey(e.table, e.id))),
        delete: new Set(queue.filter((e) => e.op === 'delete').map((e) => syncQueueKey(e.table, e.id))),
      };
      const base = { personalWsId, allowed, pending, fetchStartedAt };

      // 5. Reconciliação tabela a tabela, sob trava do armazenamento local
      if (txRows) {
        await TransactionRepository.mutate((local) =>
          mergeById<Transaction>({
            ...base,
            table: 'transactions',
            local,
            cloud: txRows.map(rowToTransaction),
            timestamp: (t) => toTime(t.updatedAt || t.date),
            // Legado: item do antigo 'ws-solo' criado por outro usuário (vazamento anterior)
            keepLocal: (t) =>
              !(
                t.workspaceId === 'ws-solo' &&
                t.createdBy &&
                t.createdBy.toLowerCase() !== userEmail &&
                t.createdBy !== 'Você'
              ),
          })
        );
      }

      if (recRows) {
        await RecurringRepository.mutate((local) =>
          mergeById<RecurringDebit>({
            ...base,
            table: 'recurrings',
            local,
            cloud: recRows.map(rowToRecurring),
            // Sem união de overrides/exclusões: a versão da nuvem vale por inteiro, para que um
            // valor mensal removido em outro aparelho não volte. Alterações locais ainda não
            // enviadas ficam protegidas pela fila de pendências.
            timestamp: (r) => toTime(r.updatedAt || r.createdAt),
          })
        );
      }

      if (monthRows) {
        const allRecurrings = await RecurringRepository.getAll();
        await RecurringMonthRepository.mutate((local) => {
          const merged = mergeById<RecurringMonthRecord>({
            ...base,
            table: 'recurring_month_records',
            local,
            cloud: monthRows.map(rowToMonthRecord),
            timestamp: (m) => toTime(m.updatedAt || m.paidAt),
            // Se a nuvem não tem valor válido, preserva o valor local
            combine: (localItem, cloudItem) =>
              cloudItem.amount <= 0 && localItem.amount > 0 ? { ...cloudItem, amount: localItem.amount } : cloudItem,
          });

          // Aplica os valores mensais (overrides) gravados nas recorrências
          const mergedById = new Map(merged.map((m) => [m.id, m]));
          for (const rec of allRecurrings) {
            if (!rec.monthlyOverrides) continue;
            for (const [ym, overrideAmount] of Object.entries(rec.monthlyOverrides)) {
              const [yStr, mStr] = ym.split('-');
              const yearNum = parseInt(yStr, 10);
              const monthNum = parseInt(mStr, 10);
              const recMonthId = `${rec.id}-${yearNum}-${monthNum}`;
              const existingRecord = mergedById.get(recMonthId);
              mergedById.set(
                recMonthId,
                existingRecord
                  ? { ...existingRecord, amount: overrideAmount }
                  : {
                      id: recMonthId,
                      recurringId: rec.id,
                      workspaceId: rec.workspaceId,
                      month: monthNum,
                      year: yearNum,
                      amount: overrideAmount,
                      isPaid: false,
                    }
              );
            }
          }
          return Array.from(mergedById.values());
        });
      }

      if (budgetRows) {
        await BudgetRepository.mutate((local) =>
          mergeById<Budget>({
            ...base,
            table: 'budgets',
            local,
            cloud: budgetRows.map(rowToBudget),
            timestamp: (b) => toTime(b.updatedAt),
          })
        );
      }

      if (goalRows) {
        await GoalRepository.mutate((local) =>
          mergeById<Goal>({
            ...base,
            table: 'goals',
            local,
            cloud: goalRows.map(rowToGoal),
            timestamp: (g) => toTime(g.updatedAt || g.createdAt),
          })
        );
      }

      if (goalTxRows) {
        await GoalTransactionRepository.mutate((local) =>
          mergeById<GoalTransaction>({
            ...base,
            table: 'goal_transactions',
            local,
            cloud: goalTxRows.map(rowToGoalTransaction),
            timestamp: (gt) => toTime(gt.updatedAt || gt.date),
          })
        );
      }

      return {
        success: true,
        message: 'Dados baixados e reconciliados com sucesso!',
      };
    } catch (e: any) {
      return { success: false, message: `Erro ao baixar da nuvem: ${e?.message}` };
    }
  }
}
