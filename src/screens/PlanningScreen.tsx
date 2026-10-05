import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useTheme } from '../core/theme/ThemeContext';
import { useFinance } from '../modules/FinanceContext';
import { useWorkspace } from '../modules/workspaces/WorkspaceContext';
import { BudgetItem } from '../modules/budgets/components/BudgetItem';
import { AddBudgetModal } from '../modules/budgets/components/AddBudgetModal';
import { GoalItem } from '../modules/goals/components/GoalItem';
import { AddGoalModal } from '../modules/goals/components/AddGoalModal';
import { DepositGoalModal } from '../modules/goals/components/DepositGoalModal';
import { formatCurrency } from '../core/utils/currency';
import { Card } from '../core/components/Card';
import { Button } from '../core/components/Button';
import { ProgressBar } from '../core/components/ProgressBar';
import { PeriodSelector } from '../core/components/PeriodSelector';
import { Ionicons } from '@expo/vector-icons';

import { Budget } from '../modules/budgets/types';
import { Goal } from '../modules/goals/types';
import { getMonthLabel } from '../core/utils/date';
import { Alert } from 'react-native';

export const PlanningScreen: React.FC = () => {
  const { theme } = useTheme();
  const { canEdit } = useWorkspace();
  const {
    budgetProgressList,
    goalProgressList,
    selectedMonth,
    selectedYear,
    saveBudget,
    deleteBudget,
    addGoal,
    updateGoal,
    depositGoal,
    withdrawGoal,
    deleteGoal,
  } = useFinance();

  const [activeTab, setActiveTab] = useState<'budgets' | 'goals'>('budgets');
  const [budgetModalVisible, setBudgetModalVisible] = useState(false);
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null);

  const [goalModalVisible, setGoalModalVisible] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);

  const [depositModalVisible, setDepositModalVisible] = useState(false);
  const [selectedGoalForDeposit, setSelectedGoalForDeposit] = useState<{
    id: string;
    title: string;
    currentAmount: number;
    mode: 'deposit' | 'withdraw';
  } | null>(null);

  const [goalFilter, setGoalFilter] = useState<'all' | 'active' | 'completed'>('active');

  // Overall budget numbers
  const budgetSummary = useMemo(() => {
    const totalLimit = budgetProgressList.reduce((sum, b) => sum + b.budget.limitAmount, 0);
    const totalSpent = budgetProgressList.reduce((sum, b) => sum + b.spent, 0);
    const ratio = totalLimit > 0 ? totalSpent / totalLimit : 0;
    return { totalLimit, totalSpent, ratio };
  }, [budgetProgressList]);

  // Filtered goals
  const filteredGoalList = useMemo(() => {
    if (goalFilter === 'active') {
      return goalProgressList.filter((g) => !g.isCompleted);
    }
    if (goalFilter === 'completed') {
      return goalProgressList.filter((g) => g.isCompleted);
    }
    return goalProgressList;
  }, [goalProgressList, goalFilter]);

  // Overall goal numbers
  const goalSummary = useMemo(() => {
    const totalTarget = goalProgressList.reduce((sum, g) => sum + g.goal.targetAmount, 0);
    const totalCurrent = goalProgressList.reduce((sum, g) => sum + g.goal.currentAmount, 0);
    const ratio = totalTarget > 0 ? totalCurrent / totalTarget : 0;
    const completedCount = goalProgressList.filter((g) => g.isCompleted).length;
    return { totalTarget, totalCurrent, ratio, completedCount };
  }, [goalProgressList]);

  const handleOpenDeposit = (goalId: string, currentTitle: string) => {
    const found = goalProgressList.find((g) => g.goal.id === goalId);
    setSelectedGoalForDeposit({
      id: goalId,
      title: currentTitle,
      currentAmount: found ? found.goal.currentAmount : 0,
      mode: 'deposit',
    });
    setDepositModalVisible(true);
  };

  const handleOpenWithdraw = (goalId: string, currentTitle: string, currentAmount: number) => {
    setSelectedGoalForDeposit({
      id: goalId,
      title: currentTitle,
      currentAmount,
      mode: 'withdraw',
    });
    setDepositModalVisible(true);
  };

  const handleConfirmDepositOrWithdraw = (
    amount: number,
    mode: 'deposit' | 'withdraw',
    createTransaction: boolean
  ) => {
    if (selectedGoalForDeposit) {
      if (mode === 'deposit') {
        depositGoal(selectedGoalForDeposit.id, amount, createTransaction);
      } else {
        withdrawGoal(selectedGoalForDeposit.id, amount, createTransaction);
      }
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Tab Switcher */}
      <View style={[styles.tabBar, { borderBottomColor: theme.border }]}>
        <TouchableOpacity
          style={[
            styles.tabItem,
            activeTab === 'budgets' && [styles.activeTabItem, { borderBottomColor: theme.primary }],
          ]}
          onPress={() => setActiveTab('budgets')}
        >
          <Ionicons
            name="pie-chart-outline"
            size={18}
            color={activeTab === 'budgets' ? theme.primary : theme.textMuted}
          />
          <Text
            style={[
              styles.tabText,
              { color: activeTab === 'budgets' ? theme.primary : theme.textMuted },
            ]}
          >
            Orçamentos (Tetos)
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.tabItem,
            activeTab === 'goals' && [styles.activeTabItem, { borderBottomColor: theme.primary }],
          ]}
          onPress={() => setActiveTab('goals')}
        >
          <Ionicons
            name="flag-outline"
            size={18}
            color={activeTab === 'goals' ? theme.primary : theme.textMuted}
          />
          <Text
            style={[
              styles.tabText,
              { color: activeTab === 'goals' ? theme.primary : theme.textMuted },
            ]}
          >
            Metas Financeiras
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {activeTab === 'budgets' ? (
          <>
            {/* Period Selector */}
            <View style={{ marginBottom: 12 }}>
              <PeriodSelector />
            </View>

            {/* Budgets Global Progress Card */}
            <Card variant="elevated" style={styles.headerCard}>
              <Text style={[styles.cardTitle, { color: theme.textMuted }]}>
                Teto Global em {getMonthLabel(selectedMonth, selectedYear)}
              </Text>
              <Text style={[styles.cardAmount, { color: theme.text }]}>
                {formatCurrency(budgetSummary.totalLimit)}
              </Text>

              <View style={styles.progressWrap}>
                <ProgressBar progress={budgetSummary.ratio} height={10} />
              </View>

              <View style={styles.cardBottomRow}>
                <Text style={[styles.cardBottomText, { color: theme.textMuted }]}>
                  Consumido: <Text style={{ color: theme.text, fontWeight: '700' }}>{formatCurrency(budgetSummary.totalSpent)}</Text>
                </Text>
                <Text style={[styles.cardBottomText, { color: theme.textMuted }]}>
                  {Math.round(budgetSummary.ratio * 100)}% usado
                </Text>
              </View>
            </Card>

            <View style={styles.sectionHeaderRow}>
              <View>
                <Text style={[styles.sectionTitle, { color: theme.text }]}>
                  Tetos por Categoria ({budgetProgressList.length})
                </Text>
                <Text style={[styles.sectionSubtitle, { color: theme.textMuted }]}>
                  Vigentes em {getMonthLabel(selectedMonth, selectedYear)} com alertas de consumo
                </Text>
              </View>
            </View>

            {budgetProgressList.length === 0 ? (
              <Card variant="flat" style={{ alignItems: 'center', paddingVertical: 32 }}>
                <Ionicons name="pie-chart-outline" size={36} color={theme.textMuted} />
                <Text style={{ color: theme.textMuted, marginTop: 8 }}>
                  Nenhum orçamento vigente em {getMonthLabel(selectedMonth, selectedYear)}.
                </Text>
              </Card>
            ) : (
              budgetProgressList.map((item) => (
                <BudgetItem
                  key={item.budget.id}
                  progress={item}
                  onEdit={(b) => {
                    setEditingBudget(b);
                    setBudgetModalVisible(true);
                  }}
                  onDelete={deleteBudget}
                  canEdit={canEdit}
                />
              ))
            )}
          </>
        ) : (
          <>
            {/* Goals Global Progress Card */}
            <Card variant="elevated" style={styles.headerCard}>
              <Text style={[styles.cardTitle, { color: theme.textMuted }]}>
                Progresso Geral de Metas
              </Text>
              <Text style={[styles.cardAmount, { color: theme.text }]}>
                {formatCurrency(goalSummary.totalCurrent)}
              </Text>

              <View style={styles.progressWrap}>
                <ProgressBar progress={goalSummary.ratio} height={10} color={theme.primary} />
              </View>

              <View style={styles.cardBottomRow}>
                <Text style={[styles.cardBottomText, { color: theme.textMuted }]}>
                  Objetivo Total: <Text style={{ color: theme.text, fontWeight: '700' }}>{formatCurrency(goalSummary.totalTarget)}</Text>
                </Text>
                <Text style={[styles.cardBottomText, { color: theme.textMuted }]}>
                  {Math.round(goalSummary.ratio * 100)}% acumulado
                </Text>
              </View>
            </Card>

            {/* Filter Pills for Goals */}
            <View style={styles.goalFilterRow}>
              <TouchableOpacity
                style={[
                  styles.goalFilterPill,
                  {
                    backgroundColor:
                      goalFilter === 'active' ? theme.primary : theme.surfaceVariant,
                  },
                ]}
                onPress={() => setGoalFilter('active')}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.goalFilterText,
                    { color: goalFilter === 'active' ? '#FFF' : theme.text },
                  ]}
                >
                  Em Andamento ({goalProgressList.filter((g) => !g.isCompleted).length})
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.goalFilterPill,
                  {
                    backgroundColor:
                      goalFilter === 'completed' ? theme.primary : theme.surfaceVariant,
                  },
                ]}
                onPress={() => setGoalFilter('completed')}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.goalFilterText,
                    { color: goalFilter === 'completed' ? '#FFF' : theme.text },
                  ]}
                >
                  Concluídas 🎉 ({goalSummary.completedCount})
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.goalFilterPill,
                  {
                    backgroundColor:
                      goalFilter === 'all' ? theme.primary : theme.surfaceVariant,
                  },
                ]}
                onPress={() => setGoalFilter('all')}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.goalFilterText,
                    { color: goalFilter === 'all' ? '#FFF' : theme.text },
                  ]}
                >
                  Todas ({goalProgressList.length})
                </Text>
              </TouchableOpacity>
            </View>

            {filteredGoalList.length === 0 ? (
              <Card variant="flat" style={{ alignItems: 'center', paddingVertical: 32 }}>
                <Ionicons name="flag-outline" size={36} color={theme.textMuted} />
                <Text style={{ color: theme.textMuted, marginTop: 8 }}>
                  {goalFilter === 'completed'
                    ? 'Nenhuma meta concluída ainda. Continue poupando!'
                    : 'Nenhuma meta cadastrada ainda.'}
                </Text>
              </Card>
            ) : (
              filteredGoalList.map((item) => (
                <GoalItem
                  key={item.goal.id}
                  progress={item}
                  onDeposit={handleOpenDeposit}
                  onWithdraw={handleOpenWithdraw}
                  onEdit={(g) => {
                    setEditingGoal(g);
                    setGoalModalVisible(true);
                  }}
                  onDelete={deleteGoal}
                  canEdit={canEdit}
                />
              ))
            )}
          </>
        )}
      </ScrollView>

      {/* FAB */}
      {canEdit && (
        <View style={styles.fabWrap}>
          <Button
            title={activeTab === 'budgets' ? 'Definir Teto de Gastos' : 'Criar Nova Meta'}
            icon={<Ionicons name="add" size={20} color="#FFF" />}
            onPress={() => {
              if (activeTab === 'budgets') {
                setEditingBudget(null);
                setBudgetModalVisible(true);
              } else {
                setEditingGoal(null);
                setGoalModalVisible(true);
              }
            }}
            style={styles.fab}
          />
        </View>
      )}

      {/* Modals */}
      <AddBudgetModal
        visible={budgetModalVisible}
        initialData={editingBudget}
        onClose={() => {
          setBudgetModalVisible(false);
          setEditingBudget(null);
        }}
        onSubmit={saveBudget}
      />

      <AddGoalModal
        visible={goalModalVisible}
        initialData={editingGoal}
        onClose={() => {
          setGoalModalVisible(false);
          setEditingGoal(null);
        }}
        onSubmit={async (data) => {
          if (editingGoal) {
            await updateGoal({
              ...editingGoal,
              ...data,
            });
          } else {
            await addGoal(data, data.initialAmount);
          }
          setGoalModalVisible(false);
          setEditingGoal(null);
        }}
      />

      <DepositGoalModal
        visible={depositModalVisible}
        onClose={() => {
          setDepositModalVisible(false);
          setSelectedGoalForDeposit(null);
        }}
        goalTitle={selectedGoalForDeposit?.title || ''}
        initialMode={selectedGoalForDeposit?.mode || 'deposit'}
        maxWithdrawAmount={selectedGoalForDeposit?.currentAmount || 0}
        onSubmit={handleConfirmDepositOrWithdraw}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
  },
  tabItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
  },
  activeTabItem: {},
  tabText: {
    fontSize: 14,
    fontWeight: '700',
    marginLeft: 8,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 90,
  },
  headerCard: {
    padding: 20,
    marginBottom: 20,
  },
  cardTitle: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  cardAmount: {
    fontSize: 28,
    fontWeight: '800',
    marginVertical: 6,
  },
  progressWrap: {
    marginVertical: 12,
  },
  cardBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  cardBottomText: {
    fontSize: 12,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
  },
  sectionSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  goalFilterRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  goalFilterPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  goalFilterText: {
    fontSize: 12,
    fontWeight: '700',
  },
  fabWrap: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
  },
  fab: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
});
