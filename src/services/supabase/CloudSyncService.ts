import AsyncStorage from '@react-native-async-storage/async-storage';
import { SupabaseService } from './supabaseClient';
import { SyncOperation, SyncQueue, SyncQueueEntry, SyncTable, syncQueueKey } from './SyncQueue';
import { withStorageLock } from '../../core/storageLock';
import { TransactionRepository } from '../../modules/transactions/repository';
import { RecurringRepository } from '../../modules/recurrings/repository';
import { RecurringMonthRepository } from '../../modules/recurrings/monthRepository';
import { BudgetRepository } from '../../modules/budgets/repository';
import { GoalRepository } from '../../modules/goals/repository';
import { Transaction } from '../../modules/transactions/types';
import { RecurringDebit, RecurringMonthRecord } from '../../modules/recurrings/types';
import { Budget } from '../../modules/budgets/types';
import { Goal } from '../../modules/goals/types';
export function encodeRecurringNotes(
  userNotes?: string | null,
  monthlyOverrides?: Record<string, number>,
  excludedMonths?: string[]
): string | null {
  const cleanUserNotes = (userNotes || '')
    .replace(/\s*<!--__MONTHLY_OVERRIDES__:[\s\S]*?-->/g, '')
    .replace(/\s*<!--__EXCLUDED_MONTHS__:[\s\S]*?-->/g, '')
    .trim();

  const tags: string[] = [];
  if (monthlyOverrides && Object.keys(monthlyOverrides).length > 0) {
    tags.push(`<!--__MONTHLY_OVERRIDES__:${JSON.stringify(monthlyOverrides)}-->`);
  }
  if (excludedMonths && excludedMonths.length > 0) {
    tags.push(`<!--__EXCLUDED_MONTHS__:${JSON.stringify(excludedMonths)}-->`);
  }

  if (tags.length === 0) {
    return cleanUserNotes || null;
  }
  const tagBlock = tags.join('\n');
  return cleanUserNotes ? `${cleanUserNotes}\n${tagBlock}` : tagBlock;
}

export function decodeRecurringNotes(rawNotes?: string | null): {
  userNotes?: string;
  monthlyOverrides?: Record<string, number>;
  excludedMonths?: string[];
} {
  if (!rawNotes) return { userNotes: undefined, monthlyOverrides: undefined, excludedMonths: undefined };

  const matchOverrides = rawNotes.match(/<!--__MONTHLY_OVERRIDES__:([\s\S]*?)-->/);
  let monthlyOverrides: Record<string, number> | undefined = undefined;
  if (matchOverrides && matchOverrides[1]) {
    try {
      monthlyOverrides = JSON.parse(matchOverrides[1]);
    } catch {}
  }

  const matchExclusions = rawNotes.match(/<!--__EXCLUDED_MONTHS__:([\s\S]*?)-->/);
  let excludedMonths: string[] | undefined = undefined;
  if (matchExclusions && matchExclusions[1]) {
    try {
      excludedMonths = JSON.parse(matchExclusions[1]);
    } catch {}
  }

  const userNotes = rawNotes
    .replace(/\s*<!--__MONTHLY_OVERRIDES__:[\s\S]*?-->/g, '')
    .replace(/\s*<!--__EXCLUDED_MONTHS__:[\s\S]*?-->/g, '')
    .trim() || undefined;

  return { userNotes, monthlyOverrides, excludedMonths };
}

// Linhas vindas do Supabase não são tipadas (cliente sem tipos gerados do banco)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type CloudRow = any;
type PushResult = 'ok' | 'transient' | 'permanent';

interface RowContext {
  personalWsId: string;
  userEmail: string | null;
}

interface PendingSets {
  upsert: Set<string>;
  delete: Set<string>;
}

// Recusas definitivas do banco (permissão/RLS, chave estrangeira, restrições e dados inválidos):
// não adianta tentar de novo; a versão da nuvem prevalece na próxima sincronização.
const PERMANENT_ERROR_CODE = /^(42501|23\d{3}|22\d{3})$/;

const classifyError = (error: { code?: string } | null): PushResult => {
  if (!error) return 'ok';
  return error.code && PERMANENT_ERROR_CODE.test(error.code) ? 'permanent' : 'transient';
};

