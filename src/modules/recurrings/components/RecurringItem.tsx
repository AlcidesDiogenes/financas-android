import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { RecurringDebit } from '../types';
import { useTheme } from '../../../core/theme/ThemeContext';
import { formatCurrency } from '../../../core/utils/currency';
import { getCategoryMeta } from '../../../core/utils/categories';
import { Badge } from '../../../core/components/Badge';

interface RecurringItemProps {
  recurring: RecurringDebit;
  onTogglePaid: (id: string) => void;
  onEditAmount?: (id: string, currentAmount: number, title: string) => void;
  onEditFull?: (recurring: RecurringDebit) => void;
  onDelete?: (id: string) => void;
  canEdit?: boolean;
}

export const RecurringItem: React.FC<RecurringItemProps> = ({
  recurring,
  onTogglePaid,
  onEditAmount,
  onEditFull,
  onDelete,
  canEdit = true,
}) => {
  const { theme } = useTheme();
  const meta = getCategoryMeta(recurring.category);

  const vigenciaLabel = React.useMemo(() => {
    if (!recurring.startDate && !recurring.endDate) return null;
    const formatYm = (ym: string) => {
      const parts = ym.split('-');
      if (parts.length >= 2) return `${parts[1]}/${parts[0]}`;
      return ym;
    };
    if (recurring.startDate && recurring.endDate) {
      return `${formatYm(recurring.startDate)} até ${formatYm(recurring.endDate)}`;
    }
    if (recurring.startDate) {
      return `A partir de ${formatYm(recurring.startDate)}`;
    }
    if (recurring.endDate) {
      return `Até ${formatYm(recurring.endDate)}`;
    }
    return null;
  }, [recurring.startDate, recurring.endDate]);

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
        <View style={styles.titleRow}>
          <Text style={[styles.title, { color: theme.text }]} numberOfLines={1}>
            {recurring.title}
          </Text>
        </View>

        <View style={styles.subInfo}>
          <Text style={[styles.subText, { color: theme.textMuted }]}>
            {recurring.type === 'income' ? 'Recebe todo dia' : 'Vence todo dia'} {recurring.dueDay}
          </Text>
          <Text style={[styles.dot, { color: theme.textMuted }]}>•</Text>
          <Text style={[styles.subText, { color: theme.textMuted }]}>
            {recurring.category}
          </Text>
          {recurring.assignedTo ? (
            <>
              <Text style={[styles.dot, { color: theme.textMuted }]}>•</Text>
              <Text style={[styles.assignedBadge, { color: theme.primary }]}>
                👤 {recurring.assignedTo}
              </Text>
            </>
          ) : null}
        </View>

        {vigenciaLabel && (
          <View style={styles.vigenciaRow}>
            <Ionicons name="time-outline" size={12} color={theme.textMuted} style={{ marginRight: 3 }} />
            <Text style={[styles.vigenciaText, { color: theme.textMuted }]}>
              {vigenciaLabel}
            </Text>
          </View>
        )}
      </View>

      <View style={styles.right}>
        <TouchableOpacity
          disabled={!canEdit || !onEditAmount}
          onPress={() => onEditAmount && onEditAmount(recurring.id, recurring.amount, recurring.title)}
          style={styles.amountTouchable}
          hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
        >
          <Text
            style={[
              styles.amount,
              { color: recurring.type === 'income' ? theme.success : theme.text },
            ]}
          >
            {recurring.type === 'income' ? `+ ${formatCurrency(recurring.amount)}` : formatCurrency(recurring.amount)}
          </Text>
          {canEdit && onEditAmount && (
            <Ionicons name="pencil" size={12} color={theme.textMuted} style={{ marginLeft: 4 }} />
          )}
        </TouchableOpacity>

        <View style={styles.actionsRow}>
          <TouchableOpacity
            disabled={!canEdit}
            onPress={() => onTogglePaid(recurring.id)}
            style={styles.badgeBtn}
          >
            <Badge
              label={
                recurring.type === 'income'
                  ? recurring.isPaidCurrentMonth
                    ? 'Recebido'
                    : 'A Receber'
                  : recurring.isPaidCurrentMonth
                  ? 'Pago'
                  : 'Pendente'
              }
              variant={recurring.isPaidCurrentMonth ? 'success' : 'warning'}
            />
          </TouchableOpacity>

          {canEdit && onEditFull && (
            <TouchableOpacity
              onPress={() => onEditFull(recurring)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              style={styles.actionIconBtn}
            >
              <Ionicons name="create-outline" size={17} color={theme.textMuted} />
            </TouchableOpacity>
          )}

          {canEdit && onDelete && (
            <TouchableOpacity
              onPress={() => onDelete(recurring.id)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              style={styles.deleteBtn}
            >
              <Ionicons name="trash-outline" size={16} color={theme.textMuted} />
            </TouchableOpacity>
          )}
        </View>
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
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  title: {
    fontSize: 15,
    fontWeight: '600',
  },
  subInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  subText: {
    fontSize: 12,
  },
  dot: {
    marginHorizontal: 6,
    fontSize: 12,
  },
  vigenciaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 3,
  },
  vigenciaText: {
    fontSize: 11,
    fontWeight: '500',
  },
  right: {
    alignItems: 'flex-end',
    marginLeft: 8,
  },
  amount: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 4,
  },
  amountTouchable: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  assignedBadge: {
    fontSize: 12,
    fontWeight: '600',
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  badgeBtn: {
    marginRight: 6,
  },
  actionIconBtn: {
    padding: 3,
    marginRight: 4,
  },
  deleteBtn: {
    padding: 3,
  },
});
