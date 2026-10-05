import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { useTheme } from '../core/theme/ThemeContext';
import { useFinance } from '../modules/FinanceContext';
import { useWorkspace } from '../modules/workspaces/WorkspaceContext';
import { RecurringItem } from '../modules/recurrings/components/RecurringItem';
import { AddRecurringModal } from '../modules/recurrings/components/AddRecurringModal';
import { formatCurrency } from '../core/utils/currency';
import { Card } from '../core/components/Card';
import { Button } from '../core/components/Button';
import { Ionicons } from '@expo/vector-icons';

export const RecurringsScreen: React.FC = () => {
  const { theme } = useTheme();
  const { canEdit } = useWorkspace();
  const {
    recurrings,
    addRecurring,
    toggleRecurringPaid,
    deleteRecurring,
  } = useFinance();

  const [modalVisible, setModalVisible] = useState(false);

  const stats = useMemo(() => {
    const total = recurrings.reduce((sum, r) => sum + r.amount, 0);
    const paid = recurrings
      .filter((r) => r.isPaidCurrentMonth)
      .reduce((sum, r) => sum + r.amount, 0);
    const pending = total - paid;

    return { total, paid, pending };
  }, [recurrings]);

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Recurrings Summary Card */}
        <Card variant="elevated" style={styles.summaryCard}>
          <Text style={[styles.summaryTitle, { color: theme.textMuted }]}>
            Total em Contas Recorrentes
          </Text>
          <Text style={[styles.summaryAmount, { color: theme.text }]}>
            {formatCurrency(stats.total)}
          </Text>

          <View style={[styles.statusRow, { borderTopColor: theme.border }]}>
            <View style={styles.statusCol}>
              <Text style={[styles.statusLabel, { color: theme.textMuted }]}>
                Já Pago no Mês
              </Text>
              <Text style={[styles.statusValue, { color: theme.success }]}>
                {formatCurrency(stats.paid)}
              </Text>
            </View>

            <View style={[styles.divider, { backgroundColor: theme.border }]} />

            <View style={styles.statusCol}>
              <Text style={[styles.statusLabel, { color: theme.textMuted }]}>
                Pendente a Pagar
              </Text>
              <Text style={[styles.statusValue, { color: theme.warning }]}>
                {formatCurrency(stats.pending)}
              </Text>
            </View>
          </View>
        </Card>

        {/* Section title */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>
            Assinaturas e Contas Fixas ({recurrings.length})
          </Text>
          <Text style={[styles.sectionSubtitle, { color: theme.textMuted }]}>
            Toque na tag para marcar como pago ou pendente
          </Text>
        </View>

        {recurrings.length === 0 ? (
          <Card variant="flat" style={{ alignItems: 'center', paddingVertical: 32 }}>
            <Ionicons name="calendar-outline" size={36} color={theme.textMuted} />
            <Text style={{ color: theme.textMuted, marginTop: 8 }}>
              Nenhum débito recorrente cadastrado.
            </Text>
          </Card>
        ) : (
          recurrings.map((item) => (
            <RecurringItem
              key={item.id}
              recurring={item}
              onTogglePaid={toggleRecurringPaid}
              onDelete={deleteRecurring}
              canEdit={canEdit}
            />
          ))
        )}
      </ScrollView>

      {/* FAB */}
      {canEdit && (
        <View style={styles.fabWrap}>
          <Button
            title="Novo Débito Recorrente"
            icon={<Ionicons name="add" size={20} color="#FFF" />}
            onPress={() => setModalVisible(true)}
            style={styles.fab}
          />
        </View>
      )}

      {/* Modal */}
      <AddRecurringModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onSubmit={addRecurring}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 90,
  },
  summaryCard: {
    padding: 20,
    marginBottom: 20,
  },
  summaryTitle: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  summaryAmount: {
    fontSize: 28,
    fontWeight: '800',
    marginVertical: 6,
  },
  statusRow: {
    flexDirection: 'row',
    borderTopWidth: 1,
    paddingTop: 14,
    marginTop: 8,
  },
  statusCol: {
    flex: 1,
  },
  statusLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  statusValue: {
    fontSize: 16,
    fontWeight: '700',
  },
  divider: {
    width: 1,
    marginHorizontal: 12,
  },
  sectionHeader: {
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
  },
  sectionSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  fabWrap: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
  },
  fab: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
});
