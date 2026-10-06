import React, { useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  PanResponder,
  Alert,
  Vibration,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { RecurringDebit } from '../types';
import { useTheme } from '../../../core/theme/ThemeContext';
import { useSwipeAction } from '../../../core/theme/SwipeActionContext';
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
  showVigencia?: boolean;
  selectedMonth?: number;
  selectedYear?: number;
  isReorderMode?: boolean;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  onLongPress?: () => void;
}

export const RecurringItem: React.FC<RecurringItemProps> = ({
  recurring,
  onTogglePaid,
  onEditAmount,
  onEditFull,
  onDelete,
  canEdit = true,
  showVigencia = true,
  selectedMonth,
  selectedYear,
  isReorderMode = false,
  onMoveUp,
  onMoveDown,
  onLongPress,
}) => {
  const { theme } = useTheme();
  const { swipePayDirection } = useSwipeAction();
  const meta = getCategoryMeta(recurring.category);

  const translateX = useRef(new Animated.Value(0)).current;
  const currentDx = useRef(0);
  const longPressTimer = useRef<any>(null);

  const urgencyInfo = useMemo(() => {
    if (recurring.isPaused) {
      return {
        status: 'paused',
        label: 'Pausada',
        badgeLabel: 'Pausada',
        variant: 'neutral' as const,
        icon: 'pause-circle',
        color: '#6B7280',
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
        status: 'paid',
        label: paidLabel,
        badgeLabel: paidLabel,
        variant: 'success' as const,
        icon: 'checkmark-circle',
        color: theme.success,
      };
    }

    const now = new Date();
    const curMonth = now.getMonth() + 1;
    const curYear = now.getFullYear();
    const curDay = now.getDate();

    const month = selectedMonth || curMonth;
    const year = selectedYear || curYear;

    const isCurrentCompetence = month === curMonth && year === curYear;
    const isPastCompetence = year < curYear || (year === curYear && month < curMonth);
    const isFutureCompetence = year > curYear || (year === curYear && month > curMonth);

    const defaultBadgeLabel = recurring.type === 'income' ? 'A Receber' : 'Pendente';

    if (isPastCompetence) {
      return {
        status: 'overdue',
        label: recurring.type === 'income' ? 'Não Recebido' : 'Em Atraso',
        badgeLabel: recurring.type === 'income' ? 'Não Recebido' : 'Atrasada',
        variant: 'danger' as const,
        icon: 'alert-circle',
        color: '#EF4444',
      };
    }

    if (isFutureCompetence) {
      return {
        status: 'future',
        label: `${recurring.type === 'income' ? 'Recebe' : 'Vence'} dia ${recurring.dueDay}`,
        badgeLabel: defaultBadgeLabel,
        variant: 'warning' as const,
        icon: 'calendar',
        color: theme.textMuted,
      };
    }

    // Competência atual
    if (curDay > recurring.dueDay) {
      const diff = curDay - recurring.dueDay;
      const text = diff === 1 ? 'Venceu ontem' : `Venceu há ${diff}d`;
      return {
        status: 'overdue',
        label: recurring.type === 'income' ? 'Atrasado' : text,
        badgeLabel: recurring.type === 'income' ? 'Atrasado' : 'Atrasada',
        variant: 'danger' as const,
        icon: 'warning',
        color: '#EF4444',
      };
    }

    if (curDay === recurring.dueDay) {
      return {
        status: 'today',
        label: recurring.type === 'income' ? 'Recebe Hoje!' : 'Vence Hoje!',
        badgeLabel: recurring.type === 'income' ? 'Recebe Hoje' : 'Vence Hoje',
        variant: 'warning' as const,
        icon: 'flash',
        color: '#F59E0B',
      };
    }

    const diffToDue = recurring.dueDay - curDay;
    if (diffToDue === 1) {
      return {
        status: 'soon',
        label: `${recurring.type === 'income' ? 'Recebe' : 'Vence'} amanhã`,
        badgeLabel: 'Vence Amanhã',
        variant: 'warning' as const,
        icon: 'time',
        color: '#F59E0B',
      };
    }

    if (diffToDue <= 5) {
      return {
        status: 'soon',
        label: `Vence em ${diffToDue} dias`,
        badgeLabel: defaultBadgeLabel,
        variant: 'warning' as const,
        icon: 'time',
        color: '#F59E0B',
      };
    }

    return {
      status: 'upcoming',
      label: `Vence dia ${recurring.dueDay}`,
      badgeLabel: defaultBadgeLabel,
      variant: 'warning' as const,
      icon: 'calendar-outline',
      color: theme.textMuted,
    };
  }, [
    recurring.isPaused,
    recurring.isPaidCurrentMonth,
    recurring.paidAt,
    recurring.dueDay,
    recurring.type,
    selectedMonth,
    selectedYear,
    theme,
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
      onStartShouldSetPanResponder: () => {
        if (!canEdit || isReorderMode) return false;
        if (onLongPress) {
          if (longPressTimer.current) clearTimeout(longPressTimer.current);
          longPressTimer.current = setTimeout(() => {
            try {
              Vibration.vibrate(50);
            } catch {}
            onLongPress();
          }, 600);
        }
        return false;
      },
      onMoveShouldSetPanResponder: (_, gestureState) => {
        if (!canEdit || isReorderMode) return false;
        if (longPressTimer.current) {
          clearTimeout(longPressTimer.current);
          longPressTimer.current = null;
        }
        // Só captura se o movimento horizontal for predominante e perceptível
        const isHorizontal = Math.abs(gestureState.dx) > Math.abs(gestureState.dy) * 1.5;
        const hasMoved = Math.abs(gestureState.dx) > 10;
        if (!isHorizontal || !hasMoved) return false;

        // Se estiver tentando arrastar na direção de exclusão mas onDelete não existir (ex: na HomeScreen)
        if (gestureState.dx > 0) {
          const isDeleteSide = swipePayDirection === 'left';
          if (isDeleteSide && !onDelete) return false;
        } else {
          const isDeleteSide = swipePayDirection === 'right';
          if (isDeleteSide && !onDelete) return false;
        }

        return true;
      },
      onPanResponderMove: (_, gestureState) => {
        if (longPressTimer.current) {
          clearTimeout(longPressTimer.current);
          longPressTimer.current = null;
        }
        let dx = gestureState.dx;
        // Se arrastar para a direção de exclusão e não tiver onDelete, não deixa passar de 0
        if (swipePayDirection === 'right' && dx < 0 && !onDelete) {
          dx = 0;
        } else if (swipePayDirection === 'left' && dx > 0 && !onDelete) {
          dx = 0;
        }
        // Limita o arrasto máximo com amortecimento
        const maxDrag = 130;
        const clampedDx = Math.max(-maxDrag, Math.min(maxDrag, dx));
        translateX.setValue(clampedDx);
        currentDx.current = clampedDx;
      },
      onPanResponderRelease: () => {
        if (longPressTimer.current) {
          clearTimeout(longPressTimer.current);
          longPressTimer.current = null;
        }
        const threshold = 65;
        const dx = currentDx.current;

        const isPaySide =
          swipePayDirection === 'right' ? dx >= threshold : dx <= -threshold;
        const isDeleteSide =
          swipePayDirection === 'right' ? dx <= -threshold : dx >= threshold;

        if (isPaySide) {
          // Dispara marcar como pago/recebido
          Animated.spring(translateX, {
            toValue: 0,
            useNativeDriver: true,
            bounciness: 4,
          }).start();
          onTogglePaid(recurring.id);
        } else if (isDeleteSide && onDelete) {
          // Dispara confirmação de exclusão
          Animated.spring(translateX, {
            toValue: 0,
            useNativeDriver: true,
            bounciness: 4,
          }).start();
          Alert.alert(
            'Excluir Conta Recorrente?',
            `Deseja realmente excluir "${recurring.title}"?`,
            [
              { text: 'Cancelar', style: 'cancel' },
              {
                text: 'Excluir',
                style: 'destructive',
                onPress: () => onDelete(recurring.id),
              },
            ]
          );
        } else {
          // Não atingiu o limite: volta para 0 suavemente
          Animated.spring(translateX, {
            toValue: 0,
            useNativeDriver: true,
            bounciness: 4,
          }).start();
        }
        currentDx.current = 0;
      },
      onPanResponderTerminate: () => {
        if (longPressTimer.current) {
          clearTimeout(longPressTimer.current);
          longPressTimer.current = null;
        }
        Animated.spring(translateX, {
          toValue: 0,
          useNativeDriver: true,
          bounciness: 4,
        }).start();
        currentDx.current = 0;
      },
    });
  }, [canEdit, isReorderMode, onDelete, onLongPress, swipePayDirection, recurring, onTogglePaid, translateX]);

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
        {/* Lado Esquerdo (acionado quando arrasta para a DIREITA) */}
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

        {/* Lado Direito (acionado quando arrasta para a ESQUERDA) */}
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
            ) : !recurring.isPaidCurrentMonth && (urgencyInfo.status === 'overdue' || urgencyInfo.status === 'today' || urgencyInfo.status === 'soon') ? (
              <View style={[styles.urgencyTag, { backgroundColor: `${urgencyInfo.color}15`, borderColor: `${urgencyInfo.color}40` }]}>
                <Ionicons name={urgencyInfo.icon as any} size={10} color={urgencyInfo.color} style={{ marginRight: 3 }} />
                <Text style={[styles.urgencyTagText, { color: urgencyInfo.color }]}>
                  {urgencyInfo.label}
                </Text>
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
            {recurring.assignedTo ? (
              <>
                <Text style={[styles.dot, { color: theme.textMuted }]}>•</Text>
                <View style={[styles.assignedChip, { backgroundColor: `${theme.primary}12` }]}>
                  <Ionicons name="person" size={10} color={theme.primary} style={{ marginRight: 3 }} />
                  <Text style={[styles.assignedBadge, { color: theme.primary }]}>
                    {recurring.assignedTo}
                  </Text>
                </View>
              </>
            ) : null}
          </View>

          {vigenciaLabel && (
            <View style={styles.vigenciaRow}>
              <Ionicons name="time-outline" size={12} color={theme.textMuted} style={{ marginRight: 3 }} />
              <Text style={[styles.vigenciaText, { color: theme.textMuted }]} numberOfLines={1}>
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
              onPress={() => onTogglePaid(recurring.id)}
              style={styles.badgeBtn}
            >
              <Badge
                label={urgencyInfo.badgeLabel}
                variant={urgencyInfo.variant}
              />
            </TouchableOpacity>

            {canEdit && onEditFull && !isReorderMode && (
              <TouchableOpacity
                onPress={() => onEditFull(recurring)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                style={styles.actionIconBtn}
              >
                <Ionicons name="create-outline" size={17} color={theme.textMuted} />
              </TouchableOpacity>
            )}

            {isReorderMode && (
              <View style={styles.reorderCol}>
                <TouchableOpacity
                  onPress={onMoveUp}
                  disabled={!onMoveUp}
                  style={[styles.reorderBtn, !onMoveUp && { opacity: 0.25 }]}
                  hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                >
                  <Ionicons name="chevron-up" size={17} color={theme.primary} />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={onMoveDown}
                  disabled={!onMoveDown}
                  style={[styles.reorderBtn, !onMoveDown && { opacity: 0.25 }]}
                  hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                >
                  <Ionicons name="chevron-down" size={17} color={theme.primary} />
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  swipeWrapper: {
    borderRadius: 14,
    marginBottom: 8,
    overflow: 'hidden',
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
    borderWidth: 1,
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
  reorderCol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginLeft: 6,
  },
  reorderBtn: {
    padding: 4,
    borderRadius: 6,
    backgroundColor: '#8B5CF618',
  },
});
