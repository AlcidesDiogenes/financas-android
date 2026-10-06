import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useTheme } from '../core/theme/ThemeContext';
import { usePrivacy } from '../core/theme/PrivacyContext';
import { useWorkspace } from '../modules/workspaces/WorkspaceContext';
import { useFinance } from '../modules/FinanceContext';
import { formatCurrency } from '../core/utils/currency';
import { getMonthLabel } from '../core/utils/date';
import { Card } from '../core/components/Card';
import { Button } from '../core/components/Button';
import { TransactionItem } from '../modules/transactions/components/TransactionItem';
import { RecurringItem } from '../modules/recurrings/components/RecurringItem';
import { isRecurringActiveInMonth } from '../modules/recurrings/types';
import { BudgetItem } from '../modules/budgets/components/BudgetItem';
import { SpendingCharts } from '../core/components/SpendingCharts';
import { AddTransactionModal } from '../modules/transactions/components/AddTransactionModal';
import { PeriodSelector } from '../core/components/PeriodSelector';
import { Ionicons } from '@expo/vector-icons';

interface HomeScreenProps {
  onNavigateToTransactions: () => void;
  onNavigateToRecurrings: () => void;
  onNavigateToPlanning: () => void;
  onNavigateToWorkspaces: () => void;
  onNavigateToSettings?: () => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({
  onNavigateToTransactions,
  onNavigateToRecurrings,
  onNavigateToPlanning,
  onNavigateToWorkspaces,
  onNavigateToSettings,
}) => {
  const { theme, isDark, toggleTheme } = useTheme();
  const { isPrivacyMode, togglePrivacyMode, formatPrivateCurrency } = usePrivacy();
  const { activeWorkspace, canEdit, pendingRequestsCount } = useWorkspace();
  const {
    monthlySummary,
    projectedIncome,
    projectedExpense,
    projectedBalance,
    balanceMode,
    setBalanceMode,
    toggleBalanceMode,
    transactions,
    recurrings,
    budgetProgressList,
    selectedMonth,
    selectedYear,
    addTransaction,
    deleteTransaction,
    toggleRecurringPaid,
  } = useFinance();

  const [addModalVisible, setAddModalVisible] = useState(false);
  const [addModalInitialMode, setAddModalInitialMode] = useState<'expense' | 'income' | 'saving'>('expense');

  const handleOpenAddModal = (mode: 'expense' | 'income' | 'saving' = 'expense') => {
    if (!canEdit) return;
    setAddModalInitialMode(mode);
    setAddModalVisible(true);
  };

  const activeRecurrings = useMemo(
    () => recurrings.filter((r) => isRecurringActiveInMonth(r, selectedMonth, selectedYear)),
    [recurrings, selectedMonth, selectedYear]
  );
  const pendingRecurrings = activeRecurrings.filter((r) => !r.isPaidCurrentMonth);
  const paidRecurringsCount = activeRecurrings.filter((r) => r.isPaidCurrentMonth).length;
  const totalRecurringsCount = activeRecurrings.length;
  const recentTransactions = transactions.slice(0, 4);

  const categorySpendings = useMemo(() => {
    const map: Record<string, number> = {};
    transactions
      .filter((t) => t.type === 'expense')
      .forEach((t) => {
        map[t.category] = (map[t.category] || 0) + t.amount;
      });

    return Object.entries(map)
      .map(([category, total]) => ({
        category: category as any,
        total,
        percentage:
          monthlySummary.totalExpense > 0
            ? (total / monthlySummary.totalExpense) * 100
            : 0,
      }))
      .sort((a, b) => b.total - a.total);
  }, [transactions, monthlySummary.totalExpense]);

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Top Bar */}
      <View style={[styles.topBar, { borderBottomColor: theme.border }]}>
        <TouchableOpacity
          style={[styles.workspaceSelector, { backgroundColor: theme.surfaceVariant }]}
          onPress={onNavigateToWorkspaces}
        >
          <Ionicons
            name={activeWorkspace.type === 'solo' ? 'person-circle-outline' : 'people-circle-outline'}
            size={22}
            color={theme.primary}
          />
          <View style={styles.workspaceTextWrap}>
            <Text style={[styles.workspaceLabel, { color: theme.textMuted }]}>
              {activeWorkspace.type === 'solo' ? 'Modo Solo' : 'Compartilhado'}
            </Text>
            <Text style={[styles.workspaceName, { color: theme.text }]} numberOfLines={1}>
              {activeWorkspace.name}
            </Text>
          </View>
          {pendingRequestsCount > 0 && (
            <View style={styles.wsPendingBadge}>
              <Text style={styles.wsPendingBadgeText}>{pendingRequestsCount}</Text>
            </View>
          )}
          <Ionicons name="chevron-down" size={16} color={theme.textMuted} />
        </TouchableOpacity>

