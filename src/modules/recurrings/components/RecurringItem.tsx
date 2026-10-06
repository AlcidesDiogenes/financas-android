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

interface RecurringItemProps {
  recurring: RecurringDebit;
  onTogglePaid: (id: string) => void;
  onEditAmount?: (id: string, currentAmount: number, title: string) => void;
  onEditFull?: (recurring: RecurringDebit) => void;
  onDelete?: (id: string) => void;
  canEdit?: boolean;
  showVigencia?: boolean;
}

export const RecurringItem: React.FC<RecurringItemProps> = ({
  recurring,
  onTogglePaid,
  onEditAmount,
  onEditFull,
  onDelete,
  canEdit = true,
  showVigencia = true,
}) => {
  const { theme } = useTheme();
  const { swipePayDirection } = useSwipeAction();
  const meta = getCategoryMeta(recurring.category);

  const translateX = useRef(new Animated.Value(0)).current;
  const currentDx = useRef(0);

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
                <Text style={[styles.assignedBadge, { color: theme.primary }]}>
                  👤 {recurring.assignedTo}
                </Text>
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
});
