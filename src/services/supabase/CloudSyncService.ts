import { SupabaseService } from './supabaseClient';
import { TransactionRepository } from '../../modules/transactions/repository';
import { RecurringRepository } from '../../modules/recurrings/repository';
import { BudgetRepository } from '../../modules/budgets/repository';
import { GoalRepository } from '../../modules/goals/repository';
import { WorkspaceRepository } from '../../modules/workspaces/repository';
import { Transaction } from '../../modules/transactions/types';
import { RecurringDebit } from '../../modules/recurrings/types';
import { Budget } from '../../modules/budgets/types';
import { Goal } from '../../modules/goals/types';

export class CloudSyncService {
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

  // Background single-item automatic mutations
  static async autoUpsertTransaction(t: Transaction): Promise<void> {
    try {
      const client = await SupabaseService.getClient();
      await client.from('transactions').upsert({
        id: t.id,
        workspace_id: t.workspaceId,
        title: t.title,
        amount: t.amount,
        type: t.type,
        category: t.category,
        date: t.date,
        notes: t.notes,
        created_by: t.createdBy,
      });
    } catch {}
  }

  static async autoDeleteTransaction(id: string): Promise<void> {
    try {
      const client = await SupabaseService.getClient();
      await client.from('transactions').delete().eq('id', id);
    } catch {}
  }

  static async autoUpsertRecurring(r: RecurringDebit): Promise<void> {
    try {
      const client = await SupabaseService.getClient();
      await client.from('recurrings').upsert({
        id: r.id,
        workspace_id: r.workspaceId,
        title: r.title,
        amount: r.amount,
        category: r.category,
        frequency: r.frequency,
        due_day: r.dueDay,
        is_paid_current_month: r.isPaidCurrentMonth,
        reminder_enabled: r.reminderEnabled,
        notes: r.notes,
      });
    } catch {}
  }

  static async autoDeleteRecurring(id: string): Promise<void> {
    try {
      const client = await SupabaseService.getClient();
      await client.from('recurrings').delete().eq('id', id);
    } catch {}
  }

  static async autoUpsertBudget(b: Budget): Promise<void> {
    try {
      const client = await SupabaseService.getClient();
      await client.from('budgets').upsert({
        id: b.id,
        workspace_id: b.workspaceId,
        category: b.category,
        limit_amount: b.limitAmount,
        month: b.month,
        year: b.year,
      });
    } catch {}
  }

  static async autoDeleteBudget(id: string): Promise<void> {
    try {
      const client = await SupabaseService.getClient();
      await client.from('budgets').delete().eq('id', id);
    } catch {}
  }

  static async autoUpsertGoal(g: Goal): Promise<void> {
    try {
      const client = await SupabaseService.getClient();
      await client.from('goals').upsert({
        id: g.id,
        workspace_id: g.workspaceId,
        title: g.title,
        target_amount: g.targetAmount,
        current_amount: g.currentAmount,
        deadline_date: g.deadlineDate,
        icon: g.icon,
        color: g.color,
        notes: g.notes,
      });
    } catch {}
  }

  static async autoDeleteGoal(id: string): Promise<void> {
    try {
      const client = await SupabaseService.getClient();
      await client.from('goals').delete().eq('id', id);
    } catch {}
  }

