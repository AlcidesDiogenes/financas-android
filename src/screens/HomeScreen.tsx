import React, { useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../core/theme/ThemeContext';
import { usePrivacy } from '../core/theme/PrivacyContext';
import { useWorkspace } from '../modules/workspaces/WorkspaceContext';
import { useFinance } from '../modules/FinanceContext';
import { formatCurrency } from '../core/utils/currency';
import { getMonthLabel } from '../core/utils/date';
import { Card } from '../core/components/Card';
import { Button } from '../core/components/Button';
import { ModalContainer } from '../core/components/ModalContainer';
import { TransactionItem } from '../modules/transactions/components/TransactionItem';
import { RecurringItem } from '../modules/recurrings/components/RecurringItem';
import { RecurringDebit, isRecurringActiveInMonth } from '../modules/recurrings/types';
import { BudgetItem } from '../modules/budgets/components/BudgetItem';
import { SpendingCharts } from '../core/components/SpendingCharts';
import { AddTransactionModal } from '../modules/transactions/components/AddTransactionModal';
import { PeriodSelector } from '../core/components/PeriodSelector';
import { ExportService } from '../services/reports/ExportService';
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
    allTransactions,
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
  const [reportModalVisible, setReportModalVisible] = useState(false);
  const [reportMode, setReportMode] = useState<'realized' | 'projected'>('realized');

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
  const pendingRecurringsAmount = useMemo(
    () => pendingRecurrings.reduce((sum, r) => sum + r.amount, 0),
    [pendingRecurrings]
  );
  const paidRecurringsCount = activeRecurrings.filter((r) => r.isPaidCurrentMonth).length;
  const totalRecurringsCount = activeRecurrings.length;
  const recentTransactions = transactions.slice(0, 4);

  // Fechamento de Contas do Espaço Compartilhado (Splitwise)
  const householdSplit = useMemo(() => {
    if (activeWorkspace.type !== 'shared') return null;

    const map: Record<string, number> = {};
    transactions
      .filter((t) => t.type === 'expense')
      .forEach((t) => {
        const person = t.assignedTo ? t.assignedTo.trim() : 'Geral';
        map[person] = (map[person] || 0) + t.amount;
      });

    activeRecurrings
      .filter((r) => r.isPaidCurrentMonth && r.type !== 'income')
      .forEach((r) => {
        const person = r.assignedTo ? r.assignedTo.trim() : 'Geral';
        map[person] = (map[person] || 0) + r.amount;
      });

    const entries = Object.entries(map).filter(([_, amount]) => amount > 0);
    if (entries.length < 2) return null;

    const total = entries.reduce((s, [_, a]) => s + a, 0);
    const splits = entries
      .map(([person, amount]) => ({
        person,
        total: amount,
        percentage: total > 0 ? Math.round((amount / total) * 100) : 0,
      }))
      .sort((a, b) => b.total - a.total);

    let suggestion = '';
    if (splits.length === 2) {
      const [p1, p2] = splits;
      const diff = Math.abs(p1.total - p2.total) / 2;
      if (diff > 0.01) {
        suggestion = `Para dividir 50/50, ${p2.person} deve transferir ${formatCurrency(diff)} para ${p1.person}.`;
      } else {
        suggestion = `Os gastos estão perfeitamente equilibrados (50/50)! 🎉`;
      }
    }

    return { total, splits, suggestion };
  }, [activeWorkspace.type, transactions, activeRecurrings]);

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
          <Ionicons name="chevron-forward" size={16} color={theme.textMuted} />
        </TouchableOpacity>

        <View style={styles.topActions}>
          <TouchableOpacity
            style={[styles.themeBtn, { backgroundColor: theme.surfaceVariant, marginRight: 8 }]}
            onPress={togglePrivacyMode}
            accessibilityLabel={isPrivacyMode ? 'Mostrar valores' : 'Ocultar valores'}
          >
            <Ionicons
              name={isPrivacyMode ? 'eye-off-outline' : 'eye-outline'}
              size={20}
              color={theme.text}
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.themeBtn, { backgroundColor: theme.surfaceVariant }]}
            onPress={toggleTheme}
            accessibilityLabel="Alternar tema"
          >
            <Ionicons
              name={isDark ? 'sunny-outline' : 'moon-outline'}
              size={20}
              color={theme.text}
            />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Period Selector Bar */}
        <View style={styles.periodRow}>
          <PeriodSelector />
        </View>

        {/* Hero Balance Card */}
        <Card variant="elevated" style={styles.heroCard}>
          <View style={styles.heroCardHeaderRow}>
            <Text style={[styles.balanceLabel, { color: theme.textMuted }]}>
              Saldo {balanceMode === 'realized' ? 'Realizado' : 'Previsto'} (
              {getMonthLabel(selectedMonth, selectedYear)})
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
                    <Ionicons name="shield-checkmark" size={15} color={theme.primary} />
                    <Text style={[styles.statLabel, { color: theme.textMuted }]}>
                      Poupado
                    </Text>
                  </View>
                  <Text style={[styles.statValue, { color: theme.primary }]}>
                    {formatPrivateCurrency(
                      monthlySummary.totalSavedInMonth,
                      formatCurrency(monthlySummary.totalSavedInMonth)
                    )}
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

        {/* Quick Actions Row */}
        <View style={styles.quickActionsRow}>
          {canEdit && (
            <Button
              title="Novo Lançamento"
              icon={<Ionicons name="add-circle" size={18} color="#FFF" />}
              onPress={() => handleOpenAddModal('expense')}
              style={{ flex: 1, marginRight: 8 }}
            />
          )}
          <TouchableOpacity
            style={[styles.reportBtn, { backgroundColor: theme.surfaceVariant, borderColor: theme.border }]}
            onPress={() => {
              setReportMode(balanceMode);
              setReportModalVisible(true);
            }}
            activeOpacity={0.7}
          >
            <Ionicons name="share-social-outline" size={18} color={theme.primary} />
            <Text style={[styles.reportBtnText, { color: theme.primary }]}>Relatório</Text>
          </TouchableOpacity>
        </View>

        {/* ======================================================== */}
        {/* RADAR DE VENCIMENTOS INTELIGENTE                        */}
        {/* ======================================================== */}
        {activeRecurrings.length > 0 && pendingRecurrings.length === 0 && (
          <View style={[styles.allPaidBanner, { backgroundColor: '#10B98115', borderColor: '#10B98140' }]}>
            <Ionicons name="checkmark-circle" size={22} color="#10B981" />
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={[styles.allPaidTitle, { color: '#10B981' }]}>
                Contas em dia! 🎉
              </Text>
              <Text style={[styles.allPaidSub, { color: theme.textMuted }]}>
                Todas as contas fixas de {getMonthLabel(selectedMonth, selectedYear)} foram pagas.
              </Text>
            </View>
          </View>
        )}

        {/* ======================================================== */}
        {/* ACERTO DE CONTAS DO ESPAÇO COMPARTILHADO (SPLITWISE)     */}
        {/* ======================================================== */}
        {householdSplit && (
          <Card variant="flat" style={[styles.splitCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <View style={styles.splitHeaderRow}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Ionicons name="people" size={18} color={theme.primary} style={{ marginRight: 6 }} />
                <Text style={[styles.splitTitle, { color: theme.text }]}>
                  Acerto de Contas da Casa
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => {
                  ExportService.shareHouseholdSplitText({
                    workspaceName: activeWorkspace.name,
                    monthLabel: getMonthLabel(selectedMonth, selectedYear),
                    totalExpense: householdSplit.total,
                    personSplits: householdSplit.splits,
                    settlementSuggestion: householdSplit.suggestion,
                  });
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Ionicons name="logo-whatsapp" size={14} color="#10B981" style={{ marginRight: 4 }} />
                  <Text style={{ fontSize: 11, fontWeight: '700', color: '#10B981' }}>Enviar</Text>
                </View>
              </TouchableOpacity>
            </View>

            <View style={styles.splitMembersList}>
              {householdSplit.splits.map((s, idx) => (
                <View key={s.person} style={styles.splitMemberRow}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <View
                      style={[
                        styles.splitMemberDot,
                        { backgroundColor: idx === 0 ? theme.primary : '#EC4899' },
                      ]}
                    />
                    <Text style={[styles.splitMemberName, { color: theme.text }]}>{s.person}</Text>
                  </View>
                  <Text style={[styles.splitMemberAmount, { color: theme.text }]}>
                    {formatCurrency(s.total)} ({s.percentage}%)
                  </Text>
                </View>
              ))}
            </View>

            {householdSplit.suggestion && (
              <View style={[styles.suggestionBox, { backgroundColor: theme.surfaceVariant }]}>
                <Ionicons name="swap-horizontal" size={16} color={theme.primary} style={{ marginRight: 6 }} />
                <Text style={[styles.suggestionText, { color: theme.text }]}>
                  {householdSplit.suggestion}
                </Text>
              </View>
            )}
          </Card>
        )}

        {/* Interactive Spending Breakdown Charts with 6-Month Evolution */}
        <SpendingCharts
          categorySpendings={categorySpendings}
          totalExpense={monthlySummary.totalExpense}
          allTransactions={allTransactions}
        />

        {/* Recurrings to pay preview */}
        {pendingRecurrings.length > 0 && (
          <>
            <View style={styles.sectionHeader}>
              <View>
                <Text style={[styles.sectionTitle, { color: theme.text }]}>
                  Contas Fixas Pendentes
                </Text>
                <Text style={[styles.sectionSubtitle, { color: theme.textMuted }]}>
                  {pendingRecurrings.length} débitos pendentes de pagamento
                </Text>
              </View>
              <TouchableOpacity onPress={onNavigateToRecurrings}>
                <Text style={[styles.seeAllText, { color: theme.primary }]}>Ver Todas</Text>
              </TouchableOpacity>
            </View>

            {pendingRecurrings.slice(0, 3).map((item) => (
              <RecurringItem
                key={item.id}
                recurring={item}
                onTogglePaid={toggleRecurringPaid}
                canEdit={canEdit}
                showVigencia={false}
                selectedMonth={selectedMonth}
                selectedYear={selectedYear}
              />
            ))}
          </>
        )}

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

      {/* Relatório Mensal & Compartilhamento Modal */}
      <ModalContainer
        visible={reportModalVisible}
        onClose={() => setReportModalVisible(false)}
        title={`Relatório: ${getMonthLabel(selectedMonth, selectedYear)}`}
      >
        {/* Seletor de Modo: Caixa Real vs Previsto */}
        <View style={[styles.reportModeToggle, { backgroundColor: theme.surfaceVariant }]}>
          <TouchableOpacity
            style={[
              styles.reportModeTab,
              reportMode === 'realized' && { backgroundColor: theme.primary },
            ]}
            onPress={() => setReportMode('realized')}
            activeOpacity={0.8}
          >
            <Text
              style={[
                styles.reportModeTabText,
                { color: reportMode === 'realized' ? '#FFF' : theme.textMuted },
              ]}
            >
              Caixa Real
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.reportModeTab,
              reportMode === 'projected' && { backgroundColor: theme.primary },
            ]}
            onPress={() => setReportMode('projected')}
            activeOpacity={0.8}
          >
            <Text
              style={[
                styles.reportModeTabText,
                { color: reportMode === 'projected' ? '#FFF' : theme.textMuted },
              ]}
            >
              Previsto / Projeção
            </Text>
          </TouchableOpacity>
        </View>

        <Text style={{ fontSize: 12, color: theme.textMuted, marginBottom: 12 }}>
          {reportMode === 'realized'
            ? '📊 Visão de Caixa Real: Apenas valores que já foram efetivamente pagos ou recebidos.'
            : '📈 Visão Prevista / Competência: Inclui contas fixas pendentes e todas as previsões do mês.'}
        </Text>

        {reportMode === 'realized' ? (
          <Card variant="flat" style={{ padding: 14, marginBottom: 16, backgroundColor: theme.surfaceVariant }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
              <Text style={{ fontSize: 13, color: theme.text }}>🟢 Receitas em Caixa:</Text>
              <Text style={{ fontSize: 14, fontWeight: '700', color: theme.success }}>
                {formatCurrency(monthlySummary.totalIncome)}
              </Text>
            </View>

            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
              <Text style={{ fontSize: 13, color: theme.text }}>🔴 Despesas Pagas:</Text>
              <Text style={{ fontSize: 14, fontWeight: '700', color: theme.danger }}>
                {formatCurrency(monthlySummary.totalExpense)}
              </Text>
            </View>

            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8, borderTopWidth: 1, borderTopColor: theme.border, paddingTop: 8 }}>
              <Text style={{ fontSize: 13, fontWeight: '700', color: theme.text }}>💰 Saldo Real em Conta:</Text>
              <Text
                style={{
                  fontSize: 15,
                  fontWeight: '800',
                  color: monthlySummary.balance >= 0 ? theme.success : theme.danger,
                }}
              >
                {formatCurrency(monthlySummary.balance)}
              </Text>
            </View>

            {monthlySummary.totalSavedInMonth > 0 && (
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                <Text style={{ fontSize: 12, color: theme.primary }}>🛡️ Total Poupado:</Text>
                <Text style={{ fontSize: 13, fontWeight: '700', color: theme.primary }}>
                  {formatCurrency(monthlySummary.totalSavedInMonth)}
                </Text>
              </View>
            )}

            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
              <Text style={{ fontSize: 12, color: theme.textMuted }}>📋 Contas Fixas Pagas:</Text>
              <Text style={{ fontSize: 12, color: theme.textMuted }}>
                {paidRecurringsCount} pagas {pendingRecurrings.length > 0 ? `(${pendingRecurrings.length} pendentes)` : ''}
              </Text>
            </View>
          </Card>
        ) : (
          <Card variant="flat" style={{ padding: 14, marginBottom: 16, backgroundColor: theme.surfaceVariant }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
              <Text style={{ fontSize: 13, color: theme.text }}>🟢 Receitas Previstas:</Text>
              <Text style={{ fontSize: 14, fontWeight: '700', color: theme.success }}>
                {formatCurrency(projectedIncome)}
              </Text>
            </View>

            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
              <Text style={{ fontSize: 13, color: theme.text }}>🔴 Despesas Previstas Totais:</Text>
              <Text style={{ fontSize: 14, fontWeight: '700', color: theme.danger }}>
                {formatCurrency(projectedExpense)}
              </Text>
            </View>

            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8, borderTopWidth: 1, borderTopColor: theme.border, paddingTop: 8 }}>
              <Text style={{ fontSize: 13, fontWeight: '700', color: theme.text }}>💰 Saldo Previsto ao Fim do Mês:</Text>
              <Text
                style={{
                  fontSize: 15,
                  fontWeight: '800',
                  color: projectedBalance >= 0 ? theme.success : theme.danger,
                }}
              >
                {formatCurrency(projectedBalance)}
              </Text>
            </View>

            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
              <Text style={{ fontSize: 12, color: theme.textMuted }}>📋 Status Contas Fixas:</Text>
              <Text style={{ fontSize: 12, color: theme.textMuted }}>
                {paidRecurringsCount} quitadas • {pendingRecurrings.length} a pagar ({formatCurrency(pendingRecurringsAmount)})
              </Text>
            </View>
          </Card>
        )}

        <Button
          title={reportMode === 'realized' ? 'Compartilhar Relatório Real' : 'Compartilhar Relatório Previsto'}
          icon={<Ionicons name="logo-whatsapp" size={18} color="#FFF" />}
          onPress={async () => {
            if (reportMode === 'realized') {
              await ExportService.shareMonthlySummaryText({
                mode: 'realized',
                monthLabel: getMonthLabel(selectedMonth, selectedYear),
                totalIncome: monthlySummary.totalIncome,
                totalExpense: monthlySummary.totalExpense,
                balance: monthlySummary.balance,
                totalSavedInMonth: monthlySummary.totalSavedInMonth,
                topCategories: categorySpendings.map((c) => ({ category: c.category, total: c.total })),
                recurringsPaidCount: paidRecurringsCount,
                recurringsPendingCount: pendingRecurrings.length,
              });
            } else {
              await ExportService.shareMonthlySummaryText({
                mode: 'projected',
                monthLabel: getMonthLabel(selectedMonth, selectedYear),
                totalIncome: projectedIncome,
                totalExpense: projectedExpense,
                balance: projectedBalance,
                pendingRecurringsAmount,
                topCategories: categorySpendings.map((c) => ({ category: c.category, total: c.total })),
                recurringsPaidCount: paidRecurringsCount,
                recurringsPendingCount: pendingRecurrings.length,
              });
            }
            setReportModalVisible(false);
          }}
          style={{ marginBottom: 10, backgroundColor: '#10B981' }}
        />

        <Button
          title="Exportar Planilha (CSV)"
          icon={<Ionicons name="document-text-outline" size={18} color="#FFF" />}
          variant="secondary"
          onPress={async () => {
            const ok = await ExportService.exportTransactionsToCSV(
              transactions,
              getMonthLabel(selectedMonth, selectedYear)
            );
            if (!ok) {
              Alert.alert('Aviso', 'Não foi possível gerar a planilha no momento.');
            }
            setReportModalVisible(false);
          }}
        />
      </ModalContainer>
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
    fontSize: 15,
    fontWeight: '700',
  },
  statDivider: {
    width: 1,
    marginHorizontal: 8,
  },
  projectionBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    marginTop: 14,
  },
  projectionTextWrap: {
    flex: 1,
    marginHorizontal: 8,
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
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  reportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  reportBtnText: {
    fontSize: 13,
    fontWeight: '700',
    marginLeft: 6,
  },
  allPaidBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 16,
  },
  allPaidTitle: {
    fontSize: 13,
    fontWeight: '800',
  },
  allPaidSub: {
    fontSize: 11,
    marginTop: 2,
  },
  splitCard: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 16,
  },
  splitHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  splitTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  splitMembersList: {
    gap: 8,
    marginBottom: 10,
  },
  splitMemberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  splitMemberDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  splitMemberName: {
    fontSize: 13,
    fontWeight: '600',
  },
  splitMemberAmount: {
    fontSize: 13,
    fontWeight: '700',
  },
  suggestionBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 10,
    marginTop: 4,
  },
  suggestionText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
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
  reportModeToggle: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: 4,
    marginBottom: 12,
  },
  reportModeTab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 10,
  },
  reportModeTabText: {
    fontSize: 13,
    fontWeight: '700',
  },
});
