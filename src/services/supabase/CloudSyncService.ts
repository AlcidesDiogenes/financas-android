import { SupabaseService } from './supabaseClient';
import { TransactionRepository } from '../../modules/transactions/repository';
import { RecurringRepository } from '../../modules/recurrings/repository';
import { RecurringMonthRepository } from '../../modules/recurrings/monthRepository';
import { BudgetRepository } from '../../modules/budgets/repository';
import { GoalRepository } from '../../modules/goals/repository';
import { WorkspaceRepository } from '../../modules/workspaces/repository';
import { Transaction } from '../../modules/transactions/types';
import { RecurringDebit, RecurringMonthRecord } from '../../modules/recurrings/types';
import { Budget } from '../../modules/budgets/types';
import { Goal } from '../../modules/goals/types';

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

  // Background single-item automatic mutations (only if authenticated)
  static async autoUpsertTransaction(t: Transaction): Promise<void> {
    try {
      const auth = await this.getAuthenticatedClient();
      if (!auth) return;
      await auth.client.from('transactions').upsert({
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
      const auth = await this.getAuthenticatedClient();
      if (!auth) return;
      await auth.client.from('transactions').delete().eq('id', id);
    } catch {}
  }

  static async autoUpsertRecurring(r: RecurringDebit): Promise<void> {
    try {
      const auth = await this.getAuthenticatedClient();
      if (!auth) return;
      await auth.client.from('recurrings').upsert({
        id: r.id,
        workspace_id: r.workspaceId,
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
        notes: r.notes,
      });
    } catch {}
  }

  static async autoDeleteRecurring(id: string): Promise<void> {
    try {
      const auth = await this.getAuthenticatedClient();
      if (!auth) return;
      await auth.client.from('recurrings').delete().eq('id', id);
    } catch {}
  }

  static async autoUpsertRecurringMonthRecord(rec: RecurringMonthRecord): Promise<void> {
    try {
      const auth = await this.getAuthenticatedClient();
      if (!auth) return;
      await auth.client.from('recurring_month_records').upsert({
        id: rec.id,
        recurring_id: rec.recurringId,
        workspace_id: rec.workspaceId,
        month: rec.month,
        year: rec.year,
        amount: rec.amount,
        is_paid: rec.isPaid,
        paid_at: rec.paidAt || null,
        transaction_id: rec.transactionId || null,
      });
    } catch {}
  }

  static async autoDeleteRecurringMonthRecord(id: string): Promise<void> {
    try {
      const auth = await this.getAuthenticatedClient();
      if (!auth) return;
      await auth.client.from('recurring_month_records').delete().eq('id', id);
    } catch {}
  }

  static async autoUpsertBudget(b: Budget): Promise<void> {
    try {
      const auth = await this.getAuthenticatedClient();
      if (!auth) return;
      await auth.client.from('budgets').upsert({
        id: b.id,
        workspace_id: b.workspaceId,
        category: b.category,
        limit_amount: b.limitAmount,
        month: b.month,
        year: b.year,
        start_date: b.startDate || null,
        end_date: b.endDate || null,
      });
    } catch {}
  }

  static async autoDeleteBudget(id: string): Promise<void> {
    try {
      const auth = await this.getAuthenticatedClient();
      if (!auth) return;
      await auth.client.from('budgets').delete().eq('id', id);
    } catch {}
  }

  static async autoUpsertGoal(g: Goal): Promise<void> {
    try {
      const auth = await this.getAuthenticatedClient();
      if (!auth) return;
      await auth.client.from('goals').upsert({
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
      const auth = await this.getAuthenticatedClient();
      if (!auth) return;
      await auth.client.from('goals').delete().eq('id', id);
    } catch {}
  }

  static async syncLocalToCloud(): Promise<{ success: boolean; message: string }> {
    try {
      const auth = await this.getAuthenticatedClient();
      if (!auth) {
        return { success: false, message: 'Nenhuma conta conectada. Sincronização offline desabilitada.' };
      }

      const client = auth.client;
      const [workspaces, transactions, recurrings, monthRecords, budgets, goals] = await Promise.all([
        WorkspaceRepository.getWorkspaces(),
        TransactionRepository.getAll(),
        RecurringRepository.getAll(),
        RecurringMonthRepository.getAll(),
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
            type: r.type || 'expense',
            category: r.category,
            frequency: r.frequency,
            due_day: r.dueDay,
            is_paid_current_month: r.isPaidCurrentMonth,
            reminder_enabled: r.reminderEnabled,
            assigned_to: r.assignedTo || null,
            start_date: r.startDate || null,
            end_date: r.endDate || null,
            notes: r.notes,
          }))
        );
      }

      if (monthRecords.length > 0) {
        await client.from('recurring_month_records').upsert(
          monthRecords.map((m) => ({
            id: m.id,
            recurring_id: m.recurringId,
            workspace_id: m.workspaceId,
            month: m.month,
            year: m.year,
            amount: m.amount,
            is_paid: m.isPaid,
            paid_at: m.paidAt || null,
            transaction_id: m.transactionId || null,
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
            start_date: b.startDate || null,
            end_date: b.endDate || null,
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
      const auth = await this.getAuthenticatedClient();
      if (!auth) {
        return { success: false, message: 'Nenhuma conta conectada. Sincronização offline desabilitada.' };
      }

      const client = auth.client;
      const user = auth.user;
      const userEmail = user.email?.toLowerCase().trim() || '';

      // Identifica os workspaces dos quais este usuário tem permissão/membro
      let memberWorkspaceIds: string[] = [];
      try {
        const { data: memberRows, error: memberErr } = await client
          .from('workspace_members')
          .select('workspace_id')
          .eq('email', userEmail);
        if (!memberErr && memberRows) {
          memberWorkspaceIds = memberRows.map((m) => m.workspace_id);
        }
      } catch {
        // Se a tabela workspace_members ainda não foi criada no Supabase, continua normalmente
      }

      const personalWsId = `ws-${user.id}`;
      const allowedWorkspaceIds = Array.from(new Set([...memberWorkspaceIds, personalWsId, 'ws-solo']));

      const [txRes, recRes, recMonthRes, bdgRes, goalRes] = await Promise.all([
        client.from('transactions').select('*').in('workspace_id', allowedWorkspaceIds),
        client.from('recurrings').select('*').in('workspace_id', allowedWorkspaceIds),
        client.from('recurring_month_records').select('*').in('workspace_id', allowedWorkspaceIds),
        client.from('budgets').select('*').in('workspace_id', allowedWorkspaceIds),
        client.from('goals').select('*').in('workspace_id', allowedWorkspaceIds),
      ]);

      if (Array.isArray(txRes.data)) {
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

      if (Array.isArray(recRes.data)) {
        await RecurringRepository.saveAll(
          recRes.data.map((row) => ({
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
            assignedTo: row.assigned_to,
            startDate: row.start_date,
            endDate: row.end_date,
            notes: row.notes,
            createdAt: row.created_at,
          }))
        );
      }

      if (Array.isArray(recMonthRes.data)) {
        await RecurringMonthRepository.saveAll(
          recMonthRes.data.map((row) => ({
            id: row.id,
            recurringId: row.recurring_id,
            workspaceId: row.workspace_id,
            month: row.month,
            year: row.year,
            amount: parseFloat(row.amount),
            isPaid: row.is_paid,
            paidAt: row.paid_at,
            transactionId: row.transaction_id,
          }))
        );
      }

      if (Array.isArray(bdgRes.data)) {
        await BudgetRepository.saveAll(
          bdgRes.data.map((row) => ({
            id: row.id,
            workspaceId: row.workspace_id,
            category: row.category,
            limitAmount: parseFloat(row.limit_amount),
            month: row.month,
            year: row.year,
            startDate: row.start_date,
            endDate: row.end_date,
          }))
        );
      }

      if (Array.isArray(goalRes.data)) {
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
