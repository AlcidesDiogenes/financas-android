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
  onDelete?: (id: string) => void;
  canEdit?: boolean;
}

export const RecurringItem: React.FC<RecurringItemProps> = ({
  recurring,
  onTogglePaid,
  onDelete,
  canEdit = true,
}) => {
  const { theme } = useTheme();
  const meta = getCategoryMeta(recurring.category);

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
            Vence todo dia {recurring.dueDay}
          </Text>
          <Text style={[styles.dot, { color: theme.textMuted }]}>•</Text>
          <Text style={[styles.subText, { color: theme.textMuted }]}>
            {recurring.category}
          </Text>
        </View>
      </View>

      <View style={styles.right}>
        <Text style={[styles.amount, { color: theme.text }]}>
          {formatCurrency(recurring.amount)}
        </Text>

        <View style={styles.actionsRow}>
          <TouchableOpacity
            disabled={!canEdit}
            onPress={() => onTogglePaid(recurring.id)}
            style={styles.badgeBtn}
          >
            <Badge
              label={recurring.isPaidCurrentMonth ? 'Pago' : 'Pendente'}
              variant={recurring.isPaidCurrentMonth ? 'success' : 'warning'}
            />
          </TouchableOpacity>

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
  right: {
    alignItems: 'flex-end',
    marginLeft: 8,
  },
  amount: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 4,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  badgeBtn: {
    marginRight: 6,
  },
  deleteBtn: {
    marginLeft: 4,
  },
});