  static async syncLocalToCloud(): Promise<{ success: boolean; message: string }> {
    try {
      const client = await SupabaseService.getClient();
      const [workspaces, transactions, recurrings, budgets, goals] = await Promise.all([
        WorkspaceRepository.getWorkspaces(),
        TransactionRepository.getAll(),
        RecurringRepository.getAll(),
        BudgetRepository.getAll(),
        GoalRepository.getAll(),
      ]);

      if (workspaces.length > 0) {
        await client.from('workspaces').upsert(
          workspaces.map((w) => ({
            id: w.id,
            name: w.name,
            description: w.description,
            type: w.type,
            invite_code: w.inviteCode,
            created_at: w.createdAt,
          }))
        );
      }

      if (transactions.length > 0) {
        await client.from('transactions').upsert(
          transactions.map((t) => ({
            id: t.id,
            workspace_id: t.workspaceId,
            title: t.title,
            amount: t.amount,
            type: t.type,
            category: t.category,
            date: t.date,
            notes: t.notes,
            created_by: t.createdBy,
          }))
        );
      }

      if (recurrings.length > 0) {
        await client.from('recurrings').upsert(
          recurrings.map((r) => ({
            id: r.id,
            workspace_id: r.workspaceId,
            title: r.title,
            amount: r.amount,
            category: r.category,
            frequency: r.frequency,
            due_day: r.dueDay,
            is_paid_current_month: r.isPaidCurrentMonth,
            reminder_enabled: r.reminderEnabled,
            notes: r.notes,
          }))
        );
      }

      if (budgets.length > 0) {
        await client.from('budgets').upsert(
          budgets.map((b) => ({
            id: b.id,
            workspace_id: b.workspaceId,
            category: b.category,
            limit_amount: b.limitAmount,
            month: b.month,
            year: b.year,
          }))
        );
      }

      if (goals.length > 0) {
        await client.from('goals').upsert(
          goals.map((g) => ({
            id: g.id,
            workspace_id: g.workspaceId,
            title: g.title,
            target_amount: g.targetAmount,
            current_amount: g.currentAmount,
            deadline_date: g.deadlineDate,
            icon: g.icon,
            color: g.color,
            notes: g.notes,
          }))
        );
      }

      return {
        success: true,
        message: 'Nuvem sincronizada com sucesso!',
      };
    } catch (e: any) {
      return { success: false, message: `Erro ao sincronizar: ${e?.message}` };
    }
  }

  static async syncCloudToLocal(): Promise<{ success: boolean; message: string }> {
    try {
      const client = await SupabaseService.getClient();
      const [txRes, recRes, bdgRes, goalRes] = await Promise.all([
        client.from('transactions').select('*'),
        client.from('recurrings').select('*'),
        client.from('budgets').select('*'),
        client.from('goals').select('*'),
      ]);

      if (txRes.data && txRes.data.length > 0) {
        await TransactionRepository.saveAll(
          txRes.data.map((row) => ({
            id: row.id,
            workspaceId: row.workspace_id,
            title: row.title,
            amount: parseFloat(row.amount),
            type: row.type,
            category: row.category,
            date: row.date,
            notes: row.notes,
            createdBy: row.created_by,
          }))
        );
      }

      if (recRes.data && recRes.data.length > 0) {
        await RecurringRepository.saveAll(
          recRes.data.map((row) => ({
            id: row.id,
            workspaceId: row.workspace_id,
            title: row.title,
            amount: parseFloat(row.amount),
            category: row.category,
            frequency: row.frequency,
            dueDay: row.due_day,
            isPaidCurrentMonth: row.is_paid_current_month,
            reminderEnabled: row.reminder_enabled,
            notes: row.notes,
            createdAt: row.created_at,
          }))
        );
      }

      if (bdgRes.data && bdgRes.data.length > 0) {
        await BudgetRepository.saveAll(
          bdgRes.data.map((row) => ({
            id: row.id,
            workspaceId: row.workspace_id,
            category: row.category,
            limitAmount: parseFloat(row.limit_amount),
            month: row.month,
            year: row.year,
          }))
        );
      }

      if (goalRes.data && goalRes.data.length > 0) {
        await GoalRepository.saveAll(
          goalRes.data.map((row) => ({
            id: row.id,
            workspaceId: row.workspace_id,
            title: row.title,
            targetAmount: parseFloat(row.target_amount),
            currentAmount: parseFloat(row.current_amount),
            deadlineDate: row.deadline_date,
            icon: row.icon,
            color: row.color,
            notes: row.notes,
            createdAt: row.created_at,
          }))
        );
      }

      return {
        success: true,
        message: 'Dados baixados e atualizados!',
      };
    } catch (e: any) {
      return { success: false, message: `Erro ao baixar da nuvem: ${e?.message}` };
    }
  }
}
