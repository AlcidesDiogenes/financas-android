import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Transaction } from '../types';
import { useTheme } from '../../../core/theme/ThemeContext';
import { formatCurrency } from '../../../core/utils/currency';
import { formatShortDate } from '../../../core/utils/date';
import { getCategoryMeta } from '../../../core/utils/categories';
import { confirmAndRun } from '../../../core/utils/runSafely';

interface TransactionItemProps {
  transaction: Transaction;
  onDelete?: (id: string) => void | Promise<void>;
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
          {transaction.assignedTo ? (
            <>
              <Text style={[styles.dot, { color: theme.textMuted }]}>•</Text>
              <Text style={{ fontSize: 12, fontWeight: '600', color: theme.primary }}>
                👤 {transaction.assignedTo}
              </Text>
            </>
          ) : null}
        </View>
        {transaction.paidBy ? (
          <View style={styles.paidByRow}>
            <Ionicons
              name="checkmark-circle"
              size={12}
              color={isIncome ? theme.success : theme.primary}
              style={{ marginRight: 3 }}
            />
            <Text
              style={[
                styles.paidByText,
                { color: isIncome ? theme.success : theme.primary },
              ]}
              numberOfLines={1}
            >
              {isIncome ? 'Recebido por' : 'Pago por'} {transaction.paidBy}
            </Text>
          </View>
        ) : null}
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
            onPress={() =>
              confirmAndRun(
                'Excluir lançamento?',
                `"${transaction.title}" será removido do extrato. Esta ação não pode ser desfeita.`,
                () => onDelete(transaction.id),
                'Não foi possível excluir o lançamento.'
              )
            }
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
  paidByRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 3,
  },
  paidByText: {
    fontSize: 11,
    fontWeight: '600',
  },
});
