import React, { createContext, useContext, useEffect, useState, useMemo, useRef } from 'react';
import { AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useWorkspace } from './workspaces/WorkspaceContext';
import { useAuth } from '../services/auth/AuthContext';
import { Transaction, MonthlySummary } from './transactions/types';
import { TransactionRepository } from './transactions/repository';
import { RecurringDebit, RecurringMonthRecord, isRecurringActiveInMonth, DeleteRecurringScope } from './recurrings/types';
import { RecurringRepository } from './recurrings/repository';
import { RecurringMonthRepository } from './recurrings/monthRepository';
import { Budget, BudgetProgress, isBudgetActiveInMonth } from './budgets/types';
import { BudgetRepository } from './budgets/repository';
import { Goal, GoalProgress } from './goals/types';
import { GoalRepository } from './goals/repository';
import { CloudSyncService } from '../services/supabase/CloudSyncService';
import { SupabaseService } from '../services/supabase/supabaseClient';
import { getCurrentMonthYear } from '../core/utils/date';

export type BalanceMode = 'realized' | 'projected';

interface FinanceContextType {
  // Data filtered for active workspace
  transactions: Transaction[];
  allTransactions: Transaction[];
  recurrings: RecurringDebit[];
  budgets: Budget[];
  budgetProgressList: BudgetProgress[];
  goals: Goal[];
  goalProgressList: GoalProgress[];
  monthlySummary: MonthlySummary & { totalSavedInMonth: number };
  projectedIncome: number;
  projectedExpense: number;
  projectedBalance: number;
  balanceMode: BalanceMode;
  setBalanceMode: (mode: BalanceMode) => Promise<void>;
  toggleBalanceMode: () => void;

  // Selected period
  selectedMonth: number;
  selectedYear: number;
  setSelectedPeriod: (month: number, year: number) => void;

  // Actions with automatic background cloud sync
  addTransaction: (tx: Omit<Transaction, 'id' | 'workspaceId'>) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;
  addRecurring: (rec: Omit<RecurringDebit, 'id' | 'workspaceId' | 'isPaidCurrentMonth' | 'createdAt'>) => Promise<void>;
  updateRecurring: (rec: RecurringDebit) => Promise<void>;
  updateRecurringAmount: (
    id: string,
    newAmount: number,
    scope?: 'month' | 'forward' | 'base' | boolean
  ) => Promise<void>;
  toggleRecurringPaid: (id: string) => Promise<void>;
  batchSetRecurringsPaid: (ids: string[], isPaid: boolean) => Promise<void>;
  reorderRecurrings: (reordered: RecurringDebit[]) => Promise<void>;
  deleteRecurring: (id: string, scope?: DeleteRecurringScope) => Promise<void>;
  saveBudget: (
    category: Budget['category'],
    limitAmount: number,
    startDate?: string,
    endDate?: string,
    budgetId?: string
  ) => Promise<void>;
  deleteBudget: (id: string) => Promise<void>;
  addGoal: (goal: Omit<Goal, 'id' | 'workspaceId' | 'currentAmount' | 'createdAt'>, initialAmount?: number) => Promise<void>;
  updateGoal: (goal: Goal) => Promise<void>;
  depositGoal: (id: string, amount: number, createTransaction?: boolean) => Promise<void>;
  withdrawGoal: (id: string, amount: number, createTransaction?: boolean) => Promise<void>;
  deleteGoal: (id: string) => Promise<void>;
  reloadAll: () => Promise<void>;
  wipeAllData: () => Promise<void>;
}

const FinanceContext = createContext<FinanceContextType | undefined>(undefined);

