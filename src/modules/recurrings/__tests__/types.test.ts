import { getYearlyReferenceMonth, isRecurringActiveInMonth, RecurringDebit } from '../types';

const recurring = (overrides: Partial<RecurringDebit>): RecurringDebit => ({
  id: 'rec-1',
  workspaceId: 'ws-1',
  title: 'Conta',
  amount: 100,
  category: 'Moradia',
  frequency: 'monthly',
  dueDay: 10,
  isPaidCurrentMonth: false,
  reminderEnabled: true,
  createdAt: '2026-01-15T12:00:00.000Z',
  ...overrides,
});

describe('isRecurringActiveInMonth', () => {
  it('mensal vale em todos os meses da vigência', () => {
    const r = recurring({ startDate: '2026-03', endDate: '2026-06' });
    expect(isRecurringActiveInMonth(r, 2, 2026)).toBe(false);
    expect(isRecurringActiveInMonth(r, 3, 2026)).toBe(true);
    expect(isRecurringActiveInMonth(r, 6, 2026)).toBe(true);
    expect(isRecurringActiveInMonth(r, 7, 2026)).toBe(false);
  });

  it('anual vale só no mês do início da vigência, todo ano', () => {
    const r = recurring({ frequency: 'yearly', startDate: '2026-03' });
    expect(isRecurringActiveInMonth(r, 3, 2026)).toBe(true);
    expect(isRecurringActiveInMonth(r, 4, 2026)).toBe(false);
    expect(isRecurringActiveInMonth(r, 2, 2027)).toBe(false);
    expect(isRecurringActiveInMonth(r, 3, 2027)).toBe(true);
    expect(isRecurringActiveInMonth(r, 3, 2025)).toBe(false); // antes do início
  });

  it('anual respeita o fim da vigência', () => {
    const r = recurring({ frequency: 'yearly', startDate: '2026-03', endDate: '2027-12' });
    expect(isRecurringActiveInMonth(r, 3, 2027)).toBe(true);
    expect(isRecurringActiveInMonth(r, 3, 2028)).toBe(false);
  });

  it('anual sem início usa o mês de criação', () => {
    const r = recurring({ frequency: 'yearly', createdAt: '2026-08-20T12:00:00.000Z' });
    expect(getYearlyReferenceMonth(r)).toBe(8);
    expect(isRecurringActiveInMonth(r, 8, 2027)).toBe(true);
    expect(isRecurringActiveInMonth(r, 9, 2027)).toBe(false);
  });

  it('semanal (sem opção na tela) continua tratada como mensal', () => {
    const r = recurring({ frequency: 'weekly' });
    expect(isRecurringActiveInMonth(r, 5, 2026)).toBe(true);
    expect(isRecurringActiveInMonth(r, 6, 2026)).toBe(true);
  });
});
