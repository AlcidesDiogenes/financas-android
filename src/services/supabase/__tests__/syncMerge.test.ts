import {
  classifyError,
  mapWorkspaceId,
  mergeById,
  MergeOptions,
  recurringToRow,
  rowToRecurring,
  rowToTransaction,
  transactionToRow,
  goalTransactionToRow,
  rowToGoalTransaction,
} from '../syncMerge';
import { syncQueueKey } from '../SyncQueue';
import { Transaction } from '../../../modules/transactions/types';
import { RecurringDebit } from '../../../modules/recurrings/types';
import { GoalTransaction } from '../../../modules/goals/types';

type Item = { id: string; workspaceId: string; title: string; updatedAt?: string };

const PERSONAL_WS = 'ws-user-1';
const SHARED_WS = 'ws-shared-1';
const OLD = '2026-10-01T00:00:00.000Z';
const NEW = '2026-10-05T00:00:00.000Z';
const FETCH_STARTED = '2026-10-08T12:00:00.000Z';
const AFTER_FETCH = '2026-10-08T12:00:05.000Z';

const item = (id: string, title: string, updatedAt?: string, workspaceId = PERSONAL_WS): Item => ({
  id,
  workspaceId,
  title,
  updatedAt,
});

const options = (overrides: Partial<MergeOptions<Item>>): MergeOptions<Item> => ({
  table: 'transactions',
  local: [],
  cloud: [],
  personalWsId: PERSONAL_WS,
  allowed: new Set([PERSONAL_WS, SHARED_WS]),
  pending: { upsert: new Set(), delete: new Set() },
  fetchStartedAt: Date.parse(FETCH_STARTED),
  timestamp: (i) => (i.updatedAt ? Date.parse(i.updatedAt) : 0),
  ...overrides,
});

const byId = (items: Item[]) => Object.fromEntries(items.map((i) => [i.id, i]));

describe('mergeById', () => {
  it('remove do aparelho o item excluído na nuvem (sem envio pendente)', () => {
    const result = mergeById(options({ local: [item('a', 'local', OLD)], cloud: [] }));
    expect(result).toEqual([]);
  });

  it('mantém o item local que ainda está na fila para enviar', () => {
    const result = mergeById(
      options({
        local: [item('a', 'local', OLD)],
        cloud: [],
        pending: { upsert: new Set([syncQueueKey('transactions', 'a')]), delete: new Set() },
      })
    );
    expect(result.map((i) => i.id)).toEqual(['a']);
  });

  it('a versão local pendente prevalece sobre a da nuvem', () => {
    const result = mergeById(
      options({
        local: [item('a', 'local', OLD)],
        cloud: [item('a', 'nuvem', NEW)],
        pending: { upsert: new Set([syncQueueKey('transactions', 'a')]), delete: new Set() },
      })
    );
    expect(byId(result).a.title).toBe('local');
  });

  it('não traz de volta um item com exclusão pendente', () => {
    const result = mergeById(
      options({
        cloud: [item('a', 'nuvem', NEW)],
        pending: { upsert: new Set(), delete: new Set([syncQueueKey('transactions', 'a')]) },
      })
    );
    expect(result).toEqual([]);
  });

  it('adiciona itens novos da nuvem', () => {
    const result = mergeById(options({ cloud: [item('b', 'nuvem', NEW)] }));
    expect(result.map((i) => i.id)).toEqual(['b']);
  });

  it('a nuvem prevalece quando é mais nova ou igual', () => {
    const newer = mergeById(options({ local: [item('a', 'local', OLD)], cloud: [item('a', 'nuvem', NEW)] }));
    expect(byId(newer).a.title).toBe('nuvem');

    const tie = mergeById(options({ local: [item('a', 'local', NEW)], cloud: [item('a', 'nuvem', NEW)] }));
    expect(byId(tie).a.title).toBe('nuvem');
  });

  it('mantém a versão local quando ela é mais nova que a da nuvem', () => {
    const result = mergeById(options({ local: [item('a', 'local', NEW)], cloud: [item('a', 'nuvem', OLD)] }));
    expect(byId(result).a.title).toBe('local');
  });

  it('protege item criado durante o download, mesmo ausente na nuvem', () => {
    const result = mergeById(options({ local: [item('novo', 'local', AFTER_FETCH)], cloud: [] }));
    expect(result.map((i) => i.id)).toEqual(['novo']);
  });

  it('descarta itens de espaços sem permissão (local e nuvem)', () => {
    const result = mergeById(
      options({
        local: [item('a', 'local', OLD, 'ws-outro')],
        cloud: [item('b', 'nuvem', NEW, 'ws-outro')],
      })
    );
    expect(result).toEqual([]);
  });

  it("converte o espaço legado 'ws-solo' para o espaço pessoal", () => {
    const result = mergeById(
      options({
        local: [item('a', 'local', OLD, 'ws-solo')],
        pending: { upsert: new Set([syncQueueKey('transactions', 'a')]), delete: new Set() },
      })
    );
    expect(byId(result).a.workspaceId).toBe(PERSONAL_WS);
  });

  it('aplica o filtro keepLocal e a função combine', () => {
    const filtered = mergeById(
      options({
        local: [item('a', 'local', AFTER_FETCH)],
        keepLocal: (i) => i.title !== 'local',
      })
    );
    expect(filtered).toEqual([]);

    const combined = mergeById(
      options({
        local: [item('a', 'local', OLD)],
        cloud: [item('a', 'nuvem', NEW)],
        combine: (local, cloud) => ({ ...cloud, title: `${cloud.title}+${local.title}` }),
      })
    );
    expect(byId(combined).a.title).toBe('nuvem+local');
  });
});