// Ordem de envio respeitando as chaves estrangeiras (recorrente antes do registro mensal)
const UPSERT_ORDER: SyncTable[] = ['transactions', 'recurrings', 'recurring_month_records', 'budgets', 'goals'];
const DELETE_ORDER: SyncTable[] = [...UPSERT_ORDER].reverse();

const BOOTSTRAP_KEY_PREFIX = '@financas:sync_bootstrap_v1:';
const FLUSH_LOCK_KEY = '@financas:sync_flush';
const PAGE_SIZE = 1000; // limite padrão de linhas por consulta no Supabase
const UPSERT_CHUNK = 500;

const mapWorkspaceId = (wsId: string | undefined, personalWsId: string): string =>
  !wsId || wsId === 'ws-solo' ? personalWsId : wsId;

const toTime = (value?: string): number => {
  const time = value ? new Date(value).getTime() : 0;
  return isNaN(time) ? 0 : time;
};

// ---------- Local -> nuvem ----------
const transactionToRow = (t: Transaction, ctx: RowContext) => ({
  id: t.id,
  workspace_id: mapWorkspaceId(t.workspaceId, ctx.personalWsId),
  title: t.title,
  amount: t.amount,
  type: t.type,
  category: t.category,
  date: t.date,
  notes: t.notes ?? null,
  created_by: t.createdBy || ctx.userEmail || null,
  assigned_to: t.assignedTo || null,
  is_recurring_generated: !!t.isRecurringGenerated,
  updated_at: t.updatedAt || t.date || new Date().toISOString(),
});

const recurringToRow = (r: RecurringDebit, ctx: RowContext) => ({
  id: r.id,
  workspace_id: mapWorkspaceId(r.workspaceId, ctx.personalWsId),
  title: r.title,
  amount: r.amount,
  type: r.type || 'expense',
  category: r.category,
  frequency: r.frequency,
  due_day: r.dueDay,
  is_paid_current_month: r.isPaidCurrentMonth,
  reminder_enabled: r.reminderEnabled,
  assigned_to: r.assignedTo || null,
  start_date: r.startDate || null,
  end_date: r.endDate || null,
  is_paused: !!r.isPaused,
  notes: encodeRecurringNotes(r.notes, r.monthlyOverrides, r.excludedMonths),
  updated_at: r.updatedAt || r.createdAt || new Date().toISOString(),
});

const monthRecordToRow = (m: RecurringMonthRecord, ctx: RowContext) => ({
  id: m.id,
  recurring_id: m.recurringId,
  workspace_id: mapWorkspaceId(m.workspaceId, ctx.personalWsId),
  month: m.month,
  year: m.year,
  year_month: `${m.year}-${String(m.month).padStart(2, '0')}`,
  amount: m.amount,
  is_paid: m.isPaid,
  paid_at: m.paidAt || null,
  transaction_id: m.transactionId || null,
  updated_at: m.updatedAt || new Date().toISOString(),
});

const budgetToRow = (b: Budget, ctx: RowContext) => ({
  id: b.id,
  workspace_id: mapWorkspaceId(b.workspaceId, ctx.personalWsId),
  category: b.category,
  limit_amount: b.limitAmount,
  month: b.month,
  year: b.year,
  start_date: b.startDate || null,
  end_date: b.endDate || null,
  updated_at: b.updatedAt || new Date().toISOString(),
});

const goalToRow = (g: Goal, ctx: RowContext) => ({
  id: g.id,
  workspace_id: mapWorkspaceId(g.workspaceId, ctx.personalWsId),
  title: g.title,
  target_amount: g.targetAmount,
  current_amount: g.currentAmount,
  deadline_date: g.deadlineDate,
  icon: g.icon,
  color: g.color,
  notes: g.notes ?? null,
  updated_at: g.updatedAt || g.createdAt || new Date().toISOString(),
});