        <View style={styles.topActions}>
          {/* Privacy Eye Toggle */}
          <TouchableOpacity
            style={[styles.themeBtn, { backgroundColor: theme.surfaceVariant, marginRight: 8 }]}
            onPress={togglePrivacyMode}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons
              name={isPrivacyMode ? 'eye-off-outline' : 'eye-outline'}
              size={20}
              color={theme.text}
            />
          </TouchableOpacity>

          {/* Theme Toggle */}
          <TouchableOpacity
            style={[styles.themeBtn, { backgroundColor: theme.surfaceVariant }]}
            onPress={toggleTheme}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons
              name={isDark ? 'sunny' : 'moon'}
              size={20}
              color={isDark ? '#F59E0B' : theme.text}
            />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Banner de Notificação: Solicitações de Entrada Pendentes */}
        {pendingRequestsCount > 0 && (
          <TouchableOpacity
            style={[
              styles.pendingBanner,
              { backgroundColor: '#F59E0B18', borderColor: '#F59E0B44' },
            ]}
            onPress={onNavigateToWorkspaces}
            activeOpacity={0.8}
          >
            <View style={[styles.pendingBannerIconWrap, { backgroundColor: '#F59E0B' }]}>
              <Ionicons name="notifications" size={17} color="#FFF" />
            </View>
            <View style={styles.pendingBannerTextWrap}>
              <Text style={[styles.pendingBannerTitle, { color: theme.text }]}>
                {pendingRequestsCount === 1
                  ? '1 Solicitação de Entrada Pendente'
                  : `${pendingRequestsCount} Solicitações de Entrada`}
              </Text>
              <Text style={[styles.pendingBannerSubtitle, { color: theme.textMuted }]}>
                Toque para aprovar ou recusar o acesso ao seu espaço
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#F59E0B" />
          </TouchableOpacity>
        )}

        {/* Month Navigator */}
        <View style={styles.periodRow}>
          <PeriodSelector compact />
        </View>

        {/* Hero Card: Balance & Summary */}
        <Card variant="elevated" style={styles.heroCard}>
          {/* Header do Card com Seletor Rápido de Modo de Saldo */}
          <View style={styles.heroCardHeaderRow}>
            <Text style={[styles.balanceLabel, { color: theme.textMuted }]}>
              {balanceMode === 'realized' ? 'Saldo Realizado (Caixa)' : 'Saldo Previsto do Mês'}
            </Text>

            <View style={[styles.balanceModeToggle, { backgroundColor: theme.surfaceVariant }]}>
              <TouchableOpacity
                onPress={() => setBalanceMode('realized')}
                activeOpacity={0.7}
                style={[
                  styles.modeTabBtn,
                  balanceMode === 'realized' && { backgroundColor: theme.primary },
                ]}
              >
                <Text
                  style={[
                    styles.modeTabText,
                    { color: balanceMode === 'realized' ? '#FFF' : theme.textMuted },
                  ]}
                >
                  Real
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setBalanceMode('projected')}
                activeOpacity={0.7}
                style={[
                  styles.modeTabBtn,
                  balanceMode === 'projected' && { backgroundColor: theme.primary },
                ]}
              >
                <Text
                  style={[
                    styles.modeTabText,
                    { color: balanceMode === 'projected' ? '#FFF' : theme.textMuted },
                  ]}
                >
                  Previsto
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Valor Principal do Saldo Dinâmico */}
          {(() => {
            const currentDisplayBalance =
              balanceMode === 'realized' ? monthlySummary.balance : projectedBalance;
            return (
              <Text
                style={[
                  styles.balanceValue,
                  { color: currentDisplayBalance >= 0 ? theme.text : theme.danger },
                ]}
              >
                {formatPrivateCurrency(
                  currentDisplayBalance,
                  formatCurrency(currentDisplayBalance)
                )}
              </Text>
            );
          })()}

          {/* Income, Expense & Savings Row */}
          {(() => {
            const displayIncome = balanceMode === 'projected' ? projectedIncome : monthlySummary.totalIncome;
            const displayExpense = balanceMode === 'projected' ? projectedExpense : monthlySummary.totalExpense;

            return (
              <View style={[styles.statsRow, { borderTopColor: theme.border }]}>
                <TouchableOpacity
                  style={styles.statCol}
                  activeOpacity={0.7}
                  onPress={() => handleOpenAddModal('income')}
                  disabled={!canEdit}
                >
                  <View style={styles.statIconRow}>
                    <Ionicons name="arrow-down-circle" size={15} color={theme.success} />
                    <Text style={[styles.statLabel, { color: theme.textMuted }]}>
                      Receitas
                    </Text>
                  </View>
                  <Text style={[styles.statValue, { color: theme.success }]}>
                    {formatPrivateCurrency(displayIncome, formatCurrency(displayIncome))}
                  </Text>
                </TouchableOpacity>

                <View style={[styles.statDivider, { backgroundColor: theme.border }]} />

                <TouchableOpacity
                  style={styles.statCol}
                  activeOpacity={0.7}
                  onPress={() => handleOpenAddModal('expense')}
                  disabled={!canEdit}
                >
                  <View style={styles.statIconRow}>
                    <Ionicons name="arrow-up-circle" size={15} color={theme.danger} />
                    <Text style={[styles.statLabel, { color: theme.textMuted }]}>
                      Despesas
                    </Text>
                  </View>
                  <Text style={[styles.statValue, { color: theme.danger }]}>
                    {formatPrivateCurrency(displayExpense, formatCurrency(displayExpense))}
                  </Text>
                </TouchableOpacity>

                <View style={[styles.statDivider, { backgroundColor: theme.border }]} />

                <TouchableOpacity
                  style={styles.statCol}
                  activeOpacity={0.7}
                  onPress={() => handleOpenAddModal('saving')}
                  disabled={!canEdit}
                >
                  <View style={styles.statIconRow}>
                    <Ionicons name="wallet-outline" size={15} color="#3B82F6" />
                    <Text style={[styles.statLabel, { color: theme.textMuted }]}>
                      Economia
                    </Text>
                  </View>
                  <Text style={[styles.statValue, { color: '#3B82F6' }]}>
                    {formatPrivateCurrency(monthlySummary.totalSavedInMonth, formatCurrency(monthlySummary.totalSavedInMonth))}
                  </Text>
                </TouchableOpacity>
              </View>
            );
          })()}

          {/* Context Footer Box */}
          {balanceMode === 'realized' ? (
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => setBalanceMode('projected')}
              style={[styles.projectionBox, { backgroundColor: theme.surfaceVariant }]}
            >
              <Ionicons name="calculator-outline" size={18} color={theme.primary} />
              <View style={styles.projectionTextWrap}>
                <Text style={[styles.projectionTitle, { color: theme.text }]}>
                  Previsão com Contas Fixas:
                </Text>
                <Text style={[styles.projectionSub, { color: theme.textMuted }]}>
                  Saldo previsto ao fim do mês:{' '}
                  <Text style={{ fontWeight: '700', color: projectedBalance >= 0 ? theme.success : theme.danger }}>
                    {formatPrivateCurrency(projectedBalance, formatCurrency(projectedBalance))}
                  </Text>
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={theme.textMuted} />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={onNavigateToRecurrings}
              style={[styles.projectionBox, { backgroundColor: `${theme.primary}10` }]}
            >
              <Ionicons
                name={pendingRecurrings.length === 0 ? 'checkmark-circle' : 'list-circle-outline'}
                size={18}
                color={pendingRecurrings.length === 0 ? theme.success : theme.primary}
              />
              <View style={styles.projectionTextWrap}>
                <Text style={[styles.projectionTitle, { color: theme.text }]}>
                  Checklist de Quitações:
                </Text>
                <Text style={[styles.projectionSub, { color: theme.textMuted }]}>
                  {totalRecurringsCount === 0
                    ? 'Nenhuma conta cadastrada para este mês'
                    : pendingRecurrings.length === 0
                    ? 'Todas as contas do mês já foram quitadas! 🎉'
                    : `${paidRecurringsCount} de ${totalRecurringsCount} contas pagas (${pendingRecurrings.length} pendentes)`}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={theme.textMuted} />
            </TouchableOpacity>
          )}
        </Card>

        {/* Quick Actions */}
        {canEdit && (
          <View style={styles.quickActionsRow}>
            <Button
              title="Novo Lançamento"
              icon={<Ionicons name="add-circle" size={18} color="#FFF" />}
              onPress={() => handleOpenAddModal('expense')}
              style={{ flex: 1 }}
            />
          </View>
        )}

        {/* Interactive Spending Breakdown Charts */}
        <SpendingCharts
          categorySpendings={categorySpendings}
          totalExpense={monthlySummary.totalExpense}
        />

        {/* Recurrings to pay alert */}
        {pendingRecurrings.length > 0 && (
          <View style={styles.sectionHeader}>
            <View>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>
                Contas a Vencer no Mês
              </Text>
              <Text style={[styles.sectionSubtitle, { color: theme.textMuted }]}>
                {pendingRecurrings.length} débitos pendentes de pagamento
              </Text>
            </View>
            <TouchableOpacity onPress={onNavigateToRecurrings}>
              <Text style={[styles.seeAllText, { color: theme.primary }]}>Ver Todas</Text>
            </TouchableOpacity>
          </View>
        )}

        {pendingRecurrings.slice(0, 3).map((item) => (
          <RecurringItem
            key={item.id}
            recurring={item}
            onTogglePaid={toggleRecurringPaid}
            canEdit={canEdit}
            showVigencia={false}
          />
        ))}

        {/* Budgets Preview */}
        {budgetProgressList.length > 0 && (
          <>
            <View style={[styles.sectionHeader, { marginTop: 12 }]}>
              <View>
                <Text style={[styles.sectionTitle, { color: theme.text }]}>
                  Planejamento de Orçamentos
                </Text>
                <Text style={[styles.sectionSubtitle, { color: theme.textMuted }]}>
                  Acompanhamento de tetos de gastos
                </Text>
              </View>
              <TouchableOpacity onPress={onNavigateToPlanning}>
                <Text style={[styles.seeAllText, { color: theme.primary }]}>Metas & Tetos</Text>
              </TouchableOpacity>
            </View>
            {budgetProgressList.slice(0, 2).map((item) => (
              <BudgetItem
                key={item.budget.id}
                progress={item}
                canEdit={canEdit}
              />
            ))}
          </>
        )}

        {/* Recent Transactions */}
        <View style={[styles.sectionHeader, { marginTop: 12 }]}>
          <View>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>
              Últimos Lançamentos
            </Text>
            <Text style={[styles.sectionSubtitle, { color: theme.textMuted }]}>
              Extrato recente do mês
            </Text>
          </View>
          <TouchableOpacity onPress={onNavigateToTransactions}>
            <Text style={[styles.seeAllText, { color: theme.primary }]}>Extrato Completo</Text>
          </TouchableOpacity>
        </View>

        {recentTransactions.length === 0 ? (
          <Card variant="flat" style={{ alignItems: 'center', paddingVertical: 24 }}>
            <Ionicons name="receipt-outline" size={32} color={theme.textMuted} />
            <Text style={{ color: theme.textMuted, marginTop: 8 }}>
              Nenhum lançamento registrado neste mês.
            </Text>
          </Card>
        ) : (
          recentTransactions.map((tx) => (
            <TransactionItem
              key={tx.id}
              transaction={tx}
              onDelete={deleteTransaction}
              canEdit={canEdit}
            />
          ))
        )}
      </ScrollView>

      {/* Add Transaction Modal */}
      <AddTransactionModal
        visible={addModalVisible}
        initialMode={addModalInitialMode}
        onClose={() => setAddModalVisible(false)}
        onSubmit={addTransaction}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  workspaceSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 14,
    maxWidth: '75%',
  },
  workspaceTextWrap: {
    marginLeft: 8,
    marginRight: 6,
  },
  workspaceLabel: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  workspaceName: {
    fontSize: 13,
    fontWeight: '700',
  },
  topActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  themeBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 80,
  },
  periodRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  periodText: {
    fontSize: 20,
    fontWeight: '800',
  },
  heroCard: {
    padding: 20,
    marginBottom: 16,
  },
  heroCardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  balanceModeToggle: {
    flexDirection: 'row',
    borderRadius: 8,
    padding: 2,
  },
  modeTabBtn: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  modeTabText: {
    fontSize: 10,
    fontWeight: '700',
  },
  balanceLabel: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  balanceValue: {
    fontSize: 32,
    fontWeight: '800',
    marginVertical: 8,
  },
  statsRow: {
    flexDirection: 'row',
    borderTopWidth: 1,
    paddingTop: 14,
    marginTop: 8,
  },
  statCol: {
    flex: 1,
  },
  statIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    marginLeft: 4,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '700',
  },
  statDivider: {
    width: 1,
    marginHorizontal: 12,
  },
  projectionBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    marginTop: 16,
  },
  projectionTextWrap: {
    marginLeft: 10,
    flex: 1,
  },
  projectionTitle: {
    fontSize: 12,
    fontWeight: '700',
  },
  projectionSub: {
    fontSize: 12,
    marginTop: 2,
  },
  quickActionsRow: {
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 12,
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
  },
  sectionSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  seeAllText: {
    fontSize: 13,
    fontWeight: '700',
  },
  wsPendingBadge: {
    backgroundColor: '#F59E0B',
    borderRadius: 9,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    marginRight: 4,
  },
  wsPendingBadgeText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '800',
  },
  pendingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 12,
    gap: 10,
  },
  pendingBannerIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pendingBannerTextWrap: {
    flex: 1,
  },
  pendingBannerTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  pendingBannerSubtitle: {
    fontSize: 11,
    marginTop: 2,
  },
});
