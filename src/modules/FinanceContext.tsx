import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import { useWorkspace } from './workspaces/WorkspaceContext';
import { Transaction, MonthlySummary } from './transactions/types';
import { TransactionRepository } from './transactions/repository';
import { RecurringDebit } from './recurrings/types';
import { RecurringRepository } from './recurrings/repository';
import { Budget, BudgetProgress } from './budgets/types';
import { BudgetRepository } from './budgets/repository';
import { Goal, GoalProgress } from './goals/types';
import { GoalRepository } from './goals/repository';
import { CloudSyncService } from '../services/supabase/CloudSyncService';
import { SupabaseService } from '../services/supabase/supabaseClient';
import { getCurrentMonthYear } from '../core/utils/date';

interface FinanceContextType {
  // Data filtered for active workspace
  transactions: Transaction[];
  recurrings: RecurringDebit[];
  budgets: Budget[];
  budgetProgressList: BudgetProgress[];
  goals: Goal[];
  goalProgressList: GoalProgress[];
  monthlySummary: MonthlySummary;
  projectedExpense: number;
  projectedBalance: number;

  // Selected period
  selectedMonth: number;
  selectedYear: number;
  setSelectedPeriod: (month: number, year: number) => void;

  // Actions with automatic background cloud sync
  addTransaction: (tx: Omit<Transaction, 'id' | 'workspaceId'>) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;
  addRecurring: (rec: Omit<RecurringDebit, 'id' | 'workspaceId' | 'isPaidCurrentMonth' | 'createdAt'>) => Promise<void>;
  toggleRecurringPaid: (id: string) => Promise<void>;
  deleteRecurring: (id: string) => Promise<void>;
  saveBudget: (category: Budget['category'], limitAmount: number) => Promise<void>;
  deleteBudget: (id: string) => Promise<void>;
  addGoal: (goal: Omit<Goal, 'id' | 'workspaceId' | 'currentAmount' | 'createdAt'>, initialAmount?: number) => Promise<void>;
  depositGoal: (id: string, amount: number) => Promise<void>;
  deleteGoal: (id: string) => Promise<void>;
  reloadAll: () => Promise<void>;
  wipeAllData: () => Promise<void>;
}

const FinanceContext = createContext<FinanceContextType | undefined>(undefined);

