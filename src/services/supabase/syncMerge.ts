// Lógica pura da sincronização com a nuvem (sem rede nem armazenamento),
// separada do CloudSyncService para poder ser testada isoladamente.
import { SyncTable, syncQueueKey } from './SyncQueue';
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
export type CloudRow = any;
export type PushResult = 'ok' | 'transient' | 'permanent' | 'missing_parent';

export interface RowContext {
  personalWsId: string;
  userEmail: string | null;
}

export interface PendingSets {
  upsert: Set<string>;
  delete: Set<string>;
}

// Recusas definitivas do banco (permissão/RLS, chave estrangeira, restrições e dados inválidos):
// não adianta tentar de novo; a versão da nuvem prevalece na próxima sincronização.
// Os códigos SQLSTATE têm 5 caracteres alfanuméricos (ex.: 22P02 = valor em formato inválido)
export const PERMANENT_ERROR_CODE = /^(42501|23[0-9A-Z]{3}|22[0-9A-Z]{3})$/;

// Chave estrangeira: o espaço (ou a recorrente) pode ainda não ter chegado à nuvem,
// por exemplo um espaço criado sem internet. Tenta de novo algumas vezes antes de desistir.
export const FOREIGN_KEY_VIOLATION = '23503';
export const MAX_MISSING_PARENT_ATTEMPTS = 5;

export const classifyError = (error: { code?: string } | null): PushResult => {
  if (!error) return 'ok';
  if (error.code === FOREIGN_KEY_VIOLATION) return 'missing_parent';
  return error.code && PERMANENT_ERROR_CODE.test(error.code) ? 'permanent' : 'transient';
};

// Ordem de envio respeitando as chaves estrangeiras (recorrente antes do registro mensal)

export const mapWorkspaceId = (wsId: string | undefined, personalWsId: string): string =>
  !wsId || wsId === 'ws-solo' ? personalWsId : wsId;

export const toTime = (value?: string): number => {
  const time = value ? new Date(value).getTime() : 0;
  return isNaN(time) ? 0 : time;
};

// ---------- Local -> nuvem ----------
export const transactionToRow = (t: Transaction, ctx: RowContext) => ({
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

export const recurringToRow = (r: RecurringDebit, ctx: RowContext) => ({
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

export const monthRecordToRow = (m: RecurringMonthRecord, ctx: RowContext) => ({
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

export const budgetToRow = (b: Budget, ctx: RowContext) => ({
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

export const goalToRow = (g: Goal, ctx: RowContext) => ({
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
export const rowToTransaction = (row: CloudRow): Transaction => ({
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

export const rowToRecurring = (row: CloudRow): RecurringDebit => {
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

export const rowToMonthRecord = (row: CloudRow): RecurringMonthRecord => {
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

export const rowToBudget = (row: CloudRow): Budget => ({
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

export const rowToGoal = (row: CloudRow): Goal => ({
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
export interface MergeOptions<T extends { id: string; workspaceId: string }> {
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
export function mergeById<T extends { id: string; workspaceId: string }>(o: MergeOptions<T>): T[] {
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