// ---------- Nuvem -> local ----------
const rowToTransaction = (row: CloudRow): Transaction => ({
  id: row.id,
  workspaceId: row.workspace_id,
  title: row.title,
  amount: parseFloat(row.amount),
  type: row.type,
  category: row.category,
  date: row.date,
  notes: row.notes ?? undefined,
  createdBy: row.created_by ?? undefined,
  assignedTo: row.assigned_to ?? undefined,
  isRecurringGenerated: !!row.is_recurring_generated,
  updatedAt: row.updated_at || row.created_at || row.date,
});

const rowToRecurring = (row: CloudRow): RecurringDebit => {
  const { userNotes, monthlyOverrides, excludedMonths } = decodeRecurringNotes(row.notes);
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    title: row.title,
    amount: parseFloat(row.amount),
    type: row.type || 'expense',
    category: row.category,
    frequency: row.frequency,
    dueDay: row.due_day,
    isPaidCurrentMonth: row.is_paid_current_month,
    reminderEnabled: row.reminder_enabled,
    assignedTo: row.assigned_to ?? undefined,
    startDate: row.start_date ?? undefined,
    endDate: row.end_date ?? undefined,
    isPaused: !!row.is_paused,
    notes: userNotes,
    monthlyOverrides,
    excludedMonths,
    createdAt: row.created_at,
    updatedAt: row.updated_at || row.created_at,
  };
};

const rowToMonthRecord = (row: CloudRow): RecurringMonthRecord => {
  let monthNum = row.month;
  let yearNum = row.year;
  if ((!monthNum || !yearNum) && row.year_month) {
    const parts = String(row.year_month).split('-');
    yearNum = parseInt(parts[0], 10);
    monthNum = parseInt(parts[1], 10);
  }
  const parsedAmount = parseFloat(row.amount);
  return {
    id: row.id,
    recurringId: row.recurring_id,
    workspaceId: row.workspace_id,
    month: monthNum || 1,
    year: yearNum || new Date().getFullYear(),
    amount: isNaN(parsedAmount) ? 0 : parsedAmount,
    isPaid: !!row.is_paid,
    paidAt: row.paid_at ?? undefined,
    transactionId: row.transaction_id ?? undefined,
    updatedAt: row.updated_at ?? undefined,
  };
};

const rowToBudget = (row: CloudRow): Budget => ({
  id: row.id,
  workspaceId: row.workspace_id,
  category: row.category,
  limitAmount: parseFloat(row.limit_amount),
  month: row.month,
  year: row.year,
  startDate: row.start_date ?? undefined,
  endDate: row.end_date ?? undefined,
  updatedAt: row.updated_at ?? undefined,
});

const rowToGoal = (row: CloudRow): Goal => ({
  id: row.id,
  workspaceId: row.workspace_id,
  title: row.title,
  targetAmount: parseFloat(row.target_amount),
  currentAmount: parseFloat(row.current_amount),
  deadlineDate: row.deadline_date,
  icon: row.icon,
  color: row.color,
  notes: row.notes ?? undefined,
  createdAt: row.created_at,
  updatedAt: row.updated_at || row.created_at,
});

// ---------- Merge ----------
interface MergeOptions<T extends { id: string; workspaceId: string }> {
  table: SyncTable;
  local: T[];
  cloud: T[];
  personalWsId: string;
  allowed: Set<string>;
  pending: PendingSets;
  fetchStartedAt: number;
  timestamp: (item: T) => number;
  keepLocal?: (item: T) => boolean;
  combine?: (local: T, cloud: T) => T;
}

