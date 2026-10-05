import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useTheme } from '../core/theme/ThemeContext';
import { useFinance } from '../modules/FinanceContext';
import { useWorkspace } from '../modules/workspaces/WorkspaceContext';
import { RecurringItem } from '../modules/recurrings/components/RecurringItem';
import { AddRecurringModal } from '../modules/recurrings/components/AddRecurringModal';
import { RecurringDebit, isRecurringActiveInMonth } from '../modules/recurrings/types';
import { formatCurrency } from '../core/utils/currency';
import { Card } from '../core/components/Card';
import { Button } from '../core/components/Button';
import { Input } from '../core/components/Input';
import { ModalContainer } from '../core/components/ModalContainer';
import { PeriodSelector } from '../core/components/PeriodSelector';
import { getMonthLabel } from '../core/utils/date';
import { Ionicons } from '@expo/vector-icons';

export const RecurringsScreen: React.FC = () => {
  const { theme } = useTheme();
  const { canEdit, activeWorkspace } = useWorkspace();
  const {
    recurrings,
    selectedMonth,
    selectedYear,
    addRecurring,
    updateRecurring,
    updateRecurringAmount,
    toggleRecurringPaid,
    deleteRecurring,
  } = useFinance();

  const [filterVigencia, setFilterVigencia] = useState<'active' | 'all'>('active');
  const [modalVisible, setModalVisible] = useState(false);
  const [fullEditItem, setFullEditItem] = useState<RecurringDebit | null>(null);
  const [editAmountModalVisible, setEditAmountModalVisible] = useState(false);
  const [editingItem, setEditingItem] = useState<{ id: string; title: string; amount: number } | null>(null);
  const [newAmountStr, setNewAmountStr] = useState('');
  const [amountScope, setAmountScope] = useState<'month' | 'base'>('month');

  const activeInMonth = useMemo(() => {
    return recurrings.filter((r) => isRecurringActiveInMonth(r, selectedMonth, selectedYear));
  }, [recurrings, selectedMonth, selectedYear]);

  const displayedRecurrings = useMemo(() => {
    if (filterVigencia === 'active') return activeInMonth;
    return recurrings;
  }, [filterVigencia, activeInMonth, recurrings]);

  const stats = useMemo(() => {
    const expenses = activeInMonth.filter((r) => r.type !== 'income');
    const incomes = activeInMonth.filter((r) => r.type === 'income');

    const totalExpense = expenses.reduce((sum, r) => sum + r.amount, 0);
    const paidExpense = expenses
      .filter((r) => r.isPaidCurrentMonth)
      .reduce((sum, r) => sum + r.amount, 0);
    const pendingExpense = totalExpense - paidExpense;

    const totalIncome = incomes.reduce((sum, r) => sum + r.amount, 0);
    const receivedIncome = incomes
      .filter((r) => r.isPaidCurrentMonth)
      .reduce((sum, r) => sum + r.amount, 0);

    return {
      totalExpense,
      paidExpense,
      pendingExpense,
      totalIncome,
      receivedIncome,
      hasIncome: incomes.length > 0,
    };
  }, [activeInMonth]);

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Competence Selector */}
      <View style={[styles.periodBar, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
        <PeriodSelector />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Recurrings Summary Card */}
        <Card variant="elevated" style={styles.summaryCard}>
          <Text style={[styles.summaryTitle, { color: theme.textMuted }]}>
            Total em Contas Recorrentes ({getMonthLabel(selectedMonth, selectedYear)})
          </Text>
          <Text style={[styles.summaryAmount, { color: theme.text }]}>
            {formatCurrency(stats.totalExpense)}
          </Text>

          <View style={[styles.statusRow, { borderTopColor: theme.border }]}>
            <View style={styles.statusCol}>
              <Text style={[styles.statusLabel, { color: theme.textMuted }]}>
                Já Pago no Mês
              </Text>
              <Text style={[styles.statusValue, { color: theme.success }]}>
                {formatCurrency(stats.paidExpense)}
              </Text>
            </View>

            <View style={[styles.divider, { backgroundColor: theme.border }]} />

            <View style={styles.statusCol}>
              <Text style={[styles.statusLabel, { color: theme.textMuted }]}>
                Pendente a Pagar
              </Text>
              <Text style={[styles.statusValue, { color: theme.warning }]}>
                {formatCurrency(stats.pendingExpense)}
              </Text>
            </View>
          </View>

          {stats.hasIncome && (
            <View style={[styles.incomeSummaryRow, { borderTopColor: theme.border }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Ionicons name="arrow-up-circle" size={18} color={theme.success} style={{ marginRight: 6 }} />
                <Text style={{ fontSize: 13, color: theme.textMuted, fontWeight: '600' }}>
                  Renda Fixa / Proventos:
                </Text>
              </View>
              <Text style={{ fontSize: 15, fontWeight: '700', color: theme.success }}>
                {formatCurrency(stats.totalIncome)}
              </Text>
            </View>
          )}
        </Card>

        {/* Section title & Filter Pills */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>
            Contas e Rendas Recorrentes
          </Text>
          <Text style={[styles.sectionSubtitle, { color: theme.textMuted }]}>
            Toque no status para marcar como pago/recebido ou pendente
          </Text>
        </View>

        {/* Filter Pills */}
        <View style={styles.filterRow}>
          <TouchableOpacity
            style={[
              styles.filterPill,
              {
                backgroundColor:
                  filterVigencia === 'active' ? theme.primary : theme.surfaceVariant,
              },
            ]}
            onPress={() => setFilterVigencia('active')}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.filterText,
                { color: filterVigencia === 'active' ? '#FFF' : theme.text },
              ]}
            >
              Vigentes no Mês ({activeInMonth.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.filterPill,
              {
                backgroundColor:
                  filterVigencia === 'all' ? theme.primary : theme.surfaceVariant,
              },
            ]}
            onPress={() => setFilterVigencia('all')}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.filterText,
                { color: filterVigencia === 'all' ? '#FFF' : theme.text },
              ]}
            >
              Todos ({recurrings.length})
            </Text>
          </TouchableOpacity>
        </View>

        {displayedRecurrings.length === 0 ? (
          <Card variant="flat" style={{ alignItems: 'center', paddingVertical: 32 }}>
            <Ionicons name="calendar-outline" size={36} color={theme.textMuted} />
            <Text style={{ color: theme.textMuted, marginTop: 8 }}>
              {filterVigencia === 'active'
                ? `Nenhum item recorrente vigente em ${getMonthLabel(selectedMonth, selectedYear)}.`
                : 'Nenhum item recorrente cadastrado.'}
            </Text>
          </Card>
        ) : (
          displayedRecurrings.map((item) => (
            <RecurringItem
              key={item.id}
              recurring={item}
              onTogglePaid={toggleRecurringPaid}
              onEditAmount={(id, curAmt, title) => {
                setEditingItem({ id, title, amount: curAmt });
                setNewAmountStr(curAmt > 0 ? curAmt.toString() : '');
                setAmountScope('month');
                setEditAmountModalVisible(true);
              }}
              onEditFull={(itemToEdit) => {
                setFullEditItem(itemToEdit);
                setModalVisible(true);
              }}
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
            title="Novo Item Recorrente"
            icon={<Ionicons name="add" size={20} color="#FFF" />}
            onPress={() => {
              setFullEditItem(null);
              setModalVisible(true);
            }}
            style={styles.fab}
          />
        </View>
      )}

      {/* Modal Novo / Editar Débito ou Provento */}
      <AddRecurringModal
        visible={modalVisible}
        initialData={fullEditItem}
        onClose={() => {
          setModalVisible(false);
          setFullEditItem(null);
        }}
        onSubmit={async (data) => {
          if (fullEditItem) {
            await updateRecurring({
              ...fullEditItem,
              ...data,
            });
          } else {
            await addRecurring(data);
          }
          setModalVisible(false);
          setFullEditItem(null);
        }}
      />

      {/* Modal Ajuste Rápido de Valor */}
      <ModalContainer
        visible={editAmountModalVisible}
        onClose={() => setEditAmountModalVisible(false)}
        title={`Ajustar Valor: ${editingItem?.title || ''}`}
      >
        <Text style={{ fontSize: 13, color: theme.textMuted, marginBottom: 12 }}>
          Escolha como deseja atualizar o valor desta conta ou provento:
        </Text>

        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
          <TouchableOpacity
            style={[
              styles.scopePill,
              {
                backgroundColor:
                  amountScope === 'month' ? theme.primary : theme.surfaceVariant,
                borderColor: amountScope === 'month' ? theme.primary : theme.border,
              },
            ]}
            onPress={() => setAmountScope('month')}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.scopePillText,
                { color: amountScope === 'month' ? '#FFF' : theme.text },
              ]}
            >
              Apenas em {getMonthLabel(selectedMonth, selectedYear)}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.scopePill,
              {
                backgroundColor:
                  amountScope === 'base' ? theme.primary : theme.surfaceVariant,
                borderColor: amountScope === 'base' ? theme.primary : theme.border,
              },
            ]}
            onPress={() => setAmountScope('base')}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.scopePillText,
                { color: amountScope === 'base' ? '#FFF' : theme.text },
              ]}
            >
              Padrão / Todos os meses
            </Text>
          </TouchableOpacity>
        </View>

        <Input
          label="Novo Valor (R$)"
          placeholder="0.00"
          keyboardType="decimal-pad"
          value={newAmountStr}
          onChangeText={setNewAmountStr}
        />
        <Button
          title="Salvar Valor"
          onPress={async () => {
            if (editingItem) {
              const val = parseFloat(newAmountStr.replace(',', '.'));
              if (!isNaN(val) && val >= 0) {
                await updateRecurringAmount(editingItem.id, val, amountScope === 'base');
                setEditAmountModalVisible(false);
              }
            }
          }}
          style={{ marginTop: 8 }}
        />
      </ModalContainer>
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
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  filterPill: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
  },
  filterText: {
    fontSize: 13,
    fontWeight: '700',
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
  incomeSummaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    paddingTop: 12,
    marginTop: 12,
  },
  periodBar: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  scopePill: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scopePillText: {
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
  },
});
