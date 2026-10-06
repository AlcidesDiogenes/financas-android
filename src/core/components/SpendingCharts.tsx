import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { usePrivacy } from '../theme/PrivacyContext';
import { formatCurrency } from '../utils/currency';
import { getCategoryMeta } from '../utils/categories';
import { Transaction, TransactionCategory } from '../../modules/transactions/types';
import { Ionicons } from '@expo/vector-icons';

interface CategorySpending {
  category: TransactionCategory;
  total: number;
  percentage: number;
}

interface SpendingChartsProps {
  categorySpendings: CategorySpending[];
  totalExpense: number;
  allTransactions?: Transaction[];
}

interface MonthHistoryData {
  month: number;
  year: number;
  label: string;
  income: number;
  expense: number;
  balance: number;
}

export const SpendingCharts: React.FC<SpendingChartsProps> = ({
  categorySpendings,
  totalExpense,
  allTransactions = [],
}) => {
  const { theme } = useTheme();
  const { isPrivacyMode } = usePrivacy();
  const [chartMode, setChartMode] = useState<'categories' | 'history'>('categories');
  const [selectedHistoryMonth, setSelectedHistoryMonth] = useState<MonthHistoryData | null>(null);

  // Compute 6-month historical data
  const sixMonthsHistory = useMemo((): MonthHistoryData[] => {
    if (!allTransactions || allTransactions.length === 0) return [];

    const now = new Date();
    const result: MonthHistoryData[] = [];
    const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const m = d.getMonth() + 1;
      const y = d.getFullYear();

      const monthTxs = allTransactions.filter((t) => {
        const txDate = new Date(t.date);
        return txDate.getMonth() + 1 === m && txDate.getFullYear() === y;
      });

      const income = monthTxs
        .filter((t) => t.type === 'income')
        .reduce((sum, t) => sum + t.amount, 0);

      const expense = monthTxs
        .filter((t) => t.type === 'expense')
        .reduce((sum, t) => sum + t.amount, 0);

      result.push({
        month: m,
        year: y,
        label: monthNames[m - 1],
        income,
        expense,
        balance: income - expense,
      });
    }

    return result;
  }, [allTransactions]);

  const maxHistoryValue = useMemo(() => {
    let max = 1;
    sixMonthsHistory.forEach((item) => {
      if (item.income > max) max = item.income;
      if (item.expense > max) max = item.expense;
    });
    return max;
  }, [sixMonthsHistory]);

  const hasHistory = sixMonthsHistory.length > 0 && sixMonthsHistory.some((m) => m.income > 0 || m.expense > 0);
  const hasCategories = categorySpendings.length > 0 && totalExpense > 0;

  if (!hasCategories && !hasHistory) {
    return null;
  }

  // Top 5 categories
  const topCategories = categorySpendings.slice(0, 5);

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.card,
          borderColor: theme.border,
        },
      ]}
    >
      <View style={styles.headerRow}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.title, { color: theme.text }]}>
            {chartMode === 'categories' ? 'Distribuição de Despesas' : 'Evolução dos Últimos 6 Meses'}
          </Text>
          <Text style={[styles.subtitle, { color: theme.textMuted }]}>
            {chartMode === 'categories' ? 'Para onde foi seu dinheiro este mês' : 'Comparativo de receitas e despesas'}
          </Text>
        </View>

        {hasHistory && hasCategories && (
          <View style={[styles.modeToggle, { backgroundColor: theme.surfaceVariant }]}>
            <TouchableOpacity
              style={[
                styles.modeBtn,
                chartMode === 'categories' && [styles.modeBtnActive, { backgroundColor: theme.primary }],
              ]}
              onPress={() => setChartMode('categories')}
            >
              <Ionicons
                name="pie-chart-outline"
                size={14}
                color={chartMode === 'categories' ? '#FFF' : theme.textMuted}
              />
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.modeBtn,
                chartMode === 'history' && [styles.modeBtnActive, { backgroundColor: theme.primary }],
              ]}
              onPress={() => setChartMode('history')}
            >
              <Ionicons
                name="bar-chart-outline"
                size={14}
                color={chartMode === 'history' ? '#FFF' : theme.textMuted}
              />
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* VIEW 1: CATEGORIES BREAKDOWN */}
      {chartMode === 'categories' && (
        <>
          {/* Segmented Combined Bar */}
          <View style={[styles.segmentedBar, { backgroundColor: theme.surfaceVariant }]}>
            {topCategories.map((item, idx) => {
              const meta = getCategoryMeta(item.category);
              return (
                <View
                  key={idx}
                  style={{
                    width: `${Math.max(item.percentage, 2)}%`,
                    height: 12,
                    backgroundColor: meta.color,
                    borderRadius: idx === 0 || idx === topCategories.length - 1 ? 6 : 0,
                  }}
                />
              );
            })}
          </View>

          {/* Category breakdown items */}
          <View style={styles.itemsList}>
            {topCategories.map((item, idx) => {
              const meta = getCategoryMeta(item.category);
              const formattedAmount = isPrivacyMode
                ? 'R$ •••••'
                : formatCurrency(item.total);

              return (
                <View key={idx} style={styles.catRow}>
                  <View style={styles.catLeft}>
                    <View style={[styles.colorDot, { backgroundColor: meta.color }]} />
                    <Text style={[styles.catName, { color: theme.text }]}>
                      {item.category}
                    </Text>
                  </View>

                  <View style={styles.catRight}>
                    <Text style={[styles.catAmount, { color: theme.text }]}>
                      {formattedAmount}
                    </Text>
                    <Text style={[styles.catPercent, { color: theme.textMuted }]}>
                      ({Math.round(item.percentage)}%)
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>
        </>
      )}

      {/* VIEW 2: 6 MONTHS EVOLUTION */}
      {chartMode === 'history' && (
        <View style={styles.historyContainer}>
          {/* Chart Legend */}
          <View style={styles.legendRow}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: theme.success }]} />
              <Text style={[styles.legendText, { color: theme.textMuted }]}>Receitas</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: theme.danger }]} />
              <Text style={[styles.legendText, { color: theme.textMuted }]}>Despesas</Text>
            </View>
          </View>

          {/* Bars Chart Area */}
          <View style={styles.chartBarsRow}>
            {sixMonthsHistory.map((m, idx) => {
              const incomeHeight = maxHistoryValue > 0 ? (m.income / maxHistoryValue) * 85 : 0;
              const expenseHeight = maxHistoryValue > 0 ? (m.expense / maxHistoryValue) * 85 : 0;
              const isSelected = selectedHistoryMonth?.month === m.month && selectedHistoryMonth?.year === m.year;

              return (
                <TouchableOpacity
                  key={idx}
                  style={[
                    styles.historyCol,
                    isSelected && { backgroundColor: `${theme.primary}15`, borderRadius: 8 },
                  ]}
                  onPress={() => setSelectedHistoryMonth(m)}
                  activeOpacity={0.7}
                >
                  <View style={styles.barsGroup}>
                    {/* Income Bar */}
                    <View
                      style={[
                        styles.bar,
                        {
                          height: Math.max(incomeHeight, m.income > 0 ? 4 : 0),
                          backgroundColor: theme.success,
                        },
                      ]}
                    />
                    {/* Expense Bar */}
                    <View
                      style={[
                        styles.bar,
                        {
                          height: Math.max(expenseHeight, m.expense > 0 ? 4 : 0),
                          backgroundColor: theme.danger,
                        },
                      ]}
                    />
                  </View>
                  <Text
                    style={[
                      styles.monthLabelText,
                      { color: isSelected ? theme.primary : theme.text, fontWeight: isSelected ? '800' : '600' },
                    ]}
                  >
                    {m.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Details for Selected or Latest Month */}
          {(() => {
            const activeMonth = selectedHistoryMonth || sixMonthsHistory[sixMonthsHistory.length - 1];
            if (!activeMonth) return null;
            return (
              <View style={[styles.historyDetailCard, { backgroundColor: theme.surfaceVariant }]}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={[styles.historyDetailTitle, { color: theme.text }]}>
                    Competência: {activeMonth.label}/{activeMonth.year}
                  </Text>
                  <Text
                    style={[
                      styles.historyDetailBalance,
                      { color: activeMonth.balance >= 0 ? theme.success : theme.danger },
                    ]}
                  >
                    Saldo: {isPrivacyMode ? 'R$ •••••' : formatCurrency(activeMonth.balance)}
                  </Text>
                </View>

                <View style={styles.historyDetailRow}>
                  <Text style={{ fontSize: 12, color: theme.textMuted }}>
                    🟢 Receitas: <Text style={{ color: theme.success, fontWeight: '700' }}>{isPrivacyMode ? '••••' : formatCurrency(activeMonth.income)}</Text>
                  </Text>
                  <Text style={{ fontSize: 12, color: theme.textMuted }}>
                    🔴 Despesas: <Text style={{ color: theme.danger, fontWeight: '700' }}>{isPrivacyMode ? '••••' : formatCurrency(activeMonth.expense)}</Text>
                  </Text>
                </View>
              </View>
            );
          })()}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 16,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  modeToggle: {
    flexDirection: 'row',
    padding: 3,
    borderRadius: 8,
  },
  modeBtn: {
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modeBtnActive: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 2,
  },
  segmentedBar: {
    flexDirection: 'row',
    height: 12,
    borderRadius: 6,
    overflow: 'hidden',
    marginVertical: 10,
  },
  itemsList: {
    marginTop: 8,
  },
  catRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  catLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  colorDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 8,
  },
  catName: {
    fontSize: 13,
    fontWeight: '600',
  },
  catRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  catAmount: {
    fontSize: 13,
    fontWeight: '700',
    marginRight: 6,
  },
  catPercent: {
    fontSize: 12,
  },
  historyContainer: {
    marginTop: 4,
  },
  legendRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 12,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  legendText: {
    fontSize: 11,
    fontWeight: '600',
  },
  chartBarsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 110,
    paddingHorizontal: 4,
    marginBottom: 12,
  },
  historyCol: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingVertical: 4,
  },
  barsGroup: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 3,
    height: 85,
  },
  bar: {
    width: 9,
    borderTopLeftRadius: 3,
    borderTopRightRadius: 3,
  },
  monthLabelText: {
    fontSize: 11,
    marginTop: 6,
  },
  historyDetailCard: {
    padding: 10,
    borderRadius: 10,
  },
  historyDetailTitle: {
    fontSize: 12,
    fontWeight: '700',
  },
  historyDetailBalance: {
    fontSize: 12,
    fontWeight: '800',
  },
  historyDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
  },
});