export const FinanceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const { activeWorkspace } = useWorkspace();
  const currentPeriod = useMemo(() => getCurrentMonthYear(), []);

  const [selectedMonth, setSelectedMonth] = useState<number>(currentPeriod.month);
  const [selectedYear, setSelectedYear] = useState<number>(currentPeriod.year);

  const [allTransactions, setAllTransactions] = useState<Transaction[]>([]);
  const [allRecurrings, setAllRecurrings] = useState<RecurringDebit[]>([]);
  const [allRecurringMonthRecords, setAllRecurringMonthRecords] = useState<RecurringMonthRecord[]>([]);
  const [allBudgets, setAllBudgets] = useState<Budget[]>([]);
  const [allGoals, setAllGoals] = useState<Goal[]>([]);

  // Modo de Saldo: 'realized' (Caixa Real) ou 'projected' (Competência / Previsto Total)
  const [balanceMode, setBalanceModeState] = useState<BalanceMode>('realized');

  useEffect(() => {
    AsyncStorage.getItem('@financas:balance_mode_preference')
      .then((val) => {
        if (val === 'realized' || val === 'projected') {
          setBalanceModeState(val);
        }
      })
      .catch(() => {});
  }, []);

  const setBalanceMode = async (newMode: BalanceMode) => {
    setBalanceModeState(newMode);
    await AsyncStorage.setItem('@financas:balance_mode_preference', newMode);
  };

  const toggleBalanceMode = () => {
    const next = balanceMode === 'realized' ? 'projected' : 'realized';
    setBalanceMode(next);
  };

  const reloadAll = async () => {
    // 1. Instant local load
    const [t, r, rm, b, g] = await Promise.all([
      TransactionRepository.getAll(),
      RecurringRepository.getAll(),
      RecurringMonthRepository.getAll(),
      BudgetRepository.getAll(),
      GoalRepository.getAll(),
    ]);
    setAllTransactions(t);
    setAllRecurrings(r);
    setAllRecurringMonthRecords(rm);
    setAllBudgets(b);
    setAllGoals(g);

    // 2. Background cloud pull
    CloudSyncService.syncCloudToLocal().then(async (res) => {
      if (res.success) {
        const [freshT, freshR, freshRM, freshB, freshG] = await Promise.all([
          TransactionRepository.getAll(),
          RecurringRepository.getAll(),
          RecurringMonthRepository.getAll(),
          BudgetRepository.getAll(),
          GoalRepository.getAll(),
        ]);
        setAllTransactions(freshT);
        setAllRecurrings(freshR);
        setAllRecurringMonthRecords(freshRM);
        setAllBudgets(freshB);
        setAllGoals(freshG);
      }
    }).catch(() => {});
  };

  useEffect(() => {
    reloadAll();
  }, [user?.id, activeWorkspace?.id]);

  // Ao voltar do segundo plano: envia pendências da fila e baixa novidades da nuvem
  const reloadAllRef = useRef(reloadAll);
  reloadAllRef.current = reloadAll;
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        reloadAllRef.current();
      }
    });
    return () => subscription.remove();
  }, []);

  // Filter by active workspace
  const workspaceTransactions = useMemo(
    () => allTransactions.filter((t) => t.workspaceId === activeWorkspace.id),
    [allTransactions, activeWorkspace.id]
  );

  // Recurrings mapped dynamically for selectedMonth and selectedYear
  const recurrings = useMemo(() => {
    const ym = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}`;
    return allRecurrings
      .filter((r) => r.workspaceId === activeWorkspace.id)
      .filter((r) => !r.excludedMonths?.includes(ym))
      .map((r) => {
        const monthRec = allRecurringMonthRecords.find(
          (m) => m.recurringId === r.id && m.month === selectedMonth && m.year === selectedYear
        );
        const effectiveAmount = monthRec?.amount || r.monthlyOverrides?.[ym] || r.amount;
        return {
          ...r,
          amount: effectiveAmount,
          isPaidCurrentMonth: monthRec ? monthRec.isPaid : false,
          paidAt: monthRec?.paidAt,
        };
      });
  }, [allRecurrings, allRecurringMonthRecords, activeWorkspace.id, selectedMonth, selectedYear]);

  const budgets = useMemo(
    () =>
      allBudgets.filter(
        (b) =>
          b.workspaceId === activeWorkspace.id &&
          isBudgetActiveInMonth(b, selectedMonth, selectedYear)
      ),
    [allBudgets, activeWorkspace.id, selectedMonth, selectedYear]
  );

  const goals = useMemo(
    () => allGoals.filter((g) => g.workspaceId === activeWorkspace.id),
    [allGoals, activeWorkspace.id]
  );

  // Month filtered transactions
  const monthTransactions = useMemo(() => {
    return workspaceTransactions.filter((t) => {
      const d = new Date(t.date);
      return d.getMonth() + 1 === selectedMonth && d.getFullYear() === selectedYear;
    });
  }, [workspaceTransactions, selectedMonth, selectedYear]);

  // Monthly summary
  const monthlySummary = useMemo(() => {
    let income = 0;
    let expense = 0;
    let saved = 0;

    monthTransactions.forEach((t) => {
      if (t.type === 'income') {
        income += t.amount;
      } else {
        if (t.category === 'Investimentos' || t.category === 'Economia') {
          saved += t.amount;
        } else {
          expense += t.amount;
        }
      }
    });

    const balance = income - expense - saved;
    const savingsRate = income > 0 ? Math.max(0, Math.round((saved / income) * 100)) : 0;

    return {
      totalIncome: income,
      totalExpense: expense,
      totalSavedInMonth: saved,
      balance,
      savingsRate,
    };
  }, [monthTransactions]);

  // Recurring calculations
  const pendingRecurringExpense = useMemo(() => {
    return recurrings
      .filter((r) => isRecurringActiveInMonth(r, selectedMonth, selectedYear))
      .filter((r) => !r.isPaidCurrentMonth && (r.type === 'expense' || !r.type))
      .reduce((sum, r) => sum + r.amount, 0);
  }, [recurrings, selectedMonth, selectedYear]);

  const pendingRecurringIncome = useMemo(() => {
    return recurrings
      .filter((r) => isRecurringActiveInMonth(r, selectedMonth, selectedYear))
      .filter((r) => !r.isPaidCurrentMonth && r.type === 'income')
      .reduce((sum, r) => sum + r.amount, 0);
  }, [recurrings, selectedMonth, selectedYear]);

  const projectedIncome = monthlySummary.totalIncome + pendingRecurringIncome;
  const projectedExpense = monthlySummary.totalExpense + pendingRecurringExpense;
  const projectedBalance = projectedIncome - projectedExpense - monthlySummary.totalSavedInMonth;

  // Budget progress against current month expenses
  const budgetProgressList: BudgetProgress[] = useMemo(() => {
    // Calculate days remaining in the selected month
    const now = new Date();
    const isCurrentMonth = now.getMonth() + 1 === selectedMonth && now.getFullYear() === selectedYear;
    const totalDaysInMonth = new Date(selectedYear, selectedMonth, 0).getDate();
    const currentDay = isCurrentMonth ? now.getDate() : 1;
    const daysRemaining = Math.max(1, totalDaysInMonth - currentDay + 1);

    return budgets.map((b) => {
      const spent = monthTransactions
        .filter((t) => t.type === 'expense' && t.category === b.category)
        .reduce((sum, t) => sum + t.amount, 0);

      const remaining = b.limitAmount - spent;
      const percentage = b.limitAmount > 0 ? (spent / b.limitAmount) * 100 : 0;
      const dailyRemainingBudget = remaining > 0 ? remaining / daysRemaining : 0;

      return {
        budget: b,
        spent,
        remaining,
        percentage,
        isExceeded: spent >= b.limitAmount,
        isWarning: percentage >= 80 && spent < b.limitAmount,
        dailyRemainingBudget,
      };
    });
  }, [budgets, monthTransactions, selectedMonth, selectedYear]);

  // Goal progress with monthly planning calculations
  const goalProgressList: GoalProgress[] = useMemo(() => {
    const today = new Date();

    return goals.map((g) => {
      const percentage =
        g.targetAmount > 0
          ? Math.min(100, Math.round((g.currentAmount / g.targetAmount) * 100))
          : 0;
      const remainingAmount = Math.max(0, g.targetAmount - g.currentAmount);

      const deadline = new Date(g.deadlineDate);
      const monthsDiff =
        (deadline.getFullYear() - today.getFullYear()) * 12 +
        (deadline.getMonth() - today.getMonth());
      const monthsRemaining = Math.max(1, monthsDiff);
      const monthlyNeeded = remainingAmount > 0 ? remainingAmount / monthsRemaining : 0;

      return {
        goal: g,
        percentage,
        remainingAmount,
        isCompleted: g.currentAmount >= g.targetAmount,
        monthsRemaining,
        monthlyNeeded,
      };
    });
  }, [goals]);

  // Actions with automatic background synchronization
  const setSelectedPeriod = (month: number, year: number) => {
    setSelectedMonth(month);
    setSelectedYear(year);
  };

  const addTransaction = async (tx: Omit<Transaction, 'id' | 'workspaceId'>) => {
    const nowIso = new Date().toISOString();
    const newTx: Transaction = {
      ...tx,
      id: `tx-${Date.now()}`,
      workspaceId: activeWorkspace.id,
      createdBy: tx.createdBy || user?.email || user?.name || 'Você',
      updatedAt: nowIso,
    };
    const updated = await TransactionRepository.add(newTx);
    setAllTransactions(updated);
    // Persist immediately to Supabase
    await CloudSyncService.autoUpsertTransaction(newTx);
  };

  const deleteTransaction = async (id: string) => {
    const updated = await TransactionRepository.delete(id);
    setAllTransactions(updated);
    // Persist deletion immediately to Supabase
    await CloudSyncService.autoDeleteTransaction(id);
  };

  const addRecurring = async (
    rec: Omit<RecurringDebit, 'id' | 'workspaceId' | 'isPaidCurrentMonth' | 'createdAt'>
  ) => {
    const nowIso = new Date().toISOString();
    const newRec: RecurringDebit = {
      ...rec,
      id: `rec-${Date.now()}`,
      workspaceId: activeWorkspace.id,
      isPaidCurrentMonth: false,
      createdAt: nowIso,
      updatedAt: nowIso,
    };
    const updated = await RecurringRepository.add(newRec);
    setAllRecurrings(updated);
    // Persist immediately to Supabase
    await CloudSyncService.autoUpsertRecurring(newRec);
  };

  const updateRecurring = async (rec: RecurringDebit) => {
    const existing = allRecurrings.find((r) => r.id === rec.id);
    const withUpdate: RecurringDebit = {
      ...rec,
      monthlyOverrides: rec.monthlyOverrides !== undefined ? rec.monthlyOverrides : existing?.monthlyOverrides,
      updatedAt: new Date().toISOString(),
    };
    const updated = await RecurringRepository.update(withUpdate);
    setAllRecurrings(updated);
    await CloudSyncService.autoUpsertRecurring(withUpdate);
  };

  const updateRecurringAmount = async (
    id: string,
    newAmount: number,
    scope: 'month' | 'forward' | 'base' | boolean = 'month'
  ) => {
    const normalizedScope: 'month' | 'forward' | 'base' =
      typeof scope === 'boolean'
        ? (scope ? 'base' : 'month')
        : (scope || 'month');

    const target = allRecurrings.find((r) => r.id === id);
    if (!target) return;

    if (normalizedScope === 'base') {
      // 1. Updates base amount globally for all months
      const ym = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}`;
      const newOverrides = { ...(target.monthlyOverrides || {}) };
      delete newOverrides[ym];
      const updatedTarget: RecurringDebit = {
        ...target,
        amount: newAmount,
        monthlyOverrides: Object.keys(newOverrides).length > 0 ? newOverrides : undefined,
        updatedAt: new Date().toISOString(),
      };
      const updated = await RecurringRepository.update(updatedTarget);
      setAllRecurrings(updated);
      await CloudSyncService.autoUpsertRecurring(updatedTarget);

      // If current month had a record, sync it
      const existing = allRecurringMonthRecords.find(
        (m) => m.recurringId === id && m.month === selectedMonth && m.year === selectedYear
      );
      if (existing) {
        const updatedMR: RecurringMonthRecord = {
          ...existing,
          amount: newAmount,
          updatedAt: new Date().toISOString(),
        };
        const updatedMonthRecords = await RecurringMonthRepository.upsert(updatedMR);
        setAllRecurringMonthRecords(updatedMonthRecords);
        await CloudSyncService.autoUpsertRecurringMonthRecord(updatedMR);
      }
      if (existing?.isPaid && existing.transactionId) {
        const tx = allTransactions.find((t) => t.id === existing.transactionId);
        if (tx) {
          const updatedTx = { ...tx, amount: newAmount };
          await TransactionRepository.update(updatedTx);
          setAllTransactions((prev) => prev.map((t) => (t.id === tx.id ? updatedTx : t)));
          await CloudSyncService.autoUpsertTransaction(updatedTx);
        }
      }
    } else if (normalizedScope === 'month') {
      // 2. Updates only for the selected competence
      const existing = allRecurringMonthRecords.find(
        (m) => m.recurringId === id && m.month === selectedMonth && m.year === selectedYear
      );

      const monthRecord: RecurringMonthRecord = {
        id: `${id}-${selectedYear}-${selectedMonth}`,
        recurringId: id,
        workspaceId: target.workspaceId || activeWorkspace.id,
        month: selectedMonth,
        year: selectedYear,
        amount: newAmount,
        isPaid: existing ? existing.isPaid : false,
        paidAt: existing?.paidAt,
        transactionId: existing?.transactionId,
        updatedAt: new Date().toISOString(),
      };

      // Also update linked transaction amount if already paid
      if (existing?.isPaid && existing.transactionId) {
        const tx = allTransactions.find((t) => t.id === existing.transactionId);
        if (tx) {
          const updatedTx = { ...tx, amount: newAmount };
          await TransactionRepository.update(updatedTx);
          setAllTransactions((prev) => prev.map((t) => (t.id === tx.id ? updatedTx : t)));
          await CloudSyncService.autoUpsertTransaction(updatedTx);
        }
      }

      const updatedMonthRecords = await RecurringMonthRepository.upsert(monthRecord);
      setAllRecurringMonthRecords(updatedMonthRecords);
      await CloudSyncService.autoUpsertRecurringMonthRecord(monthRecord);

      // Persistir o override mensal diretamente na recorrência para sincronização robusta com a nuvem
      const ym = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}`;
      const newOverrides = {
        ...(target.monthlyOverrides || {}),
        [ym]: newAmount,
      };
      const updatedTarget: RecurringDebit = {
        ...target,
        monthlyOverrides: newOverrides,
        updatedAt: new Date().toISOString(),
      };
      const updatedRecs = await RecurringRepository.update(updatedTarget);
      setAllRecurrings(updatedRecs);
      await CloudSyncService.autoUpsertRecurring(updatedTarget);
    } else if (normalizedScope === 'forward') {
      // 3. A partir deste mês em diante:
      // Preserva o valor antigo nos meses anteriores e cria o novo valor a partir de agora
      let prevYear = selectedYear;
      let prevMonth = selectedMonth - 1;
      if (prevMonth < 1) {
        prevMonth = 12;
        prevYear -= 1;
      }
      const prevCompFormatted = `${prevYear}-${String(prevMonth).padStart(2, '0')}`;
      const currentCompFormatted = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}`;

      // A conta original encerra a vigência no mês anterior
      const updatedOldRec: RecurringDebit = {
        ...target,
        endDate: prevCompFormatted,
        updatedAt: new Date().toISOString(),
      };
      await RecurringRepository.update(updatedOldRec);
      await CloudSyncService.autoUpsertRecurring(updatedOldRec);

      // A nova conta com o novo valor começa na competência selecionada
      const newRec: RecurringDebit = {
        ...target,
        id: `rec-${Date.now()}`,
        amount: newAmount,
        startDate: currentCompFormatted,
        endDate: target.endDate && target.endDate > currentCompFormatted ? target.endDate : undefined,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      await RecurringRepository.add(newRec);
      await CloudSyncService.autoUpsertRecurring(newRec);

      // Se a conta atual já tinha sido paga neste mês, vincula o monthRecord à nova conta
      const existing = allRecurringMonthRecords.find(
        (m) => m.recurringId === id && m.month === selectedMonth && m.year === selectedYear
      );
      if (existing) {
        const newMonthRecord: RecurringMonthRecord = {
          ...existing,
          id: `${newRec.id}-${selectedYear}-${selectedMonth}`,
          recurringId: newRec.id,
          amount: newAmount,
          updatedAt: new Date().toISOString(),
        };
        // O registro do mês passa da conta antiga (encerrada no mês anterior) para a nova
        await RecurringMonthRepository.upsert(newMonthRecord);
        const updatedMonthRecords = await RecurringMonthRepository.deleteByIds([existing.id]);
        setAllRecurringMonthRecords(updatedMonthRecords);
        await CloudSyncService.autoUpsertRecurringMonthRecord(newMonthRecord);
        await CloudSyncService.autoDeleteRecurringMonthRecord(existing.id);

        if (existing.isPaid && existing.transactionId) {
          const tx = allTransactions.find((t) => t.id === existing.transactionId);
          if (tx) {
            const updatedTx = { ...tx, amount: newAmount };
            await TransactionRepository.update(updatedTx);
            setAllTransactions((prev) => prev.map((t) => (t.id === tx.id ? updatedTx : t)));
            await CloudSyncService.autoUpsertTransaction(updatedTx);
          }
        }
      }

      setAllRecurrings((prev) => [
        ...prev.map((r) => (r.id === target.id ? updatedOldRec : r)),
        newRec,
      ]);
    }
  };

  const toggleRecurringPaid = async (id: string) => {
    const target = allRecurrings.find((r) => r.id === id);
    if (!target) return;

    const existingIndex = allRecurringMonthRecords.findIndex(
      (m) => m.recurringId === id && m.month === selectedMonth && m.year === selectedYear
    );
    const existing = existingIndex >= 0 ? allRecurringMonthRecords[existingIndex] : null;

    const newIsPaid = existing ? !existing.isPaid : true;
    let transactionId = existing?.transactionId;

    const ym = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}`;
    const currentAmount = (existing && existing.amount > 0)
      ? existing.amount
      : (target.monthlyOverrides?.[ym] || target.amount);

    if (newIsPaid) {
      // Create transaction in Extrato for this competence
      const dayNum = Math.min(Math.max(target.dueDay || 1, 1), 28);
      const txDate = new Date(selectedYear, selectedMonth - 1, dayNum, 12, 0, 0).toISOString();

      const newTx: Transaction = {
        id: `tx-rec-${id}-${selectedYear}-${selectedMonth}`,
        workspaceId: activeWorkspace.id,
        title: target.title,
        amount: currentAmount,
        type: target.type || 'expense',
        category: target.category,
        date: txDate,
        notes: `Recorrência (${String(selectedMonth).padStart(2, '0')}/${selectedYear})`,
        assignedTo: target.assignedTo,
        isRecurringGenerated: true,
      };
      await TransactionRepository.add(newTx);
      setAllTransactions((prev) => [newTx, ...prev]);
      await CloudSyncService.autoUpsertTransaction(newTx);
      transactionId = newTx.id;
    } else {
      // Unmarking paid: delete linked transaction from Extrato
      if (transactionId) {
        await TransactionRepository.delete(transactionId);
        setAllTransactions((prev) => prev.filter((t) => t.id !== transactionId));
        await CloudSyncService.autoDeleteTransaction(transactionId);
        transactionId = undefined;
      }
    }

    const monthRecord: RecurringMonthRecord = {
      id: `${id}-${selectedYear}-${selectedMonth}`,
      recurringId: id,
      workspaceId: activeWorkspace.id,
      month: selectedMonth,
      year: selectedYear,
      amount: currentAmount,
      isPaid: newIsPaid,
      paidAt: newIsPaid ? new Date().toISOString() : undefined,
      transactionId,
      updatedAt: new Date().toISOString(),
    };

    const updatedMonthRecords = await RecurringMonthRepository.upsert(monthRecord);
    setAllRecurringMonthRecords(updatedMonthRecords);
    await CloudSyncService.autoUpsertRecurringMonthRecord(monthRecord);
  };

  const batchSetRecurringsPaid = async (ids: string[], isPaid: boolean) => {
    for (const id of ids) {
      const existing = allRecurringMonthRecords.find(
        (m) => m.recurringId === id && m.month === selectedMonth && m.year === selectedYear
      );
      const currentlyPaid = existing ? existing.isPaid : false;
      if (currentlyPaid !== isPaid) {
        await toggleRecurringPaid(id);
      }
    }
  };

  const reorderRecurrings = async (reordered: RecurringDebit[]) => {
    const updatedWithOrder = reordered.map((r, idx) => ({
      ...r,
      orderIndex: idx,
    }));
    const updatedAll = allRecurrings.map((r) => {
      const match = updatedWithOrder.find((item) => item.id === r.id);
      return match ? match : r;
    });
    setAllRecurrings(updatedAll);
    await RecurringRepository.saveAll(updatedAll);
    try {
      const client = await SupabaseService.getClient();
      for (const item of updatedWithOrder) {
        await client.from('recurrings').update({ order_index: item.orderIndex }).eq('id', item.id);
      }
    } catch {}
  };

  const deleteRecurring = async (id: string, scope: DeleteRecurringScope = 'all') => {
    const target = allRecurrings.find((r) => r.id === id);
    if (!target) return;

    const ym = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}`;

    // Limpar o mês atual se estava pago (remove transação vinculada do Extrato)
    const existingIndex = allRecurringMonthRecords.findIndex(
      (m) => m.recurringId === id && m.month === selectedMonth && m.year === selectedYear
    );
    const existingMonthRecord = existingIndex >= 0 ? allRecurringMonthRecords[existingIndex] : null;

    if (existingMonthRecord?.transactionId) {
      await TransactionRepository.delete(existingMonthRecord.transactionId);
      setAllTransactions((prev) => prev.filter((t) => t.id !== existingMonthRecord.transactionId));
      await CloudSyncService.autoDeleteTransaction(existingMonthRecord.transactionId);
    }

    if (scope === 'month') {
      // 1. Exclui apenas da competência selecionada
      const currentExcluded = target.excludedMonths || [];
      const newExcluded = Array.from(new Set([...currentExcluded, ym]));

      const updatedTarget: RecurringDebit = {
        ...target,
        excludedMonths: newExcluded,
        updatedAt: new Date().toISOString(),
      };

      const updatedRecs = await RecurringRepository.update(updatedTarget);
      setAllRecurrings(updatedRecs);
      await CloudSyncService.autoUpsertRecurring(updatedTarget);

      // Remove o registro do mês selecionado se existia (no aparelho e na nuvem)
      if (existingMonthRecord) {
        const remainingMonths = await RecurringMonthRepository.deleteByIds([existingMonthRecord.id]);
        setAllRecurringMonthRecords(remainingMonths);
        await CloudSyncService.autoDeleteRecurringMonthRecord(existingMonthRecord.id);
      }
    } else if (scope === 'forward') {
      // 2. Desta competência em diante: encerra vigência no mês anterior
      let prevYear = selectedYear;
      let prevMonth = selectedMonth - 1;
      if (prevMonth < 1) {
        prevMonth = 12;
        prevYear -= 1;
      }
      const prevCompFormatted = `${prevYear}-${String(prevMonth).padStart(2, '0')}`;

      const updatedTarget: RecurringDebit = {
        ...target,
        endDate: prevCompFormatted,
        updatedAt: new Date().toISOString(),
      };

      const updatedRecs = await RecurringRepository.update(updatedTarget);
      setAllRecurrings(updatedRecs);
      await CloudSyncService.autoUpsertRecurring(updatedTarget);

      // Remove registros mensais deste mês em diante (no aparelho e na nuvem)
      const removedIds = allRecurringMonthRecords
        .filter((m) => m.recurringId === id && `${m.year}-${String(m.month).padStart(2, '0')}` >= ym)
        .map((m) => m.id);
      const remainingMonths = await RecurringMonthRepository.deleteByIds(removedIds);
      setAllRecurringMonthRecords(remainingMonths);
      for (const monthRecordId of removedIds) {
        await CloudSyncService.autoDeleteRecurringMonthRecord(monthRecordId);
      }
    } else {
      // 3. De todos os meses (Definitivo)
      const updated = await RecurringRepository.delete(id);
      setAllRecurrings(updated);
      await CloudSyncService.autoDeleteRecurring(id);

      // Also delete any month records associated with this recurring
      const removedIds = allRecurringMonthRecords.filter((m) => m.recurringId === id).map((m) => m.id);
      const updatedMonthRecords = await RecurringMonthRepository.deleteByRecurringId(id);
      setAllRecurringMonthRecords(updatedMonthRecords);
      for (const monthRecordId of removedIds) {
        await CloudSyncService.autoDeleteRecurringMonthRecord(monthRecordId);
      }
    }
  };

  const saveBudget = async (
    category: Budget['category'],
    limitAmount: number,
    startDate?: string,
    endDate?: string,
    budgetId?: string
  ) => {
    const existing = budgetId ? allBudgets.find((b) => b.id === budgetId) : undefined;
    const defaultStart = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}`;
    const nowIso = new Date().toISOString();

    const newBudget: Budget = {
      id: budgetId || existing?.id || `bdg-${category}-${selectedMonth}-${selectedYear}`,
      workspaceId: activeWorkspace.id,
      category,
      limitAmount,
      month: selectedMonth,
      year: selectedYear,
      startDate: startDate || existing?.startDate || defaultStart,
      endDate: endDate || existing?.endDate || undefined,
      updatedAt: nowIso,
    };
    const updated = await BudgetRepository.addOrUpdate(newBudget);
    setAllBudgets(updated);
    // Persist immediately to Supabase
    await CloudSyncService.autoUpsertBudget(newBudget);
  };

  const deleteBudget = async (id: string) => {
    const updated = await BudgetRepository.delete(id);
    setAllBudgets(updated);
    // Persist immediately to Supabase
    await CloudSyncService.autoDeleteBudget(id);
  };

  const addGoal = async (
    goal: Omit<Goal, 'id' | 'workspaceId' | 'currentAmount' | 'createdAt'>,
    initialAmount = 0
  ) => {
    const nowIso = new Date().toISOString();
    const newGoal: Goal = {
      ...goal,
      id: `goal-${Date.now()}`,
      workspaceId: activeWorkspace.id,
      currentAmount: initialAmount,
      createdAt: nowIso,
      updatedAt: nowIso,
    };
    const updated = await GoalRepository.add(newGoal);
    setAllGoals(updated);
    // Persist immediately to Supabase
    await CloudSyncService.autoUpsertGoal(newGoal);
  };

  const updateGoal = async (goal: Goal) => {
    const withUpdate: Goal = {
      ...goal,
      updatedAt: new Date().toISOString(),
    };
    const updated = await GoalRepository.update(withUpdate);
    setAllGoals(updated);
    await CloudSyncService.autoUpsertGoal(withUpdate);
  };

  const depositGoal = async (id: string, amount: number, createTransaction: boolean = true) => {
    const updated = await GoalRepository.deposit(id, amount);
    setAllGoals(updated);
    const item = updated.find((g) => g.id === id);
    if (item) {
      await CloudSyncService.autoUpsertGoal(item);

      if (createTransaction) {
        const today = new Date();
        const txDate = new Date(selectedYear, selectedMonth - 1, Math.min(today.getDate(), 28), 12, 0, 0).toISOString();
        const tx: Transaction = {
          id: `tx-goal-dep-${Date.now()}`,
          workspaceId: activeWorkspace.id,
          title: `Aporte: ${item.title}`,
          amount,
          type: 'expense',
          category: 'Economia',
          date: txDate,
          notes: `Aporte na meta financeira "${item.title}"`,
        };
        await TransactionRepository.add(tx);
        setAllTransactions((prev) => [tx, ...prev]);
        await CloudSyncService.autoUpsertTransaction(tx);
      }
    }
  };

  const withdrawGoal = async (id: string, amount: number, createTransaction: boolean = true) => {
    const updated = await GoalRepository.withdraw(id, amount);
    setAllGoals(updated);
    const item = updated.find((g) => g.id === id);
    if (item) {
      await CloudSyncService.autoUpsertGoal(item);

      if (createTransaction) {
        const today = new Date();
        const txDate = new Date(selectedYear, selectedMonth - 1, Math.min(today.getDate(), 28), 12, 0, 0).toISOString();
        const tx: Transaction = {
          id: `tx-goal-wth-${Date.now()}`,
          workspaceId: activeWorkspace.id,
          title: `Resgate: ${item.title}`,
          amount,
          type: 'income',
          category: 'Economia',
          date: txDate,
          notes: `Resgate da meta financeira "${item.title}"`,
        };
        await TransactionRepository.add(tx);
        setAllTransactions((prev) => [tx, ...prev]);
        await CloudSyncService.autoUpsertTransaction(tx);
      }
    }
  };

  const deleteGoal = async (id: string) => {
    const updated = await GoalRepository.delete(id);
    setAllGoals(updated);
    // Persist immediately to Supabase
    await CloudSyncService.autoDeleteGoal(id);
  };

  const wipeAllData = async () => {
    await Promise.all([
      TransactionRepository.saveAll([]),
      RecurringRepository.saveAll([]),
      BudgetRepository.saveAll([]),
      GoalRepository.saveAll([]),
    ]);
    setAllTransactions([]);
    setAllRecurrings([]);
    setAllBudgets([]);
    setAllGoals([]);

    // Clear on Supabase cloud as well
    try {
      const client = await SupabaseService.getClient();
      await Promise.all([
        client.from('transactions').delete().neq('id', 'dummy_id_placeholder'),
        client.from('recurrings').delete().neq('id', 'dummy_id_placeholder'),
        client.from('budgets').delete().neq('id', 'dummy_id_placeholder'),
        client.from('goals').delete().neq('id', 'dummy_id_placeholder'),
      ]);
    } catch {}
  };

  return (
    <FinanceContext.Provider
      value={{
        transactions: monthTransactions,
        allTransactions: workspaceTransactions,
        recurrings,
        budgets,
        budgetProgressList,
        goals,
        goalProgressList,
        monthlySummary,
        projectedIncome,
        projectedExpense,
        projectedBalance,
        balanceMode,
        setBalanceMode,
        toggleBalanceMode,
        selectedMonth,
        selectedYear,
        setSelectedPeriod,
        addTransaction,
        deleteTransaction,
        addRecurring,
        updateRecurring,
        updateRecurringAmount,
        toggleRecurringPaid,
        batchSetRecurringsPaid,
        reorderRecurrings,
        deleteRecurring,
        saveBudget,
        deleteBudget,
        addGoal,
        updateGoal,
        depositGoal,
        withdrawGoal,
        deleteGoal,
        reloadAll,
        wipeAllData,
      }}
    >
      {children}
    </FinanceContext.Provider>
  );
};

export const useFinance = (): FinanceContextType => {
  const context = useContext(FinanceContext);
  if (!context) {
    throw new Error('useFinance must be used within a FinanceProvider');
  }
  return context;
};
