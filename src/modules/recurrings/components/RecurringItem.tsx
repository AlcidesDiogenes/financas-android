import React, { useRef, useMemo, useState } from 'react';
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
  onDragStart?: (id: string) => void;
  onDragMove?: (id: string, slotsMoved: number) => void;
  onDragEnd?: () => void;
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
  onDragStart,
  onDragMove,
  onDragEnd,
}) => {
  const { theme } = useTheme();
  const { swipePayDirection } = useSwipeAction();
  const meta = getCategoryMeta(recurring.category);

  const translateX = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(0)).current;
  const currentDx = useRef(0);

  const holdTimer = useRef<any>(null);
  const startPos = useRef({ x: 0, y: 0 });
  const isDraggingRef = useRef(false);
  const [isDragging, setIsDragging] = useState(false);

  const itemStatus = useMemo(() => {
    if (recurring.isPaused) {
      return {
        label: 'Pausada',
        variant: 'neutral' as const,
        color: '#6B7280',
        icon: 'pause-circle',
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
        variant: 'success' as const,
        color: theme.success,
        icon: 'checkmark-circle',
      };
    }

    return {
      label: recurring.type === 'income' ? 'A Receber' : 'Pendente',
      variant: 'warning' as const,
      color: theme.warning,
      icon: 'time-outline',
    };
  }, [
    recurring.isPaused,
    recurring.isPaidCurrentMonth,
    recurring.paidAt,
    recurring.type,
    theme.success,
    theme.warning,
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
        if (!canEdit || isDraggingRef.current) return false;
        // Só captura se o movimento horizontal for predominante e perceptível
        const isHorizontal = Math.abs(gestureState.dx) > Math.abs(gestureState.dy) * 1.8;
        const hasMoved = Math.abs(gestureState.dx) > 12;
        if (!isHorizontal || !hasMoved) return false;

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
        if (isDraggingRef.current) return;
        let dx = gestureState.dx;
        if (swipePayDirection === 'right' && dx < 0 && !onDelete) {
          dx = 0;
        } else if (swipePayDirection === 'left' && dx > 0 && !onDelete) {
          dx = 0;
        }
        const maxDrag = 130;
        const clampedDx = Math.max(-maxDrag, Math.min(maxDrag, dx));
        translateX.setValue(clampedDx);
        currentDx.current = clampedDx;
      },
      onPanResponderRelease: () => {
        if (isDraggingRef.current) return;
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
          onTogglePaid(recurring.id);
        } else if (isDeleteSide && onDelete) {
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
  }, [canEdit, onDelete, swipePayDirection, recurring, onTogglePaid, translateX]);

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

      {/* Card da Frente Deslizável & Arrastável por 4 segundos */}
      <Animated.View
        style={[
          styles.container,
          {
            backgroundColor: theme.card,
            borderColor: isDragging ? theme.primary : theme.border,
            borderWidth: isDragging ? 2 : 1,
            transform: [{ translateX }, { translateY }, { scale: isDragging ? 1.03 : 1 }],
            zIndex: isDragging ? 9999 : 1,
            elevation: isDragging ? 10 : 0,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: isDragging ? 6 : 0 },
            shadowOpacity: isDragging ? 0.35 : 0,
            shadowRadius: isDragging ? 8 : 0,
          },
        ]}
        onTouchStart={(e) => {
          if (!canEdit || !onDragStart) return;
          startPos.current = { x: e.nativeEvent.pageX, y: e.nativeEvent.pageY };
          if (holdTimer.current) clearTimeout(holdTimer.current);

          // Segurar por 2,5 segundos (2500ms)
          holdTimer.current = setTimeout(() => {
            isDraggingRef.current = true;
            setIsDragging(true);
            try {
              Vibration.vibrate([0, 120, 60, 120]);
            } catch {}
            onDragStart(recurring.id);
          }, 2500);
        }}
        onTouchMove={(e) => {
          if (!isDraggingRef.current) {
            // Se o dedo se mover mais de 8px antes de completar os 2,5 segundos, cancela o timer
            // Isso evita completamente que o modo ative sozinho ao rolar a tela ou ao dar toques rápidos!
            const dx = Math.abs(e.nativeEvent.pageX - startPos.current.x);
            const dy = Math.abs(e.nativeEvent.pageY - startPos.current.y);
            if (dx > 8 || dy > 8) {
              if (holdTimer.current) {
                clearTimeout(holdTimer.current);
                holdTimer.current = null;
              }
            }
          } else {
            // Em modo arrasto ativo após 2,5 segundos:
            const dy = e.nativeEvent.pageY - startPos.current.y;
            translateY.setValue(dy);
          }
        }}
        onTouchEnd={(e) => {
          if (holdTimer.current) {
            clearTimeout(holdTimer.current);
            holdTimer.current = null;
          }
          if (isDraggingRef.current) {
            isDraggingRef.current = false;
            setIsDragging(false);
            const dy = e.nativeEvent.pageY - startPos.current.y;
            const slotsMoved = Math.round(dy / 68);
            if (slotsMoved !== 0 && onDragMove) {
              onDragMove(recurring.id, slotsMoved);
              try {
                Vibration.vibrate(50);
              } catch {}
            }
            Animated.spring(translateY, { toValue: 0, useNativeDriver: true }).start();
            if (onDragEnd) onDragEnd();
          }
        }}
        onTouchCancel={() => {
          if (holdTimer.current) {
            clearTimeout(holdTimer.current);
            holdTimer.current = null;
          }
          if (isDraggingRef.current) {
            isDraggingRef.current = false;
            setIsDragging(false);
            Animated.spring(translateY, { toValue: 0, useNativeDriver: true }).start();
            if (onDragEnd) onDragEnd();
          }
        }}
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
            {isDragging ? (
              <View style={[styles.urgencyTag, { backgroundColor: `${theme.primary}25`, borderColor: theme.primary }]}>
                <Ionicons name="move" size={10} color={theme.primary} style={{ marginRight: 3 }} />
                <Text style={[styles.urgencyTagText, { color: theme.primary }]}>Arrastando</Text>
              </View>
            ) : recurring.isPaused ? (
              <View style={[styles.urgencyTag, { backgroundColor: '#6B728020', borderColor: '#6B728040' }]}>
                <Ionicons name="pause" size={10} color="#6B7280" style={{ marginRight: 3 }} />
                <Text style={[styles.urgencyTagText, { color: '#6B7280' }]}>Pausada</Text>
              </View>
            ) : recurring.isPaidCurrentMonth ? (
              <View style={[styles.urgencyTag, { backgroundColor: `${theme.success}15`, borderColor: `${theme.success}40` }]}>
                <Ionicons name="checkmark-circle" size={10} color={theme.success} style={{ marginRight: 3 }} />
                <Text style={[styles.urgencyTagText, { color: theme.success }]}>{itemStatus.label}</Text>
              </View>
            ) : null}
          </View>

          <View style={styles.subInfo}>
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
              onPress={() => onTogglePaid(recurring.id)}
              style={styles.badgeBtn}
            >
              <Badge
                label={itemStatus.label}
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