export const FinanceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { activeWorkspace } = useWorkspace();
  const currentPeriod = useMemo(() => getCurrentMonthYear(), []);

  const [selectedMonth, setSelectedMonth] = useState<number>(currentPeriod.month);
  const [selectedYear, setSelectedYear] = useState<number>(currentPeriod.year);

  const [allTransactions, setAllTransactions] = useState<Transaction[]>([]);
  const [allRecurrings, setAllRecurrings] = useState<RecurringDebit[]>([]);
  const [allBudgets, setAllBudgets] = useState<Budget[]>([]);
  const [allGoals, setAllGoals] = useState<Goal[]>([]);

  const reloadAll = async () => {
    // 1. Instant local load
    const [t, r, b, g] = await Promise.all([
      TransactionRepository.getAll(),
      RecurringRepository.getAll(),
      BudgetRepository.getAll(),
      GoalRepository.getAll(),
    ]);
    setAllTransactions(t);
    setAllRecurrings(r);
    setAllBudgets(b);
    setAllGoals(g);

    // 2. Background cloud pull
    CloudSyncService.syncCloudToLocal().then(async (res) => {
      if (res.success) {
        const [freshT, freshR, freshB, freshG] = await Promise.all([
          TransactionRepository.getAll(),
          RecurringRepository.getAll(),
          BudgetRepository.getAll(),
          GoalRepository.getAll(),
        ]);
        setAllTransactions(freshT);
        setAllRecurrings(freshR);
        setAllBudgets(freshB);
        setAllGoals(freshG);
      }
    }).catch(() => {});
  };

  useEffect(() => {
    reloadAll();
  }, []);

  // Filter by active workspace
  const workspaceTransactions = useMemo(
    () => allTransactions.filter((t) => t.workspaceId === activeWorkspace.id),
    [allTransactions, activeWorkspace.id]
  );

  const recurrings = useMemo(
    () => allRecurrings.filter((r) => r.workspaceId === activeWorkspace.id),
    [allRecurrings, activeWorkspace.id]
  );

  const budgets = useMemo(
    () => allBudgets.filter((b) => b.workspaceId === activeWorkspace.id),
    [allBudgets, activeWorkspace.id]
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

    monthTransactions.forEach((t) => {
      if (t.type === 'income') {
        income += t.amount;
      } else {
        expense += t.amount;
      }
    });

    const balance = income - expense;
    const savingsRate = income > 0 ? Math.max(0, Math.round((balance / income) * 100)) : 0;

    return {
      totalIncome: income,
      totalExpense: expense,
      balance,
      savingsRate,
    };
  }, [monthTransactions]);

  // Recurring calculations
  const pendingRecurringAmount = useMemo(() => {
    return recurrings
      .filter((r) => !r.isPaidCurrentMonth)
      .reduce((sum, r) => sum + r.amount, 0);
  }, [recurrings]);

  const projectedExpense = monthlySummary.totalExpense + pendingRecurringAmount;
  const projectedBalance = monthlySummary.totalIncome - projectedExpense;

  // Budget progress against current month expenses
  const budgetProgressList: BudgetProgress[] = useMemo(() => {
    return budgets.map((b) => {
      const spent = monthTransactions
        .filter((t) => t.type === 'expense' && t.category === b.category)
        .reduce((sum, t) => sum + t.amount, 0);

      const remaining = b.limitAmount - spent;
      const percentage = b.limitAmount > 0 ? (spent / b.limitAmount) * 100 : 0;

      return {
        budget: b,
        spent,
        remaining,
        percentage,
        isExceeded: spent >= b.limitAmount,
        isWarning: percentage >= 80 && spent < b.limitAmount,
      };
    });
  }, [budgets, monthTransactions]);

  // Goal progress
  const goalProgressList: GoalProgress[] = useMemo(() => {
    return goals.map((g) => {
      const percentage =
        g.targetAmount > 0
          ? Math.min(100, Math.round((g.currentAmount / g.targetAmount) * 100))
          : 0;
      const remainingAmount = Math.max(0, g.targetAmount - g.currentAmount);

      return {
        goal: g,
        percentage,
        remainingAmount,
        isCompleted: g.currentAmount >= g.targetAmount,
      };
    });
  }, [goals]);

  // Actions with automatic background synchronization
  const setSelectedPeriod = (month: number, year: number) => {
    setSelectedMonth(month);
    setSelectedYear(year);
  };

  const addTransaction = async (tx: Omit<Transaction, 'id' | 'workspaceId'>) => {
    const newTx: Transaction = {
      ...tx,
      id: `tx-${Date.now()}`,
      workspaceId: activeWorkspace.id,
    };
    const updated = await TransactionRepository.add(newTx);
    setAllTransactions(updated);
    // Background cloud sync
    CloudSyncService.autoUpsertTransaction(newTx);
  };

  const deleteTransaction = async (id: string) => {
    const updated = await TransactionRepository.delete(id);
    setAllTransactions(updated);
    // Background cloud sync
    CloudSyncService.autoDeleteTransaction(id);
  };

  const addRecurring = async (
    rec: Omit<RecurringDebit, 'id' | 'workspaceId' | 'isPaidCurrentMonth' | 'createdAt'>
  ) => {
    const newRec: RecurringDebit = {
      ...rec,
      id: `rec-${Date.now()}`,
      workspaceId: activeWorkspace.id,
      isPaidCurrentMonth: false,
      createdAt: new Date().toISOString(),
    };
    const updated = await RecurringRepository.add(newRec);
    setAllRecurrings(updated);
    // Background cloud sync
    CloudSyncService.autoUpsertRecurring(newRec);
  };

  const toggleRecurringPaid = async (id: string) => {
    const updated = await RecurringRepository.togglePaid(id);
    setAllRecurrings(updated);
    const item = updated.find((r) => r.id === id);
    if (item) {
      CloudSyncService.autoUpsertRecurring(item);
    }
  };

  const deleteRecurring = async (id: string) => {
    const updated = await RecurringRepository.delete(id);
    setAllRecurrings(updated);
    // Background cloud sync
    CloudSyncService.autoDeleteRecurring(id);
  };

  const saveBudget = async (category: Budget['category'], limitAmount: number) => {
    const newBudget: Budget = {
      id: `bdg-${category}-${selectedMonth}-${selectedYear}`,
      workspaceId: activeWorkspace.id,
      category,
      limitAmount,
      month: selectedMonth,
      year: selectedYear,
    };
    const updated = await BudgetRepository.addOrUpdate(newBudget);
    setAllBudgets(updated);
    // Background cloud sync
    CloudSyncService.autoUpsertBudget(newBudget);
  };

  const deleteBudget = async (id: string) => {
    const updated = await BudgetRepository.delete(id);
    setAllBudgets(updated);
    // Background cloud sync
    CloudSyncService.autoDeleteBudget(id);
  };

  const addGoal = async (
    goal: Omit<Goal, 'id' | 'workspaceId' | 'currentAmount' | 'createdAt'>,
    initialAmount = 0
  ) => {
    const newGoal: Goal = {
      ...goal,
      id: `goal-${Date.now()}`,
      workspaceId: activeWorkspace.id,
      currentAmount: initialAmount,
      createdAt: new Date().toISOString(),
    };
    const updated = await GoalRepository.add(newGoal);
    setAllGoals(updated);
    // Background cloud sync
    CloudSyncService.autoUpsertGoal(newGoal);
  };

  const depositGoal = async (id: string, amount: number) => {
    const updated = await GoalRepository.deposit(id, amount);
    setAllGoals(updated);
    const item = updated.find((g) => g.id === id);
    if (item) {
      CloudSyncService.autoUpsertGoal(item);
    }
  };

  const deleteGoal = async (id: string) => {
    const updated = await GoalRepository.delete(id);
    setAllGoals(updated);
    // Background cloud sync
    CloudSyncService.autoDeleteGoal(id);
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
        recurrings,
        budgets,
        budgetProgressList,
        goals,
        goalProgressList,
        monthlySummary,
        projectedExpense,
        projectedBalance,
        selectedMonth,
        selectedYear,
        setSelectedPeriod,
        addTransaction,
        deleteTransaction,
        addRecurring,
        toggleRecurringPaid,
        deleteRecurring,
        saveBudget,
        deleteBudget,
        addGoal,
        depositGoal,
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
