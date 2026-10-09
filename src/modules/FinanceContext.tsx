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
import { Goal, GoalProgress, GoalTransaction } from './goals/types';
import { GoalRepository } from './goals/repository';
import { GoalTransactionRepository } from './goals/transactionRepository';
import { CloudSyncService } from '../services/supabase/CloudSyncService';
import { subscribeToCloudChanges } from '../services/supabase/RealtimeSync';
import { getCurrentMonthYear } from '../core/utils/date';
import { RollbackStep, runWithRollback } from '../core/utils/runWithRollback';

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
  goalTransactions: GoalTransaction[];
  getGoalTransactions: (goalId: string) => GoalTransaction[];
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
  isFinanceReady: boolean;
}

const FinanceContext = createContext<FinanceContextType | undefined>(undefined);

export const FinanceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const { activeWorkspace, refreshWorkspaces, isWorkspacesReady } = useWorkspace();
  const [isFinanceReady, setIsFinanceReady] = useState(false);
  const currentPeriod = useMemo(() => getCurrentMonthYear(), []);

  const [selectedMonth, setSelectedMonth] = useState<number>(currentPeriod.month);
  const [selectedYear, setSelectedYear] = useState<number>(currentPeriod.year);

  const [allTransactions, setAllTransactions] = useState<Transaction[]>([]);
  const [allRecurrings, setAllRecurrings] = useState<RecurringDebit[]>([]);
  const [allRecurringMonthRecords, setAllRecurringMonthRecords] = useState<RecurringMonthRecord[]>([]);
  const [allBudgets, setAllBudgets] = useState<Budget[]>([]);
  const [allGoals, setAllGoals] = useState<Goal[]>([]);
  const [allGoalTransactions, setAllGoalTransactions] = useState<GoalTransaction[]>([]);

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
    const [t, r, rm, b, g, gtx] = await Promise.all([
      TransactionRepository.getAll(),
      RecurringRepository.getAll(),
      RecurringMonthRepository.getAll(),
      BudgetRepository.getAll(),
      GoalRepository.getAll(),
      GoalTransactionRepository.getAll(),
    ]);
    setAllTransactions(t);
    setAllRecurrings(r);
    setAllRecurringMonthRecords(rm);
    setAllBudgets(b);
    setAllGoals(g);
    setAllGoalTransactions(gtx);
    setIsFinanceReady(true);

    // 2. Background cloud pull
    CloudSyncService.syncCloudToLocal().then(async (res) => {
      if (res.success) {
        const [freshT, freshR, freshRM, freshB, freshG, freshGtx] = await Promise.all([
          TransactionRepository.getAll(),
          RecurringRepository.getAll(),
          RecurringMonthRepository.getAll(),
          BudgetRepository.getAll(),
          GoalRepository.getAll(),
          GoalTransactionRepository.getAll(),
        ]);
        setAllTransactions(freshT);
        setAllRecurrings(freshR);
        setAllRecurringMonthRecords(freshRM);
        setAllBudgets(freshB);
        setAllGoals(freshG);
        setAllGoalTransactions(freshGtx);
      }
    }).catch(() => {});
  };

  useEffect(() => {
    if (isWorkspacesReady) {
      reloadAll();
    }
  }, [user?.id, activeWorkspace?.id, isWorkspacesReady]);

  // Ao voltar do segundo plano: envia pendências da fila e baixa novidades da nuvem
  const reloadAllRef = useRef(reloadAll);
  reloadAllRef.current = reloadAll;
  const selectedPeriodRef = useRef({ month: selectedMonth, year: selectedYear });
  selectedPeriodRef.current = { month: selectedMonth, year: selectedYear };
  const lastCurrentPeriodRef = useRef({ month: currentPeriod.month, year: currentPeriod.year });
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState !== 'active') return;

      // Virada do mês com o app aberto: quem estava vendo o mês "atual" passa para o novo mês
      const now = getCurrentMonthYear();
      const last = lastCurrentPeriodRef.current;
      if (now.month !== last.month || now.year !== last.year) {
        const selected = selectedPeriodRef.current;
        if (selected.month === last.month && selected.year === last.year) {
          setSelectedMonth(now.month);
          setSelectedYear(now.year);
        }
        lastCurrentPeriodRef.current = { month: now.month, year: now.year };
      }

      reloadAllRef.current();
    });
    return () => subscription.remove();
  }, []);

  // Tempo real: mudanças de outros membros/aparelhos disparam uma sincronização
  const refreshWorkspacesRef = useRef(refreshWorkspaces);
  refreshWorkspacesRef.current = refreshWorkspaces;
  useEffect(() => {
    if (!user?.id) return;
    let unsubscribe: (() => void) | null = null;
    let cancelled = false;
    subscribeToCloudChanges(user.id, {
      onDataChanged: () => {
        reloadAllRef.current().catch(() => {});
      },
      onWorkspacesChanged: () => {
        refreshWorkspacesRef.current().catch(() => {});
      },
    })
      .then((stop) => {
        if (cancelled) stop();
        else unsubscribe = stop;
      })
      .catch(() => {});
    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, [user?.id]);

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

  const goalTransactions = useMemo(
    () => allGoalTransactions.filter((gt) => gt.workspaceId === activeWorkspace.id),
    [allGoalTransactions, activeWorkspace.id]
  );

  const getGoalTransactions = (goalId: string) => {
    return allGoalTransactions
      .filter((gt) => gt.goalId === goalId && gt.workspaceId === activeWorkspace.id)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  };

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
      .filter((r) => !r.isPaused && !r.isPaidCurrentMonth && (r.type === 'expense' || !r.type))
      .reduce((sum, r) => sum + r.amount, 0);
  }, [recurrings, selectedMonth, selectedYear]);

  const pendingRecurringIncome = useMemo(() => {
    return recurrings
      .filter((r) => isRecurringActiveInMonth(r, selectedMonth, selectedYear))
      .filter((r) => !r.isPaused && !r.isPaidCurrentMonth && r.type === 'income')
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

      // Se a conta atual já tinha registro neste mês, ele passa para a nova conta
      const existing = allRecurringMonthRecords.find(
        (m) => m.recurringId === id && m.month === selectedMonth && m.year === selectedYear
      );
      const newMonthRecord: RecurringMonthRecord | null = existing
        ? {
            ...existing,
            id: `${newRec.id}-${selectedYear}-${selectedMonth}`,
            recurringId: newRec.id,
            amount: newAmount,
            updatedAt: new Date().toISOString(),
          }
        : null;
      const linkedTx =
        existing?.isPaid && existing.transactionId
          ? allTransactions.find((t) => t.id === existing.transactionId)
          : undefined;
      const updatedTx = linkedTx ? { ...linkedTx, amount: newAmount } : null;

      // Gravações locais com desfazer: se qualquer etapa falhar, nada fica pela metade
      // (a conta nunca some nem fica duplicada). A conta antiga é encerrada por último.
      const steps: RollbackStep[] = [
        { run: () => RecurringRepository.add(newRec), undo: () => RecurringRepository.delete(newRec.id) },
      ];
      if (existing && newMonthRecord) {
        steps.push(
          {
            run: () => RecurringMonthRepository.upsert(newMonthRecord),
            undo: () => RecurringMonthRepository.deleteByIds([newMonthRecord.id]),
          },
          {
            run: () => RecurringMonthRepository.deleteByIds([existing.id]),
            undo: () => RecurringMonthRepository.upsert(existing),
          }
        );
      }
      if (linkedTx && updatedTx) {
        steps.push({
          run: () => TransactionRepository.update(updatedTx),
          undo: () => TransactionRepository.update(linkedTx),
        });
      }
      steps.push({
        run: () => RecurringRepository.update(updatedOldRec),
        undo: () => RecurringRepository.update(target),
      });
      await runWithRollback(steps);

      const [recs, months, txs] = await Promise.all([
        RecurringRepository.getAll(),
        RecurringMonthRepository.getAll(),
        TransactionRepository.getAll(),
      ]);
      setAllRecurrings(recs);
      setAllRecurringMonthRecords(months);
      setAllTransactions(txs);

      // Nuvem: a nova conta antes do registro do mês (chave estrangeira)
      await CloudSyncService.autoUpsertRecurring(newRec);
      if (existing && newMonthRecord) {
        await CloudSyncService.autoUpsertRecurringMonthRecord(newMonthRecord);
        await CloudSyncService.autoDeleteRecurringMonthRecord(existing.id);
      }
      if (updatedTx) {
        await CloudSyncService.autoUpsertTransaction(updatedTx);
      }
      await CloudSyncService.autoUpsertRecurring(updatedOldRec);
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

    const steps: RollbackStep[] = [];
    let createdTx: Transaction | null = null;
    let removedTxId: string | null = null;
    const authorName = user?.name || user?.email?.split('@')[0] || 'Você';

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
        paidBy: authorName,
        isRecurringGenerated: true,
        updatedAt: new Date().toISOString(),
      };
      createdTx = newTx;
      transactionId = newTx.id;
      steps.push({
        run: () => TransactionRepository.add(newTx),
        undo: () => TransactionRepository.delete(newTx.id),
      });
    } else if (transactionId) {
      // Unmarking paid: delete linked transaction from Extrato
      const txIdToRemove = transactionId;
      const previousTx = allTransactions.find((t) => t.id === txIdToRemove);
      removedTxId = txIdToRemove;
      transactionId = undefined;
      steps.push({
        run: () => TransactionRepository.delete(txIdToRemove),
        undo: () => (previousTx ? TransactionRepository.add(previousTx) : Promise.resolve()),
      });
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
      paidBy: newIsPaid ? authorName : undefined,
      transactionId,
      updatedAt: new Date().toISOString(),
    };
    steps.push({
      run: () => RecurringMonthRepository.upsert(monthRecord),
      undo: () =>
        existing ? RecurringMonthRepository.upsert(existing) : RecurringMonthRepository.deleteByIds([monthRecord.id]),
    });

    // Transação e registro do mês mudam juntos: se o registro falhar, a transação é desfeita
    await runWithRollback(steps);

    const [txs, months] = await Promise.all([TransactionRepository.getAll(), RecurringMonthRepository.getAll()]);
    setAllTransactions(txs);
    setAllRecurringMonthRecords(months);

    if (createdTx) await CloudSyncService.autoUpsertTransaction(createdTx);
    if (removedTxId) await CloudSyncService.autoDeleteTransaction(removedTxId);
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


  const deleteRecurring = async (id: string, scope: DeleteRecurringScope = 'all') => {
    const target = allRecurrings.find((r) => r.id === id);
    if (!target) return;

    const ym = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}`;

    // Registro do mês selecionado (se estava pago, a transação vinculada sai do Extrato)
    const existingIndex = allRecurringMonthRecords.findIndex(
      (m) => m.recurringId === id && m.month === selectedMonth && m.year === selectedYear
    );
    const existingMonthRecord = existingIndex >= 0 ? allRecurringMonthRecords[existingIndex] : null;
    const linkedTxId = existingMonthRecord?.transactionId;
    const linkedTx = linkedTxId ? allTransactions.find((t) => t.id === linkedTxId) : undefined;

    const steps: RollbackStep[] = [];
    let updatedTarget: RecurringDebit | null = null;
    let removedMonthRecords: RecurringMonthRecord[] = [];

    if (scope === 'month') {
      // 1. Exclui apenas da competência selecionada
      const currentExcluded = target.excludedMonths || [];
      updatedTarget = {
        ...target,
        excludedMonths: Array.from(new Set([...currentExcluded, ym])),
        updatedAt: new Date().toISOString(),
      };
      removedMonthRecords = existingMonthRecord ? [existingMonthRecord] : [];
    } else if (scope === 'forward') {
      // 2. Desta competência em diante: encerra vigência no mês anterior
      let prevYear = selectedYear;
      let prevMonth = selectedMonth - 1;
      if (prevMonth < 1) {
        prevMonth = 12;
        prevYear -= 1;
      }
      updatedTarget = {
        ...target,
        endDate: `${prevYear}-${String(prevMonth).padStart(2, '0')}`,
        updatedAt: new Date().toISOString(),
      };
      removedMonthRecords = allRecurringMonthRecords.filter(
        (m) => m.recurringId === id && `${m.year}-${String(m.month).padStart(2, '0')}` >= ym
      );
    } else {
      // 3. De todos os meses (Definitivo)
      removedMonthRecords = allRecurringMonthRecords.filter((m) => m.recurringId === id);
    }

    const removedIds = removedMonthRecords.map((m) => m.id);
    if (updatedTarget) {
      const newTarget = updatedTarget;
      steps.push({ run: () => RecurringRepository.update(newTarget), undo: () => RecurringRepository.update(target) });
    } else {
      steps.push({ run: () => RecurringRepository.delete(id), undo: () => RecurringRepository.add(target) });
    }
    if (removedIds.length > 0) {
      steps.push({
        run: () => RecurringMonthRepository.deleteByIds(removedIds),
        undo: () =>
          RecurringMonthRepository.mutate((all) => [
            ...removedMonthRecords.filter((m) => !all.some((a) => a.id === m.id)),
            ...all,
          ]),
      });
    }
    // A transação do Extrato sai por último: se algo falhar antes, nada é apagado
    if (linkedTxId) {
      steps.push({
        run: () => TransactionRepository.delete(linkedTxId),
        undo: () => (linkedTx ? TransactionRepository.add(linkedTx) : Promise.resolve()),
      });
    }
    await runWithRollback(steps);

    const [recs, months, txs] = await Promise.all([
      RecurringRepository.getAll(),
      RecurringMonthRepository.getAll(),
      TransactionRepository.getAll(),
    ]);
    setAllRecurrings(recs);
    setAllRecurringMonthRecords(months);
    setAllTransactions(txs);

    if (updatedTarget) {
      await CloudSyncService.autoUpsertRecurring(updatedTarget);
    } else {
      await CloudSyncService.autoDeleteRecurring(id);
    }
    for (const monthRecordId of removedIds) {
      await CloudSyncService.autoDeleteRecurringMonthRecord(monthRecordId);
    }
    if (linkedTxId) {
      await CloudSyncService.autoDeleteTransaction(linkedTxId);
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

  // Aporte (deposit) ou resgate (withdraw): meta e transação mudam juntas.
  // Se a transação falhar, o valor da meta volta ao que era (evita aporte em dobro ao tentar de novo).
  const moveGoalAmount = async (
    id: string,
    amount: number,
    mode: 'deposit' | 'withdraw',
    createTransaction: boolean
  ) => {
    const previousGoal = allGoals.find((g) => g.id === id);
    if (!previousGoal) return;

    const steps: RollbackStep[] = [
      {
        run: () => (mode === 'deposit' ? GoalRepository.deposit(id, amount) : GoalRepository.withdraw(id, amount)),
        undo: () => GoalRepository.mutate((all) => all.map((g) => (g.id === id ? previousGoal : g))),
      },
    ];

    const authorName = user?.name || user?.email?.split('@')[0] || 'Você';
    const nowIso = new Date().toISOString();
    const goalTx: GoalTransaction = {
      id: `gtx-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      goalId: id,
      workspaceId: activeWorkspace.id,
      amount,
      type: mode,
      date: nowIso,
      createdBy: authorName,
      notes: mode === 'deposit' ? `Aporte na meta "${previousGoal.title}"` : `Resgate da meta "${previousGoal.title}"`,
      updatedAt: nowIso,
    };
    steps.push({
      run: () => GoalTransactionRepository.add(goalTx),
      undo: () => GoalTransactionRepository.delete(goalTx.id),
    });

    let tx: Transaction | null = null;
    if (createTransaction) {
      const today = new Date();
      const txDate = new Date(selectedYear, selectedMonth - 1, Math.min(today.getDate(), 28), 12, 0, 0).toISOString();
      tx =
        mode === 'deposit'
          ? {
              id: `tx-goal-dep-${Date.now()}`,
              workspaceId: activeWorkspace.id,
              title: `Aporte: ${previousGoal.title}`,
              amount,
              type: 'expense',
              category: 'Economia',
              date: txDate,
              notes: `Aporte na meta financeira "${previousGoal.title}"`,
              paidBy: authorName,
              updatedAt: nowIso,
            }
          : {
              id: `tx-goal-wth-${Date.now()}`,
              workspaceId: activeWorkspace.id,
              title: `Resgate: ${previousGoal.title}`,
              amount,
              type: 'income',
              category: 'Economia',
              date: txDate,
              notes: `Resgate da meta financeira "${previousGoal.title}"`,
              paidBy: authorName,
              updatedAt: nowIso,
            };
      const newTx = tx;
      steps.push({ run: () => TransactionRepository.add(newTx), undo: () => TransactionRepository.delete(newTx.id) });
    }

    await runWithRollback(steps);

    const [goals, txs, gtxs] = await Promise.all([
      GoalRepository.getAll(),
      TransactionRepository.getAll(),
      GoalTransactionRepository.getAll(),
    ]);
    setAllGoals(goals);
    setAllTransactions(txs);
    setAllGoalTransactions(gtxs);

    const item = goals.find((g) => g.id === id);
    if (item) await CloudSyncService.autoUpsertGoal(item);
    if (tx) await CloudSyncService.autoUpsertTransaction(tx);
    await CloudSyncService.autoUpsertGoalTransaction(goalTx);
  };

  const depositGoal = (id: string, amount: number, createTransaction: boolean = true) =>
    moveGoalAmount(id, amount, 'deposit', createTransaction);

  const withdrawGoal = (id: string, amount: number, createTransaction: boolean = true) =>
    moveGoalAmount(id, amount, 'withdraw', createTransaction);

  const deleteGoal = async (id: string) => {
    await GoalTransactionRepository.deleteByGoalId(id);
    const [updatedGoals, updatedGtxs] = await Promise.all([
      GoalRepository.delete(id),
      GoalTransactionRepository.getAll(),
    ]);
    setAllGoals(updatedGoals);
    setAllGoalTransactions(updatedGtxs);
    // Persist immediately to Supabase
    await CloudSyncService.autoDeleteGoal(id);
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
        goalTransactions,
        getGoalTransactions,
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
        deleteRecurring,
        saveBudget,
        deleteBudget,
        addGoal,
        updateGoal,
        depositGoal,
        withdrawGoal,
        deleteGoal,
        reloadAll,
        isFinanceReady,
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
