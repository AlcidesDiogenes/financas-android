import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ModalContainer } from '../../../core/components/ModalContainer';
import { Button } from '../../../core/components/Button';
import { Card } from '../../../core/components/Card';
import { ProgressBar } from '../../../core/components/ProgressBar';
import { useTheme } from '../../../core/theme/ThemeContext';
import { formatCurrency } from '../../../core/utils/currency';
import { Goal, GoalTransaction } from '../types';

interface GoalHistoryModalProps {
  visible: boolean;
  onClose: () => void;
  goal: Goal | null;
  transactions: GoalTransaction[];
}

export const GoalHistoryModal: React.FC<GoalHistoryModalProps> = ({
  visible,
  onClose,
  goal,
  transactions,
}) => {
  const { theme } = useTheme();

  if (!goal) return null;

  const percentage =
    goal.targetAmount > 0
      ? Math.min(100, Math.round((goal.currentAmount / goal.targetAmount) * 100))
      : 0;

  const formatDateTime = (isoString: string): string => {
    try {
      const d = new Date(isoString);
      if (isNaN(d.getTime())) return '';
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();
      const hours = String(d.getHours()).padStart(2, '0');
      const mins = String(d.getMinutes()).padStart(2, '0');
      return `${day}/${month}/${year} às ${hours}:${mins}`;
    } catch {
      return '';
    }
  };

  return (
    <ModalContainer
      visible={visible}
      onClose={onClose}
      title="Histórico da Meta"
    >
      {/* Header Resumo da Meta */}
      <Card variant="flat" style={[styles.summaryCard, { backgroundColor: theme.surfaceVariant }]}>
        <View style={styles.summaryTopRow}>
          <View style={[styles.iconWrap, { backgroundColor: `${goal.color}25` }]}>
            <Ionicons name={goal.icon as any} size={22} color={goal.color} />
          </View>
          <View style={{ flex: 1, marginRight: 8 }}>
            <Text style={[styles.goalTitle, { color: theme.text }]} numberOfLines={1}>
              {goal.title}
            </Text>
            <Text style={[styles.goalSub, { color: theme.textMuted }]}>
              {formatCurrency(goal.currentAmount)} de {formatCurrency(goal.targetAmount)} ({percentage}%)
            </Text>
          </View>
        </View>

        <View style={{ marginTop: 10 }}>
          <ProgressBar progress={percentage / 100} color={goal.color} height={8} />
        </View>
      </Card>

      {/* Título da Seção */}
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>
          Movimentações Realizadas
        </Text>
        <Text style={[styles.sectionCount, { color: theme.textMuted }]}>
          {transactions.length} {transactions.length === 1 ? 'registro' : 'registros'}
        </Text>
      </View>

      {/* Lista de Movimentações */}
      <ScrollView style={styles.historyList} showsVerticalScrollIndicator={false}>
        {transactions.length === 0 ? (
          <View style={styles.emptyWrap}>
            <Ionicons name="receipt-outline" size={40} color={theme.textMuted} />
            <Text style={[styles.emptyTitle, { color: theme.text }]}>
              Nenhum histórico registrado
            </Text>
            <Text style={[styles.emptySubtitle, { color: theme.textMuted }]}>
              Os aportes e resgates futuros feitos nesta meta ficarão registrados aqui com data, hora e responsável.
            </Text>
          </View>
        ) : (
          transactions.map((item) => {
            const isDeposit = item.type === 'deposit';
            const actionColor = isDeposit ? theme.success : theme.danger;

            return (
              <View
                key={item.id}
                style={[
                  styles.historyItem,
                  {
                    backgroundColor: theme.card,
                    borderColor: theme.border,
                  },
                ]}
              >
                <View
                  style={[
                    styles.historyIconWrap,
                    { backgroundColor: `${actionColor}18` },
                  ]}
                >
                  <Ionicons
                    name={isDeposit ? 'arrow-down-circle' : 'arrow-up-circle'}
                    size={22}
                    color={actionColor}
                  />
                </View>

                <View style={styles.historyInfo}>
                  <Text style={[styles.historyActionTitle, { color: theme.text }]}>
                    {isDeposit ? 'Aporte na Meta' : 'Resgate da Meta'}
                  </Text>
                  <Text style={[styles.historyDate, { color: theme.textMuted }]}>
                    {formatDateTime(item.date)}
                  </Text>
                  {item.createdBy ? (
                    <View style={styles.userRow}>
                      <Ionicons name="person-circle-outline" size={13} color={theme.primary} />
                      <Text style={[styles.userName, { color: theme.primary }]}>
                        Por {item.createdBy}
                      </Text>
                    </View>
                  ) : null}
                  {item.notes ? (
                    <Text style={[styles.historyNotes, { color: theme.textMuted }]} numberOfLines={2}>
                      {item.notes}
                    </Text>
                  ) : null}
                </View>

                <View style={styles.historyRight}>
                  <Text style={[styles.historyAmount, { color: actionColor }]}>
                    {isDeposit ? '+ ' : '- '}
                    {formatCurrency(item.amount)}
                  </Text>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>

      {/* Botão Fechar */}
      <Button
        title="Fechar"
        variant="secondary"
        onPress={onClose}
        style={{ marginTop: 16 }}
      />
    </ModalContainer>
  );
};

const styles = StyleSheet.create({
  summaryCard: {
    padding: 14,
    borderRadius: 14,
    marginBottom: 16,
  },
  summaryTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconWrap: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  goalTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  goalSub: {
    fontSize: 12,
    marginTop: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  sectionCount: {
    fontSize: 12,
    fontWeight: '500',
  },
  historyList: {
    maxHeight: 340,
  },
  emptyWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
    paddingHorizontal: 20,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginTop: 10,
  },
  emptySubtitle: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
  },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
  },
  historyIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  historyInfo: {
    flex: 1,
  },
  historyActionTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  historyDate: {
    fontSize: 11,
    marginTop: 2,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 3,
    gap: 3,
  },
  userName: {
    fontSize: 11,
    fontWeight: '600',
  },
  historyNotes: {
    fontSize: 11,
    marginTop: 3,
    fontStyle: 'italic',
  },
  historyRight: {
    alignItems: 'flex-end',
    marginLeft: 8,
  },
  historyAmount: {
    fontSize: 14,
    fontWeight: '800',
  },
});
