import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Budget, BudgetProgress } from '../types';
import { useTheme } from '../../../core/theme/ThemeContext';
import { formatCurrency } from '../../../core/utils/currency';
import { getCategoryMeta } from '../../../core/utils/categories';
import { ProgressBar } from '../../../core/components/ProgressBar';
import { Badge } from '../../../core/components/Badge';

interface BudgetItemProps {
  progress: BudgetProgress;
  onEdit?: (budget: Budget) => void;
  onDelete?: (id: string) => void;
  canEdit?: boolean;
}

export const BudgetItem: React.FC<BudgetItemProps> = ({
  progress,
  onEdit,
  onDelete,
  canEdit = true,
}) => {
  const { theme } = useTheme();
  const { budget, spent, remaining, percentage, isExceeded, isWarning, dailyRemainingBudget } = progress;
  const meta = getCategoryMeta(budget.category);

  const getStatusBadge = () => {
    if (isExceeded) {
      return <Badge label="Estourado" variant="danger" />;
    }
    if (isWarning) {
      return <Badge label="Atenção" variant="warning" />;
    }
    return <Badge label="No Limite" variant="success" />;
  };

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.card,
          borderColor: isExceeded ? theme.danger : theme.border,
        },
      ]}
    >
      <View style={styles.topRow}>
        <View style={styles.left}>
          <View style={[styles.iconWrap, { backgroundColor: `${meta.color}20` }]}>
            <Ionicons name={meta.icon as any} size={20} color={meta.color} />
          </View>
          <View>
            <Text style={[styles.category, { color: theme.text }]}>
              {budget.category}
            </Text>
            <Text style={[styles.sub, { color: theme.textMuted }]}>
              Teto: {formatCurrency(budget.limitAmount)}
            </Text>
            {(budget.startDate || budget.endDate) && (
              <Text style={[styles.vigenciaText, { color: theme.textMuted }]}>
                {budget.startDate && budget.endDate
                  ? `Vigência: ${budget.startDate.split('-')[1]}/${budget.startDate.split('-')[0]} até ${budget.endDate.split('-')[1]}/${budget.endDate.split('-')[0]}`
                  : budget.startDate
                  ? `Vigência: a partir de ${budget.startDate.split('-')[1]}/${budget.startDate.split('-')[0]}`
                  : `Vigência: até ${budget.endDate!.split('-')[1]}/${budget.endDate!.split('-')[0]}`}
              </Text>
            )}
          </View>
        </View>

        <View style={styles.right}>
          {getStatusBadge()}

          {canEdit && onEdit && (
            <TouchableOpacity
              onPress={() => onEdit(budget)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              style={styles.actionBtn}
            >
              <Ionicons name="create-outline" size={17} color={theme.textMuted} />
            </TouchableOpacity>
          )}

          {canEdit && onDelete && (
            <TouchableOpacity
              onPress={() => onDelete(budget.id)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              style={styles.actionBtn}
            >
              <Ionicons name="trash-outline" size={16} color={theme.textMuted} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Progress Bar */}
      <View style={styles.progressContainer}>
        <ProgressBar progress={percentage / 100} height={8} />
      </View>

      <View style={styles.bottomRow}>
        <Text style={[styles.bottomText, { color: theme.textMuted }]}>
          Gasto: <Text style={{ color: theme.text, fontWeight: '700' }}>{formatCurrency(spent)}</Text>
        </Text>
        <Text
          style={[
            styles.bottomText,
            { color: isExceeded ? theme.danger : theme.success, fontWeight: '600' },
          ]}
        >
          {isExceeded
            ? `Excedido em ${formatCurrency(Math.abs(remaining))}`
            : `Resta ${formatCurrency(remaining)}`}
        </Text>
      </View>

      {!isExceeded && dailyRemainingBudget !== undefined && dailyRemainingBudget > 0 && (
        <View style={[styles.dailyRow, { borderTopColor: theme.border }]}>
          <Ionicons name="calendar-outline" size={13} color={theme.textMuted} />
          <Text style={[styles.dailyText, { color: theme.textMuted }]}>
            Disponível para gastar: <Text style={{ fontWeight: '700', color: theme.text }}>{formatCurrency(dailyRemainingBudget)}/dia</Text> até o fim do mês
          </Text>
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
    marginBottom: 12,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconWrap: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  category: {
    fontSize: 15,
    fontWeight: '700',
  },
  sub: {
    fontSize: 12,
    marginTop: 1,
  },
  vigenciaText: {
    fontSize: 11,
    marginTop: 2,
    fontWeight: '500',
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
    marginVertical: 12,
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  bottomText: {
    fontSize: 12,
  },
  dailyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    paddingTop: 8,
    marginTop: 10,
    gap: 5,
  },
  dailyText: {
    fontSize: 11,
  },
});