// A nuvem é a referência. Do lado local só sobrevivem:
// - alterações ainda na fila de envio (pendentes);
// - itens mais novos que a cópia da nuvem (alterados durante a sincronização).
// Item local ausente na nuvem e sem envio pendente foi excluído em outro aparelho e sai.
function mergeById<T extends { id: string; workspaceId: string }>(o: MergeOptions<T>): T[] {
  const result = new Map<string, T>();
  const localById = new Map<string, T>();

  for (const item of o.local) {
    if (o.keepLocal && !o.keepLocal(item)) continue;
    const mapped: T = { ...item, workspaceId: mapWorkspaceId(item.workspaceId, o.personalWsId) };
    const isPending = o.pending.upsert.has(syncQueueKey(o.table, item.id));
    if (!isPending && !o.allowed.has(mapped.workspaceId)) continue;
    localById.set(item.id, mapped);
    if (isPending || o.timestamp(mapped) >= o.fetchStartedAt) {
      result.set(item.id, mapped);
    }
  }

  for (const cloudItem of o.cloud) {
    if (!o.allowed.has(cloudItem.workspaceId)) continue;
    const key = syncQueueKey(o.table, cloudItem.id);
    if (o.pending.delete.has(key) || o.pending.upsert.has(key)) continue;

    const localItem = localById.get(cloudItem.id);
    if (localItem && o.timestamp(localItem) > o.timestamp(cloudItem)) {
      result.set(cloudItem.id, localItem);
      continue;
    }
    result.set(cloudItem.id, localItem && o.combine ? o.combine(localItem, cloudItem) : cloudItem);
  }

  return Array.from(result.values());
}

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

  static async testConnection(): Promise<{ success: boolean; message: string }> {
    try {
      const client = await SupabaseService.getClient();
      const { error } = await client.from('workspaces').select('id').limit(1);
      if (error) {
        return { success: false, message: `Erro ao conectar: ${error.message}` };
      }
      return { success: true, message: 'Conectado à nuvem com sucesso!' };
    } catch (e: any) {
      return { success: false, message: e?.message || 'Falha na conexão com a nuvem' };
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
      const recurringsStillPending = new Set<string>();

      for (const table of UPSERT_ORDER) {
        const upserts = entries.filter((e) => e.table === table && e.op === 'upsert');
        if (upserts.length === 0) continue;

        const localRows = await this.buildLocalRows(table, ctx);
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
          if (results[idx] === 'transient') {
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
            if (classifyError(error) !== 'transient') done.push(entry);
          } catch {}
        }
      }

      await SyncQueue.removeSent(done);
      return SyncQueue.count();
    });
  }

  private static async buildLocalRows(
    table: SyncTable,
    ctx: RowContext
  ): Promise<Map<string, Record<string, unknown>>> {
    switch (table) {
      case 'transactions':
        return new Map((await TransactionRepository.getAll()).map((t) => [t.id, transactionToRow(t, ctx)]));
      case 'recurrings':
        return new Map((await RecurringRepository.getAll()).map((r) => [r.id, recurringToRow(r, ctx)]));
      case 'recurring_month_records':
        return new Map((await RecurringMonthRepository.getAll()).map((m) => [m.id, monthRecordToRow(m, ctx)]));
      case 'budgets':
        return new Map((await BudgetRepository.getAll()).map((b) => [b.id, budgetToRow(b, ctx)]));
      case 'goals':
        return new Map((await GoalRepository.getAll()).map((g) => [g.id, goalToRow(g, ctx)]));
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
      const [txRows, recRows, monthRows, budgetRows, goalRows] = await Promise.all([
        this.fetchAllRows(client, 'transactions', allowedIds),
        this.fetchAllRows(client, 'recurrings', allowedIds),
        this.fetchAllRows(client, 'recurring_month_records', allowedIds),
        this.fetchAllRows(client, 'budgets', allowedIds),
        this.fetchAllRows(client, 'goals', allowedIds),
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
            timestamp: (r) => toTime(r.updatedAt || r.createdAt),
            combine: (localItem, cloudItem) => {
              // Une overrides e exclusões mensais locais e da nuvem
              const combinedOverrides = {
                ...(localItem.monthlyOverrides || {}),
                ...(cloudItem.monthlyOverrides || {}),
              };
              const combinedExclusions = Array.from(
                new Set([...(localItem.excludedMonths || []), ...(cloudItem.excludedMonths || [])])
              );
              return {
                ...cloudItem,
                monthlyOverrides: Object.keys(combinedOverrides).length > 0 ? combinedOverrides : undefined,
                excludedMonths: combinedExclusions.length > 0 ? combinedExclusions : undefined,
              };
            },
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

      return {
        success: true,
        message: 'Dados baixados e reconciliados com sucesso!',
      };
    } catch (e: any) {
      return { success: false, message: `Erro ao baixar da nuvem: ${e?.message}` };
    }
  }
}
