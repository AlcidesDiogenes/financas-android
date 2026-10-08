import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Goal, GoalProgress } from '../types';
import { useTheme } from '../../../core/theme/ThemeContext';
import { formatCurrency } from '../../../core/utils/currency';
import { formatMonthYear } from '../../../core/utils/date';
import { ProgressBar } from '../../../core/components/ProgressBar';
import { Badge } from '../../../core/components/Badge';
import { confirmAndRun } from '../../../core/utils/runSafely';

interface GoalItemProps {
  progress: GoalProgress;
  onDeposit: (goalId: string, currentTitle: string) => void;
  onWithdraw?: (goalId: string, currentTitle: string, currentAmount: number) => void;
  onEdit?: (goal: Goal) => void;
  onDelete?: (id: string) => void | Promise<void>;
  onPress?: (goal: Goal) => void;
  canEdit?: boolean;
}

export const GoalItem: React.FC<GoalItemProps> = ({
  progress,
  onDeposit,
  onWithdraw,
  onEdit,
  onDelete,
  onPress,
  canEdit = true,
}) => {
  const { theme } = useTheme();
  const { goal, percentage, remainingAmount, isCompleted, monthsRemaining, monthlyNeeded } = progress;

  return (
    <TouchableOpacity
      activeOpacity={onPress ? 0.8 : 1}
      onPress={() => onPress && onPress(goal)}
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
              Meta até {formatMonthYear(goal.deadlineDate)} ({monthsRemaining} {monthsRemaining === 1 ? 'mês' : 'meses'})
            </Text>
          </View>
        </View>

        <View style={styles.right}>
          {isCompleted ? (
            <Badge label="Concluída! 🎉" variant="success" style={{ alignSelf: 'center' }} />
          ) : (
            <Badge label={`${percentage}%`} variant="info" style={{ alignSelf: 'center' }} />
          )}

          {canEdit && onEdit && (
            <TouchableOpacity
              onPress={() => onEdit(goal)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              style={styles.actionBtn}
            >
              <Ionicons name="create-outline" size={17} color={theme.textMuted} />
            </TouchableOpacity>
          )}

          {canEdit && onDelete && (
            <TouchableOpacity
              onPress={() =>
              confirmAndRun(
                'Excluir meta?',
                `A meta "${goal.title}" será removida. Esta ação não pode ser desfeita.`,
                () => onDelete(goal.id),
                'Não foi possível excluir a meta.'
              )
            }
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              style={styles.actionBtn}
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

        {!isCompleted && monthlyNeeded > 0 && (
          <View style={{ alignItems: 'center' }}>
            <Text style={[styles.numLabel, { color: theme.textMuted }]}>Esforço Mensal</Text>
            <Text style={[styles.numValue, { color: theme.primary }]}>
              {formatCurrency(monthlyNeeded)}/mês
            </Text>
          </View>
        )}

        <View style={{ alignItems: 'flex-end' }}>
          <Text style={[styles.numLabel, { color: theme.textMuted }]}>Objetivo</Text>
          <Text style={[styles.numValue, { color: theme.text }]}>
            {formatCurrency(goal.targetAmount)}
          </Text>
        </View>
      </View>

      {goal.notes ? (
        <View style={[styles.notesWrap, { backgroundColor: theme.surfaceVariant }]}>
          <Ionicons name="information-circle-outline" size={14} color={theme.textMuted} />
          <Text style={[styles.notesText, { color: theme.textMuted }]} numberOfLines={2}>
            {goal.notes}
          </Text>
        </View>
      ) : null}

      {/* Action Buttons */}
      {canEdit && (
        <View style={styles.btnRow}>
          <TouchableOpacity
            style={[styles.depositBtn, { backgroundColor: theme.primary, flex: 1 }]}
            onPress={() => onDeposit(goal.id, goal.title)}
          >
            <Ionicons name="arrow-down-circle" size={16} color="#FFF" />
            <Text style={[styles.depositBtnText, { color: '#FFF' }]}>
              Guardar / Aporte
            </Text>
          </TouchableOpacity>

          {goal.currentAmount > 0 && onWithdraw && (
            <TouchableOpacity
              style={[styles.depositBtn, { backgroundColor: theme.surfaceVariant, flex: 1 }]}
              onPress={() => onWithdraw(goal.id, goal.title, goal.currentAmount)}
            >
              <Ionicons name="arrow-up-circle" size={16} color={theme.text} />
              <Text style={[styles.depositBtnText, { color: theme.text }]}>
                Resgatar
              </Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Footer hint para ver histórico */}
      <View style={styles.historyHintRow}>
        <Ionicons name="time-outline" size={12} color={theme.textMuted} />
        <Text style={[styles.historyHintText, { color: theme.textMuted }]}>
          Toque no card para ver o histórico de movimentações
        </Text>
      </View>
    </TouchableOpacity>
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
    gap: 8,
  },
  actionBtn: {
    padding: 4,
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
  notesWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderRadius: 8,
    marginBottom: 12,
    gap: 6,
  },
  notesText: {
    fontSize: 12,
    flex: 1,
  },
  btnRow: {
    flexDirection: 'row',
    gap: 8,
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
  historyHintRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    gap: 4,
  },
  historyHintText: {
    fontSize: 11,
    fontWeight: '500',
  },
});