describe('classifyError', () => {
  it('classifica os erros do banco e de rede', () => {
    expect(classifyError(null)).toBe('ok');
    expect(classifyError({ code: '42501' })).toBe('permanent'); // RLS / sem permissão
    expect(classifyError({ code: '23505' })).toBe('permanent'); // violação de unicidade
    expect(classifyError({ code: '22P02' })).toBe('permanent'); // dado inválido
    expect(classifyError({ code: '23503' })).toBe('missing_parent'); // chave estrangeira
    expect(classifyError({ code: '' })).toBe('transient'); // falha de rede
    expect(classifyError({ code: '42703' })).toBe('transient'); // coluna ausente (SQL ainda não rodado)
    expect(classifyError({ code: 'PGRST301' })).toBe('transient');
  });
});

describe('mapWorkspaceId', () => {
  it("usa o espaço pessoal para id vazio ou 'ws-solo'", () => {
    expect(mapWorkspaceId(undefined, PERSONAL_WS)).toBe(PERSONAL_WS);
    expect(mapWorkspaceId('ws-solo', PERSONAL_WS)).toBe(PERSONAL_WS);
    expect(mapWorkspaceId(SHARED_WS, PERSONAL_WS)).toBe(SHARED_WS);
  });
});

describe('conversão local <-> nuvem', () => {
  const ctx = { personalWsId: PERSONAL_WS, userEmail: 'eu@teste.local' };

  it('transação preserva responsável e origem recorrente', () => {
    const tx: Transaction = {
      id: 'tx-1',
      workspaceId: SHARED_WS,
      title: 'Mercado',
      amount: 123.45,
      type: 'expense',
      category: 'Alimentação',
      date: OLD,
      assignedTo: 'Ana',
      isRecurringGenerated: true,
      updatedAt: NEW,
    };
    const back = rowToTransaction({ ...transactionToRow(tx, ctx), amount: '123.45' });
    expect(back).toMatchObject({
      id: 'tx-1',
      workspaceId: SHARED_WS,
      amount: 123.45,
      assignedTo: 'Ana',
      isRecurringGenerated: true,
      createdBy: 'eu@teste.local',
      updatedAt: NEW,
    });
  });

  it('recorrente preserva pausa, observações, valores mensais e meses excluídos', () => {
    const rec: RecurringDebit = {
      id: 'rec-1',
      workspaceId: PERSONAL_WS,
      title: 'Internet',
      amount: 100,
      category: 'Moradia',
      frequency: 'monthly',
      dueDay: 10,
      isPaidCurrentMonth: false,
      reminderEnabled: true,
      notes: 'Fibra',
      createdAt: OLD,
      updatedAt: NEW,
      isPaused: true,
      monthlyOverrides: { '2026-10': 120 },
      excludedMonths: ['2026-11'],
    };
    const back = rowToRecurring({ ...recurringToRow(rec, ctx), amount: '100', created_at: OLD });
    expect(back).toMatchObject({
      id: 'rec-1',
      isPaused: true,
      notes: 'Fibra',
      monthlyOverrides: { '2026-10': 120 },
      excludedMonths: ['2026-11'],
    });
  });

  it('transação preserva paidBy via anotação codificada e descriptografada', () => {
    const tx: Transaction = {
      id: 'tx-2',
      workspaceId: SHARED_WS,
      title: 'Energia',
      amount: 150,
      type: 'expense',
      category: 'Moradia',
      date: NEW,
      notes: 'Conta de luz de outubro',
      paidBy: 'Alcides',
    };
    const row = transactionToRow(tx, ctx);
    expect(row.notes).toContain('<!--__PAID_BY__:Alcides-->');

    const back = rowToTransaction({ ...row, amount: '150' });
    expect(back.paidBy).toBe('Alcides');
    expect(back.notes).toBe('Conta de luz de outubro');
  });

  it('goalTransaction converte corretamente para nuvem e volta para local', () => {
    const gt: GoalTransaction = {
      id: 'gt-1',
      goalId: 'goal-1',
      workspaceId: SHARED_WS,
      amount: 500,
      type: 'deposit',
      date: NEW,
      createdBy: 'maria@teste.local',
      notes: 'Aporte mensal',
      updatedAt: NEW,
    };
    const row = goalTransactionToRow(gt, ctx);
    expect(row).toMatchObject({
      id: 'gt-1',
      goal_id: 'goal-1',
      workspace_id: SHARED_WS,
      amount: 500,
      type: 'deposit',
      created_by: 'maria@teste.local',
      notes: 'Aporte mensal',
    });

    const back = rowToGoalTransaction({ ...row, amount: '500' });
    expect(back).toMatchObject({
      id: 'gt-1',
      goalId: 'goal-1',
      workspaceId: SHARED_WS,
      amount: 500,
      type: 'deposit',
      createdBy: 'maria@teste.local',
      notes: 'Aporte mensal',
    });
  });
});
