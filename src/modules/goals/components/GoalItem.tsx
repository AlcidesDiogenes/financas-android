import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { GoalProgress } from '../types';
import { useTheme } from '../../../core/theme/ThemeContext';
import { formatCurrency } from '../../../core/utils/currency';
import { formatShortDate } from '../../../core/utils/date';
import { ProgressBar } from '../../../core/components/ProgressBar';
import { Badge } from '../../../core/components/Badge';

interface GoalItemProps {
  progress: GoalProgress;
  onDeposit: (goalId: string, currentTitle: string) => void;
  onDelete?: (id: string) => void;
  canEdit?: boolean;
}

export const GoalItem: React.FC<GoalItemProps> = ({
  progress,
  onDeposit,
  onDelete,
  canEdit = true,
}) => {
  const { theme } = useTheme();
  const { goal, percentage, remainingAmount, isCompleted } = progress;

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.card,
          borderColor: isCompleted ? theme.success : theme.border,
        },
      ]}
    >
      <View style={styles.topRow}>
        <View style={styles.left}>
          <View style={[styles.iconWrap, { backgroundColor: `${goal.color}20` }]}>
            <Ionicons name={goal.icon as any} size={22} color={goal.color} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.title, { color: theme.text }]} numberOfLines={1}>
              {goal.title}
            </Text>
            <Text style={[styles.deadline, { color: theme.textMuted }]}>
              Meta até {formatShortDate(goal.deadlineDate)}
            </Text>
          </View>
        </View>

        <View style={styles.right}>
          {isCompleted ? (
            <Badge label="Concluída! 🎉" variant="success" />
          ) : (
            <Badge label={`${percentage}%`} variant="info" />
          )}

          {canEdit && onDelete && (
            <TouchableOpacity
              onPress={() => onDelete(goal.id)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              style={styles.delBtn}
            >
              <Ionicons name="trash-outline" size={16} color={theme.textMuted} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <View style={styles.progressContainer}>
        <ProgressBar progress={percentage / 100} color={goal.color} height={10} />
      </View>

      <View style={styles.numbersRow}>
        <View>
          <Text style={[styles.numLabel, { color: theme.textMuted }]}>Acumulado</Text>
          <Text style={[styles.numValue, { color: theme.text }]}>
            {formatCurrency(goal.currentAmount)}
          </Text>
        </View>

        <View style={{ alignItems: 'flex-end' }}>
          <Text style={[styles.numLabel, { color: theme.textMuted }]}>Objetivo</Text>
          <Text style={[styles.numValue, { color: theme.text }]}>
            {formatCurrency(goal.targetAmount)}
          </Text>
        </View>
      </View>

      {/* Quick Deposit Button */}
      {canEdit && !isCompleted && (
        <TouchableOpacity
          style={[styles.depositBtn, { backgroundColor: theme.surfaceVariant }]}
          onPress={() => onDeposit(goal.id, goal.title)}
        >
          <Ionicons name="add-circle-outline" size={18} color={theme.primary} />
          <Text style={[styles.depositBtnText, { color: theme.primary }]}>
            Fazer Aporte nesta Meta
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 14,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  left: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 8,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
  },
  deadline: {
    fontSize: 12,
    marginTop: 2,
  },
  right: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  delBtn: {
    marginLeft: 8,
  },
  progressContainer: {
    marginVertical: 14,
  },
  numbersRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  numLabel: {
    fontSize: 12,
  },
  numValue: {
    fontSize: 15,
    fontWeight: '700',
    marginTop: 2,
  },
  depositBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
  },
  depositBtnText: {
    fontSize: 13,
    fontWeight: '700',
    marginLeft: 6,
  },
});
