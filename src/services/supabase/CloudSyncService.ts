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

  // Helper seguro para tentar upsert com updated_at e fallback sem updated_at se a coluna ainda não existir
  private static async safeUpsert(client: any, table: string, recordWithUpdated: any, recordWithoutUpdated: any) {
    try {
      const { error } = await client.from(table).upsert(recordWithUpdated);
      if (error) {
        await client.from(table).upsert(recordWithoutUpdated);
      }
    } catch {
      try {
        await client.from(table).upsert(recordWithoutUpdated);
      } catch {}
    }
  }

  // Background single-item automatic mutations (only if authenticated)
  static async autoUpsertTransaction(t: Transaction): Promise<void> {
    try {
      const auth = await this.getAuthenticatedClient();
      if (!auth) return;
      const base = {
        id: t.id,
        workspace_id: t.workspaceId,
        title: t.title,
        amount: t.amount,
        type: t.type,
        category: t.category,
        date: t.date,
        notes: t.notes,
        created_by: t.createdBy,
      };
      await this.safeUpsert(auth.client, 'transactions', { ...base, updated_at: t.updatedAt || new Date().toISOString() }, base);
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
      const base = {
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
      };
      await this.safeUpsert(auth.client, 'recurrings', { ...base, updated_at: r.updatedAt || new Date().toISOString() }, base);
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
      const base = {
        id: rec.id,
        recurring_id: rec.recurringId,
        workspace_id: rec.workspaceId,
        month: rec.month,
        year: rec.year,
        amount: rec.amount,
        is_paid: rec.isPaid,
        paid_at: rec.paidAt || null,
        transaction_id: rec.transactionId || null,
      };
      await this.safeUpsert(auth.client, 'recurring_month_records', { ...base, updated_at: rec.updatedAt || new Date().toISOString() }, base);
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
      const base = {
        id: b.id,
        workspace_id: b.workspaceId,
        category: b.category,
        limit_amount: b.limitAmount,
        month: b.month,
        year: b.year,
        start_date: b.startDate || null,
        end_date: b.endDate || null,
      };
      await this.safeUpsert(auth.client, 'budgets', { ...base, updated_at: b.updatedAt || new Date().toISOString() }, base);
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
      const base = {
        id: g.id,
        workspace_id: g.workspaceId,
        title: g.title,
        target_amount: g.targetAmount,
        current_amount: g.currentAmount,
        deadline_date: g.deadlineDate,
        icon: g.icon,
        color: g.color,
        notes: g.notes,
      };
      await this.safeUpsert(auth.client, 'goals', { ...base, updated_at: g.updatedAt || new Date().toISOString() }, base);
    } catch {}
  }

  static async autoDeleteGoal(id: string): Promise<void> {
    try {
      const auth = await this.getAuthenticatedClient();
      if (!auth) return;
      await auth.client.from('goals').delete().eq('id', id);
    } catch {}
  }

  // Consulta sob demanda paginada por período para relatórios de longo prazo
  static async fetchTransactionsByPeriod(
    workspaceId: string,
    startDate: string,
    endDate: string
  ): Promise<Transaction[]> {
    try {
      const auth = await this.getAuthenticatedClient();
      if (!auth) return [];
      const { data, error } = await auth.client
        .from('transactions')
        .select('*')
        .eq('workspace_id', workspaceId)
        .gte('date', startDate)
        .lte('date', endDate)
        .order('date', { ascending: false });

      if (error || !Array.isArray(data)) return [];
      return data.map((row) => ({
        id: row.id,
        workspaceId: row.workspace_id,
        title: row.title,
        amount: parseFloat(row.amount),
        type: row.type,
        category: row.category,
        date: row.date,
        notes: row.notes,
        createdBy: row.created_by,
        updatedAt: row.updated_at || row.created_at || row.date,
      }));
    } catch {
      return [];
    }
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
        const txBase = transactions.map((t) => ({
          id: t.id,
          workspace_id: t.workspaceId,
          title: t.title,
          amount: t.amount,
          type: t.type,
          category: t.category,
          date: t.date,
          notes: t.notes,
          created_by: t.createdBy,
        }));
        const txWithUpdated = transactions.map((t, idx) => ({
          ...txBase[idx],
          updated_at: t.updatedAt || t.date || new Date().toISOString(),
        }));
        await this.safeUpsert(client, 'transactions', txWithUpdated, txBase);
      }

      if (recurrings.length > 0) {
        const recBase = recurrings.map((r) => ({
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
        }));
        const recWithUpdated = recurrings.map((r, idx) => ({
          ...recBase[idx],
          updated_at: r.updatedAt || r.createdAt || new Date().toISOString(),
        }));
        await this.safeUpsert(client, 'recurrings', recWithUpdated, recBase);
      }

      if (monthRecords.length > 0) {
        const mrBase = monthRecords.map((m) => ({
          id: m.id,
          recurring_id: m.recurringId,
          workspace_id: m.workspaceId,
          month: m.month,
          year: m.year,
          amount: m.amount,
          is_paid: m.isPaid,
          paid_at: m.paidAt || null,
          transaction_id: m.transactionId || null,
        }));
        const mrWithUpdated = monthRecords.map((m, idx) => ({
          ...mrBase[idx],
          updated_at: m.updatedAt || new Date().toISOString(),
        }));
        await this.safeUpsert(client, 'recurring_month_records', mrWithUpdated, mrBase);
      }

      if (budgets.length > 0) {
        const bdgBase = budgets.map((b) => ({
          id: b.id,
          workspace_id: b.workspaceId,
          category: b.category,
          limit_amount: b.limitAmount,
          month: b.month,
          year: b.year,
          start_date: b.startDate || null,
          end_date: b.endDate || null,
        }));
        const bdgWithUpdated = budgets.map((b, idx) => ({
          ...bdgBase[idx],
          updated_at: b.updatedAt || new Date().toISOString(),
        }));
        await this.safeUpsert(client, 'budgets', bdgWithUpdated, bdgBase);
      }

      if (goals.length > 0) {
        const goalBase = goals.map((g) => ({
          id: g.id,
          workspace_id: g.workspaceId,
          title: g.title,
          target_amount: g.targetAmount,
          current_amount: g.currentAmount,
          deadline_date: g.deadlineDate,
          icon: g.icon,
          color: g.color,
          notes: g.notes,
        }));
        const goalWithUpdated = goals.map((g, idx) => ({
          ...goalBase[idx],
          updated_at: g.updatedAt || g.createdAt || new Date().toISOString(),
        }));
        await this.safeUpsert(client, 'goals', goalWithUpdated, goalBase);
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

      // Consulta otimizada com limite inteligente e ordenação por data
      const [txRes, recRes, recMonthRes, bdgRes, goalRes] = await Promise.all([
        client.from('transactions').select('*').in('workspace_id', allowedWorkspaceIds).order('date', { ascending: false }).limit(2000),
        client.from('recurrings').select('*').in('workspace_id', allowedWorkspaceIds),
        client.from('recurring_month_records').select('*').in('workspace_id', allowedWorkspaceIds),
        client.from('budgets').select('*').in('workspace_id', allowedWorkspaceIds),
        client.from('goals').select('*').in('workspace_id', allowedWorkspaceIds),
      ]);

      // 1. TRANSAÇÕES: Smart Merge Bidirecional (Last-Write-Wins baseado em timestamps)
      if (Array.isArray(txRes.data)) {
        const localTxs = await TransactionRepository.getAll();
        const mergedMap = new Map<string, Transaction>();

        // Começa com os dados locais para garantir que lançamentos offline NÃO sejam perdidos
        for (const localItem of localTxs) {
          mergedMap.set(localItem.id, localItem);
        }

        // Conflito e novidades da nuvem
        for (const row of txRes.data) {
          const cloudItem: Transaction = {
            id: row.id,
            workspaceId: row.workspace_id,
            title: row.title,
            amount: parseFloat(row.amount),
            type: row.type,
            category: row.category,
            date: row.date,
            notes: row.notes,
            createdBy: row.created_by,
            updatedAt: row.updated_at || row.created_at || row.date,
          };

          const localItem = mergedMap.get(cloudItem.id);
          if (!localItem) {
            // Novo item na nuvem
            mergedMap.set(cloudItem.id, cloudItem);
          } else {
            // Comparação de timestamps determinística (Last-Write-Wins)
            const localTimestamp = new Date(localItem.updatedAt || localItem.date || 0).getTime();
            const cloudTimestamp = new Date(cloudItem.updatedAt || cloudItem.date || 0).getTime();
            if (cloudTimestamp >= localTimestamp) {
              mergedMap.set(cloudItem.id, cloudItem);
            }
          }
        }

        await TransactionRepository.saveAll(Array.from(mergedMap.values()));
      }

      // 2. RECORRENTES: Smart Merge
      if (Array.isArray(recRes.data)) {
        const localRecs = await RecurringRepository.getAll();
        const mergedMap = new Map<string, RecurringDebit>();

        for (const localItem of localRecs) {
          mergedMap.set(localItem.id, localItem);
        }

        for (const row of recRes.data) {
          const cloudItem: RecurringDebit = {
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
            updatedAt: row.updated_at || row.created_at,
          };

          const localItem = mergedMap.get(cloudItem.id);
          if (!localItem) {
            mergedMap.set(cloudItem.id, cloudItem);
          } else {
            const localTimestamp = new Date(localItem.updatedAt || localItem.createdAt || 0).getTime();
            const cloudTimestamp = new Date(cloudItem.updatedAt || cloudItem.createdAt || 0).getTime();
            if (cloudTimestamp >= localTimestamp) {
              mergedMap.set(cloudItem.id, cloudItem);
            }
          }
        }

        await RecurringRepository.saveAll(Array.from(mergedMap.values()));
      }

      // 3. REGISTROS MENSAIS DE RECORRENTES: Smart Merge
      if (Array.isArray(recMonthRes.data)) {
        const localMonths = await RecurringMonthRepository.getAll();
        const mergedMap = new Map<string, RecurringMonthRecord>();

        for (const localItem of localMonths) {
          mergedMap.set(localItem.id, localItem);
        }

        for (const row of recMonthRes.data) {
          const cloudItem: RecurringMonthRecord = {
            id: row.id,
            recurringId: row.recurring_id,
            workspaceId: row.workspace_id,
            month: row.month,
            year: row.year,
            amount: parseFloat(row.amount),
            isPaid: row.is_paid,
            paidAt: row.paid_at,
            transactionId: row.transaction_id,
            updatedAt: row.updated_at,
          };

          const localItem = mergedMap.get(cloudItem.id);
          if (!localItem) {
            mergedMap.set(cloudItem.id, cloudItem);
          } else {
            const localTimestamp = new Date(localItem.updatedAt || localItem.paidAt || 0).getTime();
            const cloudTimestamp = new Date(cloudItem.updatedAt || cloudItem.paidAt || 0).getTime();
            if (cloudTimestamp >= localTimestamp) {
              mergedMap.set(cloudItem.id, cloudItem);
            }
          }
        }

        await RecurringMonthRepository.saveAll(Array.from(mergedMap.values()));
      }

      // 4. ORÇAMENTOS: Smart Merge
      if (Array.isArray(bdgRes.data)) {
        const localBudgets = await BudgetRepository.getAll();
        const mergedMap = new Map<string, Budget>();

        for (const localItem of localBudgets) {
          mergedMap.set(localItem.id, localItem);
        }

        for (const row of bdgRes.data) {
          const cloudItem: Budget = {
            id: row.id,
            workspaceId: row.workspace_id,
            category: row.category,
            limitAmount: parseFloat(row.limit_amount),
            month: row.month,
            year: row.year,
            startDate: row.start_date,
            endDate: row.end_date,
            updatedAt: row.updated_at,
          };

          const localItem = mergedMap.get(cloudItem.id);
          if (!localItem) {
            mergedMap.set(cloudItem.id, cloudItem);
          } else {
            const localTimestamp = new Date(localItem.updatedAt || 0).getTime();
            const cloudTimestamp = new Date(cloudItem.updatedAt || 0).getTime();
            if (cloudTimestamp >= localTimestamp) {
              mergedMap.set(cloudItem.id, cloudItem);
            }
          }
        }

        await BudgetRepository.saveAll(Array.from(mergedMap.values()));
      }

      // 5. METAS: Smart Merge
      if (Array.isArray(goalRes.data)) {
        const localGoals = await GoalRepository.getAll();
        const mergedMap = new Map<string, Goal>();

        for (const localItem of localGoals) {
          mergedMap.set(localItem.id, localItem);
        }

        for (const row of goalRes.data) {
          const cloudItem: Goal = {
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
            updatedAt: row.updated_at || row.created_at,
          };

          const localItem = mergedMap.get(cloudItem.id);
          if (!localItem) {
            mergedMap.set(cloudItem.id, cloudItem);
          } else {
            const localTimestamp = new Date(localItem.updatedAt || localItem.createdAt || 0).getTime();
            const cloudTimestamp = new Date(cloudItem.updatedAt || cloudItem.createdAt || 0).getTime();
            if (cloudTimestamp >= localTimestamp) {
              mergedMap.set(cloudItem.id, cloudItem);
            }
          }
        }

        await GoalRepository.saveAll(Array.from(mergedMap.values()));
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
