import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { usePrivacy } from '../theme/PrivacyContext';
import { formatCurrency } from '../utils/currency';
import { getCategoryMeta } from '../utils/categories';
import { TransactionCategory } from '../../modules/transactions/types';

interface CategorySpending {
  category: TransactionCategory;
  total: number;
  percentage: number;
}

interface SpendingChartsProps {
  categorySpendings: CategorySpending[];
  totalExpense: number;
}

export const SpendingCharts: React.FC<SpendingChartsProps> = ({
  categorySpendings,
  totalExpense,
}) => {
  const { theme } = useTheme();
  const { isPrivacyMode } = usePrivacy();

  if (categorySpendings.length === 0 || totalExpense === 0) {
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
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.text }]}>
          Distribuição de Despesas
        </Text>
        <Text style={[styles.subtitle, { color: theme.textMuted }]}>
          Para onde foi seu dinheiro este mês
        </Text>
      </View>

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
  header: {
    marginBottom: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 12,
    marginTop: 2,
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
});
