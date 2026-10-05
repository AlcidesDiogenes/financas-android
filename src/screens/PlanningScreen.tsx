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
import { Ionicons } from '@expo/vector-icons';

export const PlanningScreen: React.FC = () => {
  const { theme } = useTheme();
  const { canEdit } = useWorkspace();
  const {
    budgetProgressList,
    goalProgressList,
    saveBudget,
    deleteBudget,
    addGoal,
    depositGoal,
    deleteGoal,
  } = useFinance();

  const [activeTab, setActiveTab] = useState<'budgets' | 'goals'>('budgets');
  const [budgetModalVisible, setBudgetModalVisible] = useState(false);
  const [goalModalVisible, setGoalModalVisible] = useState(false);

  const [depositModalVisible, setDepositModalVisible] = useState(false);
  const [selectedGoalForDeposit, setSelectedGoalForDeposit] = useState<{
    id: string;
    title: string;
  } | null>(null);

  // Overall budget numbers
  const budgetSummary = useMemo(() => {
    const totalLimit = budgetProgressList.reduce((sum, b) => sum + b.budget.limitAmount, 0);
    const totalSpent = budgetProgressList.reduce((sum, b) => sum + b.spent, 0);
    const ratio = totalLimit > 0 ? totalSpent / totalLimit : 0;
    return { totalLimit, totalSpent, ratio };
  }, [budgetProgressList]);

  // Overall goal numbers
  const goalSummary = useMemo(() => {
    const totalTarget = goalProgressList.reduce((sum, g) => sum + g.goal.targetAmount, 0);
    const totalCurrent = goalProgressList.reduce((sum, g) => sum + g.goal.currentAmount, 0);
    const ratio = totalTarget > 0 ? totalCurrent / totalTarget : 0;
    return { totalTarget, totalCurrent, ratio };
  }, [goalProgressList]);

  const handleOpenDeposit = (goalId: string, currentTitle: string) => {
    setSelectedGoalForDeposit({ id: goalId, title: currentTitle });
    setDepositModalVisible(true);
  };

  const handleConfirmDeposit = (amount: number) => {
    if (selectedGoalForDeposit) {
      depositGoal(selectedGoalForDeposit.id, amount);
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
            {/* Budgets Global Progress Card */}
            <Card variant="elevated" style={styles.headerCard}>
              <Text style={[styles.cardTitle, { color: theme.textMuted }]}>
                Teto Global Planejado no Mês
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

            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>
                Tetos por Categoria ({budgetProgressList.length})
              </Text>
              <Text style={[styles.sectionSubtitle, { color: theme.textMuted }]}>
                Alertas automáticos para evitar gastos excessivos
              </Text>
            </View>

            {budgetProgressList.length === 0 ? (
              <Card variant="flat" style={{ alignItems: 'center', paddingVertical: 32 }}>
                <Ionicons name="pie-chart-outline" size={36} color={theme.textMuted} />
                <Text style={{ color: theme.textMuted, marginTop: 8 }}>
                  Nenhum orçamento configurado.
                </Text>
              </Card>
            ) : (
              budgetProgressList.map((item) => (
                <BudgetItem
                  key={item.budget.id}
                  progress={item}
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
                Progresso Geral das Metas
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

            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>
                Metas Ativas ({goalProgressList.length})
              </Text>
              <Text style={[styles.sectionSubtitle, { color: theme.textMuted }]}>
                Faça aportes e acompanhe suas conquistas
              </Text>
            </View>

            {goalProgressList.length === 0 ? (
              <Card variant="flat" style={{ alignItems: 'center', paddingVertical: 32 }}>
                <Ionicons name="flag-outline" size={36} color={theme.textMuted} />
                <Text style={{ color: theme.textMuted, marginTop: 8 }}>
                  Nenhuma meta cadastrada ainda.
                </Text>
              </Card>
            ) : (
              goalProgressList.map((item) => (
                <GoalItem
                  key={item.goal.id}
                  progress={item}
                  onDeposit={handleOpenDeposit}
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
                setBudgetModalVisible(true);
              } else {
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
        onClose={() => setBudgetModalVisible(false)}
        onSubmit={saveBudget}
      />

      <AddGoalModal
        visible={goalModalVisible}
        onClose={() => setGoalModalVisible(false)}
        onSubmit={(data) => addGoal(data, data.initialAmount)}
      />

      <DepositGoalModal
        visible={depositModalVisible}
        onClose={() => {
          setDepositModalVisible(false);
          setSelectedGoalForDeposit(null);
        }}
        goalTitle={selectedGoalForDeposit?.title || ''}
        onSubmit={handleConfirmDeposit}
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
  sectionHeader: {
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
