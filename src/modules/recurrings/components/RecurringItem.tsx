import React, { useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  PanResponder,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { RecurringDebit } from '../types';
import { useTheme } from '../../../core/theme/ThemeContext';
import { useSwipeAction } from '../../../core/theme/SwipeActionContext';
import { formatCurrency } from '../../../core/utils/currency';
import { getCategoryMeta } from '../../../core/utils/categories';
import { Badge } from '../../../core/components/Badge';
import { runSafely } from '../../../core/utils/runSafely';

interface RecurringItemProps {
  recurring: RecurringDebit;
  onTogglePaid: (id: string) => void | Promise<void>;
  onEditAmount?: (id: string, currentAmount: number, title: string) => void;
  onEditFull?: (recurring: RecurringDebit) => void;
  onDelete?: (id: string) => void | Promise<void>;
  onRequestDelete?: (recurring: RecurringDebit) => void;
  canEdit?: boolean;
  showVigencia?: boolean;
  selectedMonth?: number;
  selectedYear?: number;
}

export const RecurringItem: React.FC<RecurringItemProps> = ({
  recurring,
  onTogglePaid,
  onEditAmount,
  onEditFull,
  onDelete,
  onRequestDelete,
  canEdit = true,
  showVigencia = true,
  selectedMonth,
  selectedYear,
}) => {
  const { theme } = useTheme();
  const { swipePayDirection } = useSwipeAction();
  const meta = getCategoryMeta(recurring.category);

  const translateX = useRef(new Animated.Value(0)).current;
  const currentDx = useRef(0);

  const itemStatus = useMemo(() => {
    if (recurring.isPaused) {
      return {
        label: 'Pausada',
        badgeLabel: 'Pausada',
        variant: 'neutral' as const,
      };
    }

    if (recurring.isPaidCurrentMonth) {
      let paidLabel = recurring.type === 'income' ? 'Recebido' : 'Pago';
      if (recurring.paidAt) {
        try {
          const d = new Date(recurring.paidAt);
          const day = String(d.getDate()).padStart(2, '0');
          const mon = String(d.getMonth() + 1).padStart(2, '0');
          paidLabel = `${paidLabel} ${day}/${mon}`;
        } catch {}
      }
      return {
        label: paidLabel,
        badgeLabel: paidLabel,
        variant: 'success' as const,
      };
    }

    return {
      label: recurring.type === 'income' ? 'A Receber' : 'Pendente',
      badgeLabel: recurring.type === 'income' ? 'A Receber' : 'Pendente',
      variant: 'warning' as const,
    };
  }, [
    recurring.isPaused,
    recurring.isPaidCurrentMonth,
    recurring.paidAt,
    recurring.type,
  ]);

  const vigenciaLabel = useMemo(() => {
    if (!showVigencia) return null;
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
  }, [showVigencia, recurring.startDate, recurring.endDate]);

  const panResponder = useMemo(() => {
    return PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        if (!canEdit) return false;
        // Só captura se o movimento horizontal for predominante e perceptível
        const isHorizontal = Math.abs(gestureState.dx) > Math.abs(gestureState.dy) * 1.8;
        const hasMoved = Math.abs(gestureState.dx) > 12;
        if (!isHorizontal || !hasMoved) return false;

        const hasDelete = !!onRequestDelete || !!onDelete;
        if (gestureState.dx > 0) {
          const isDeleteSide = swipePayDirection === 'left';
          if (isDeleteSide && !hasDelete) return false;
        } else {
          const isDeleteSide = swipePayDirection === 'right';
          if (isDeleteSide && !hasDelete) return false;
        }

        return true;
      },
      onPanResponderMove: (_, gestureState) => {
        let dx = gestureState.dx;
        const hasDelete = !!onRequestDelete || !!onDelete;
        if (swipePayDirection === 'right' && dx < 0 && !hasDelete) {
          dx = 0;
        } else if (swipePayDirection === 'left' && dx > 0 && !hasDelete) {
          dx = 0;
        }
        const maxDrag = 130;
        const clampedDx = Math.max(-maxDrag, Math.min(maxDrag, dx));
        translateX.setValue(clampedDx);
        currentDx.current = clampedDx;
      },
      onPanResponderRelease: () => {
        const threshold = 65;
        const dx = currentDx.current;

        const isPaySide =
          swipePayDirection === 'right' ? dx >= threshold : dx <= -threshold;
        const isDeleteSide =
          swipePayDirection === 'right' ? dx <= -threshold : dx >= threshold;

        if (isPaySide) {
          Animated.spring(translateX, {
            toValue: 0,
            useNativeDriver: true,
            bounciness: 4,
          }).start();
          runSafely(() => onTogglePaid(recurring.id), 'Não foi possível atualizar o pagamento da conta.');
        } else if (isDeleteSide && (onRequestDelete || onDelete)) {
          Animated.spring(translateX, {
            toValue: 0,
            useNativeDriver: true,
            bounciness: 4,
          }).start();
          if (onRequestDelete) {
            onRequestDelete(recurring);
          } else if (onDelete) {
            Alert.alert(
              'Excluir Conta Recorrente?',
              `Deseja realmente excluir "${recurring.title}"?`,
              [
                { text: 'Cancelar', style: 'cancel' },
                {
                  text: 'Excluir',
                  style: 'destructive',
                  onPress: () => {
                    runSafely(() => onDelete(recurring.id), 'Não foi possível excluir a conta recorrente.');
                  },
                },
              ]
            );
          }
        } else {
          Animated.spring(translateX, {
            toValue: 0,
            useNativeDriver: true,
            bounciness: 4,
          }).start();
        }
        currentDx.current = 0;
      },
      onPanResponderTerminate: () => {
        Animated.spring(translateX, {
          toValue: 0,
          useNativeDriver: true,
          bounciness: 4,
        }).start();
        currentDx.current = 0;
      },
    });
  }, [canEdit, onDelete, onRequestDelete, swipePayDirection, recurring, onTogglePaid, translateX]);

  // Interpolações de opacidade para os fundos de ação
  const leftOpacity = translateX.interpolate({
    inputRange: [0, 35],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  const rightOpacity = translateX.interpolate({
    inputRange: [-35, 0],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });

  const isLeftPay = swipePayDirection === 'right';
  const payLabel = recurring.type === 'income'
    ? recurring.isPaidCurrentMonth ? 'Desmarcar' : 'Recebido'
    : recurring.isPaidCurrentMonth ? 'Desmarcar' : 'Pago';

  return (
    <View style={styles.swipeWrapper}>
      {/* Camada Traseira (Background de Ação Revelado ao Deslizar) */}
      <View style={StyleSheet.absoluteFill}>
        {/* Lado Esquerdo */}
        <Animated.View
          style={[
            styles.actionBackground,
            styles.leftAction,
            {
              backgroundColor: isLeftPay ? '#10B981' : '#EF4444',
              opacity: leftOpacity,
            },
          ]}
        >
          <Ionicons
            name={
              isLeftPay
                ? recurring.isPaidCurrentMonth
                  ? 'close-circle-outline'
                  : 'checkmark-circle-outline'
                : 'trash-outline'
            }
            size={22}
            color="#FFF"
          />
          <Text style={styles.actionText}>{isLeftPay ? payLabel : 'Excluir'}</Text>
        </Animated.View>

        {/* Lado Direito */}
        <Animated.View
          style={[
            styles.actionBackground,
            styles.rightAction,
            {
              backgroundColor: isLeftPay ? '#EF4444' : '#10B981',
              opacity: rightOpacity,
            },
          ]}
        >
          <Text style={styles.actionText}>{isLeftPay ? 'Excluir' : payLabel}</Text>
          <Ionicons
            name={
              !isLeftPay
                ? recurring.isPaidCurrentMonth
                  ? 'close-circle-outline'
                  : 'checkmark-circle-outline'
                : 'trash-outline'
            }
            size={22}
            color="#FFF"
          />
        </Animated.View>
      </View>

      {/* Card da Frente Deslizável */}
      <Animated.View
        style={[
          styles.container,
          {
            backgroundColor: theme.card,
            borderColor: theme.border,
            borderWidth: 1,
            transform: [{ translateX }],
          },
        ]}
        {...panResponder.panHandlers}
      >
        <View style={[styles.iconContainer, { backgroundColor: `${meta.color}20` }]}>
          <Ionicons name={meta.icon as any} size={22} color={meta.color} />
        </View>

        <View style={styles.info}>
          <View style={styles.titleRow}>
            <Text style={[styles.title, { color: theme.text }]} numberOfLines={1}>
              {recurring.title}
            </Text>
            {recurring.isPaused ? (
              <View style={[styles.urgencyTag, { backgroundColor: '#6B728020', borderColor: '#6B728040' }]}>
                <Ionicons name="pause" size={10} color="#6B7280" style={{ marginRight: 3 }} />
                <Text style={[styles.urgencyTagText, { color: '#6B7280' }]}>Pausada</Text>
              </View>
            ) : null}
          </View>

          <View style={styles.subInfo}>
            <Text style={[styles.subText, { color: theme.textMuted }]}>
              {recurring.type === 'income' ? 'Recebe dia' : 'Vence dia'} {recurring.dueDay}
            </Text>
            <Text style={[styles.dot, { color: theme.textMuted }]}>•</Text>
            <Text style={[styles.subText, { color: theme.textMuted }]}>
              {recurring.category}
            </Text>
            {recurring.assignedTo && (
              <>
                <Text style={[styles.dot, { color: theme.textMuted }]}>•</Text>
                <View style={[styles.assignedChip, { backgroundColor: `${theme.primary}15` }]}>
                  <Ionicons name="person-outline" size={10} color={theme.primary} style={{ marginRight: 3 }} />
                  <Text style={[styles.assignedBadge, { color: theme.primary }]}>
                    {recurring.assignedTo}
                  </Text>
                </View>
              </>
            )}
          </View>

          {vigenciaLabel && (
            <View style={styles.vigenciaRow}>
              <Ionicons name="calendar-outline" size={11} color={theme.textMuted} style={{ marginRight: 4 }} />
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
            activeOpacity={canEdit && onEditAmount ? 0.7 : 1}
          >
            <Text
              style={[
                styles.amount,
                { color: recurring.type === 'income' ? theme.success : theme.text },
              ]}
              numberOfLines={1}
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
              onPress={() => runSafely(() => onTogglePaid(recurring.id), 'Não foi possível atualizar o pagamento da conta.')}
              style={styles.badgeBtn}
            >
              <Badge
                label={itemStatus.badgeLabel}
                variant={itemStatus.variant}
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
          </View>
        </View>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  swipeWrapper: {
    marginBottom: 8,
    position: 'relative',
  },
  actionBackground: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    borderRadius: 14,
  },
  leftAction: {
    justifyContent: 'flex-start',
    gap: 8,
  },
  rightAction: {
    justifyContent: 'flex-end',
    gap: 8,
  },
  actionText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '700',
  },
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 14,
  },
  iconContainer: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    flexShrink: 0,
  },
  info: {
    flex: 1,
    minWidth: 0,
    marginRight: 8,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
  },
  subInfo: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  subText: {
    fontSize: 12,
  },
  dot: {
    marginHorizontal: 4,
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
    justifyContent: 'center',
    flexShrink: 0,
  },
  amount: {
    fontSize: 14,
    fontWeight: '700',
  },
  amountTouchable: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  assignedBadge: {
    fontSize: 11,
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
  },
  urgencyTag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    marginLeft: 6,
  },
  urgencyTagText: {
    fontSize: 10,
    fontWeight: '700',
  },
  assignedChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 5,
  },
});
