import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Transaction } from '../types';
import { useTheme } from '../../../core/theme/ThemeContext';
import { formatCurrency } from '../../../core/utils/currency';
import { formatShortDate } from '../../../core/utils/date';
import { getCategoryMeta } from '../../../core/utils/categories';

interface TransactionItemProps {
  transaction: Transaction;
  onDelete?: (id: string) => void;
  canEdit?: boolean;
}

export const TransactionItem: React.FC<TransactionItemProps> = ({
  transaction,
  onDelete,
  canEdit = true,
}) => {
  const { theme } = useTheme();
  const meta = getCategoryMeta(transaction.category);
  const isIncome = transaction.type === 'income';

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
      <View style={[styles.iconContainer, { backgroundColor: `${meta.color}20` }]}>
        <Ionicons name={meta.icon as any} size={22} color={meta.color} />
      </View>

      <View style={styles.info}>
        <Text style={[styles.title, { color: theme.text }]} numberOfLines={1}>
          {transaction.title}
        </Text>
        <View style={styles.subInfo}>
          <Text style={[styles.category, { color: theme.textMuted }]}>
            {transaction.category}
          </Text>
          <Text style={[styles.dot, { color: theme.textMuted }]}>•</Text>
          <Text style={[styles.date, { color: theme.textMuted }]}>
            {formatShortDate(transaction.date)}
          </Text>
        </View>
      </View>

      <View style={styles.right}>
        <Text
          style={[
            styles.amount,
            { color: isIncome ? theme.success : theme.danger },
          ]}
        >
          {isIncome ? '+ ' : '- '}
          {formatCurrency(transaction.amount)}
        </Text>

        {canEdit && onDelete && (
          <TouchableOpacity
            onPress={() => onDelete(transaction.id)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            style={styles.deleteBtn}
          >
            <Ionicons name="trash-outline" size={16} color={theme.textMuted} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 8,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  info: {
    flex: 1,
  },
  title: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
  },
  subInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  category: {
    fontSize: 12,
  },
  dot: {
    marginHorizontal: 6,
    fontSize: 12,
  },
  date: {
    fontSize: 12,
  },
  right: {
    alignItems: 'flex-end',
    marginLeft: 8,
  },
  amount: {
    fontSize: 15,
    fontWeight: '700',
  },
  deleteBtn: {
    marginTop: 4,
  },
});
