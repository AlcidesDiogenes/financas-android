import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useTheme } from '../core/theme/ThemeContext';
import { useFinance } from '../modules/FinanceContext';
import { useWorkspace } from '../modules/workspaces/WorkspaceContext';
import { TransactionItem } from '../modules/transactions/components/TransactionItem';
import { AddTransactionModal } from '../modules/transactions/components/AddTransactionModal';
import { formatCurrency } from '../core/utils/currency';
import {
  formatToBrazilianDate,
  parseBrazilianDate,
  applyDateMask,
} from '../core/utils/date';
import { Button } from '../core/components/Button';
import { Card } from '../core/components/Card';
import { PeriodSelector } from '../core/components/PeriodSelector';
import { Ionicons } from '@expo/vector-icons';

type PeriodPreset = '7d' | '15d' | '30d' | '90d' | 'year' | 'custom';

const PRESETS: { key: PeriodPreset; label: string }[] = [
  { key: '7d', label: '7 Dias' },
  { key: '15d', label: '15 Dias' },
  { key: '30d', label: '30 Dias' },
  { key: '90d', label: '90 Dias' },
  { key: 'year', label: 'Este Ano' },
  { key: 'custom', label: 'Personalizado' },
];

export const TransactionsScreen: React.FC = () => {
  const { theme } = useTheme();
  const { canEdit } = useWorkspace();
  const {
    transactions,
    allTransactions,
    monthlySummary,
    addTransaction,
    deleteTransaction,
  } = useFinance();

  // Mode: monthly (competência) vs period (intervalo de datas)
  const [viewMode, setViewMode] = useState<'monthly' | 'period'>('monthly');

  // Period filter states
  const [selectedPreset, setSelectedPreset] = useState<PeriodPreset>('30d');
  const [startDate, setStartDate] = useState<Date>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d;
  });
  const [endDate, setEndDate] = useState<Date>(() => new Date());

  // Custom date picker modal
  const [customModalVisible, setCustomModalVisible] = useState(false);
  const [inputStartDate, setInputStartDate] = useState('');
  const [inputEndDate, setInputEndDate] = useState('');
  const [dateError, setDateError] = useState('');

  // Category filter
  const [filterType, setFilterType] = useState<'all' | 'expense' | 'income' | 'saving'>('all');

  // Add transaction modal
  const [modalVisible, setModalVisible] = useState(false);
  const [modalInitialMode, setModalInitialMode] = useState<'expense' | 'income' | 'saving'>('expense');

  // Preset click handler
  const handleSelectPreset = (preset: PeriodPreset) => {
    setSelectedPreset(preset);
    const now = new Date();

    if (preset === '7d') {
      const start = new Date();
      start.setDate(now.getDate() - 7);
      setStartDate(start);
      setEndDate(now);
    } else if (preset === '15d') {
      const start = new Date();
      start.setDate(now.getDate() - 15);
      setStartDate(start);
      setEndDate(now);
    } else if (preset === '30d') {
      const start = new Date();
      start.setDate(now.getDate() - 30);
      setStartDate(start);
      setEndDate(now);
    } else if (preset === '90d') {
      const start = new Date();
      start.setDate(now.getDate() - 90);
      setStartDate(start);
      setEndDate(now);
    } else if (preset === 'year') {
      const start = new Date(now.getFullYear(), 0, 1);
      const end = new Date(now.getFullYear(), 11, 31);
      setStartDate(start);
      setEndDate(end);
    } else if (preset === 'custom') {
      setInputStartDate(formatToBrazilianDate(startDate));
      setInputEndDate(formatToBrazilianDate(endDate));
      setDateError('');
      setCustomModalVisible(true);
    }
  };

  const handleApplyCustomDates = () => {
    const parsedStart = parseBrazilianDate(inputStartDate);
    const parsedEnd = parseBrazilianDate(inputEndDate);

    if (!parsedStart) {
      setDateError('Data inicial inválida. Use o formato DD/MM/AAAA.');
      return;
    }
    if (!parsedEnd) {
      setDateError('Data final inválida. Use o formato DD/MM/AAAA.');
      return;
    }
    if (parsedStart.getTime() > parsedEnd.getTime()) {
      setDateError('A data inicial não pode ser posterior à data final.');
      return;
    }

    setStartDate(parsedStart);
    setEndDate(parsedEnd);
    setSelectedPreset('custom');
    setCustomModalVisible(false);
  };

  // Base transactions for the active mode
  const baseTransactions = useMemo(() => {
    if (viewMode === 'monthly') {
      return transactions;
    }

    const startMs = new Date(
      startDate.getFullYear(),
      startDate.getMonth(),
      startDate.getDate(),
      0,
      0,
      0,
      0
    ).getTime();

    const endMs = new Date(
      endDate.getFullYear(),
      endDate.getMonth(),
      endDate.getDate(),
      23,
      59,
      59,
      999
    ).getTime();

    return allTransactions.filter((t) => {
      const tMs = new Date(t.date).getTime();
      return tMs >= startMs && tMs <= endMs;
    });
  }, [viewMode, transactions, allTransactions, startDate, endDate]);

  // Summary for the active mode
  const activeSummary = useMemo(() => {
    if (viewMode === 'monthly') {
      return monthlySummary;
    }

    let income = 0;
    let expense = 0;
    let saved = 0;

    baseTransactions.forEach((t) => {
      if (t.type === 'income') {
        income += t.amount;
      } else {
        if (t.category === 'Investimentos' || t.category === 'Economia') {
          saved += t.amount;
        } else {
          expense += t.amount;
        }
      }
    });

    const balance = income - expense - saved;
    const savingsRate = income > 0 ? Math.max(0, Math.round((saved / income) * 100)) : 0;

    return {
      totalIncome: income,
      totalExpense: expense,
      totalSavedInMonth: saved,
      balance,
      savingsRate,
    };
  }, [viewMode, monthlySummary, baseTransactions]);

  // Filtered transactions (after applying category filters)
  const filteredTransactions = useMemo(() => {
    if (filterType === 'all') return baseTransactions;
    if (filterType === 'saving') {
      return baseTransactions.filter(
        (t) => t.category === 'Economia' || t.category === 'Investimentos'
      );
    }
    if (filterType === 'expense') {
      return baseTransactions.filter(
        (t) => t.type === 'expense' && t.category !== 'Economia' && t.category !== 'Investimentos'
      );
    }
    return baseTransactions.filter((t) => t.type === filterType);
  }, [baseTransactions, filterType]);

  const handleOpenAdd = (mode: 'expense' | 'income' | 'saving' = 'expense') => {
    if (!canEdit) return;
    setModalInitialMode(mode);
    setModalVisible(true);
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Top View Mode Switcher: Competência (Mês) vs Por Período */}
      <View
        style={[
          styles.modeToggleRow,
          { borderBottomColor: theme.border, backgroundColor: theme.surface },
        ]}
      >
        <TouchableOpacity
          style={[
            styles.modeToggleTab,
            viewMode === 'monthly' && [styles.activeTab, { borderBottomColor: theme.primary }],
          ]}
          onPress={() => setViewMode('monthly')}
          activeOpacity={0.7}
        >
          <Ionicons
            name="calendar-outline"
            size={16}
            color={viewMode === 'monthly' ? theme.primary : theme.textMuted}
            style={{ marginRight: 6 }}
          />
          <Text
            style={[
              styles.modeToggleText,
              {
                color: viewMode === 'monthly' ? theme.primary : theme.textMuted,
                fontWeight: viewMode === 'monthly' ? '700' : '500',
              },
            ]}
          >
            Por Competência (Mês)
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.modeToggleTab,
            viewMode === 'period' && [styles.activeTab, { borderBottomColor: theme.primary }],
          ]}
          onPress={() => setViewMode('period')}
          activeOpacity={0.7}
        >
          <Ionicons
            name="time-outline"
            size={16}
            color={viewMode === 'period' ? theme.primary : theme.textMuted}
            style={{ marginRight: 6 }}
          />
          <Text
            style={[
              styles.modeToggleText,
              {
                color: viewMode === 'period' ? theme.primary : theme.textMuted,
                fontWeight: viewMode === 'period' ? '700' : '500',
              },
            ]}
          >
            Por Período
          </Text>
        </TouchableOpacity>
      </View>

      {/* Navigator according to mode */}
      {viewMode === 'monthly' ? (
        <View style={[styles.monthNav, { borderBottomColor: theme.border }]}>
          <PeriodSelector />
        </View>
      ) : (
        <View
          style={[
            styles.periodNav,
            { borderBottomColor: theme.border, backgroundColor: theme.surface },
          ]}
        >
          {/* Preset Scroll Chips */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.presetScroll}
          >
            {PRESETS.map((p) => {
              const isActive = selectedPreset === p.key;
              return (
                <TouchableOpacity
                  key={p.key}
                  style={[
                    styles.presetPill,
                    {
                      backgroundColor: isActive ? theme.primary : theme.surfaceVariant,
                    },
                  ]}
                  onPress={() => handleSelectPreset(p.key)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.presetText,
                      { color: isActive ? '#FFF' : theme.text },
                    ]}
                  >
                    {p.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Active Range Bar */}
          <View
            style={[
              styles.rangeBar,
              { backgroundColor: theme.surfaceVariant, borderColor: theme.border },
            ]}
          >
            <View style={styles.rangeInfoWrap}>
              <Ionicons name="calendar" size={15} color={theme.primary} />
              <Text style={[styles.rangeInfoText, { color: theme.text }]}>
                {formatToBrazilianDate(startDate)} até {formatToBrazilianDate(endDate)}
              </Text>
            </View>
            <TouchableOpacity
              style={[styles.editRangeBtn, { backgroundColor: theme.surface }]}
              onPress={() => {
                setInputStartDate(formatToBrazilianDate(startDate));
                setInputEndDate(formatToBrazilianDate(endDate));
                setDateError('');
                setCustomModalVisible(true);
              }}
              activeOpacity={0.7}
            >
              <Ionicons
                name="options-outline"
                size={14}
                color={theme.primary}
                style={{ marginRight: 4 }}
              />
              <Text style={[styles.editRangeText, { color: theme.primary }]}>Filtrar Datas</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Dynamic Summary Bar (Month or Period) */}
        <Card variant="flat" style={styles.miniSummary}>
          <TouchableOpacity
            style={styles.miniCol}
            onPress={() => handleOpenAdd('income')}
            activeOpacity={0.7}
            disabled={!canEdit}
          >
            <Text style={[styles.miniLabel, { color: theme.textMuted }]}>Receitas</Text>
            <Text style={[styles.miniIncome, { color: theme.success }]}>
              {formatCurrency(activeSummary.totalIncome)}
            </Text>
          </TouchableOpacity>

          <View style={[styles.miniDivider, { backgroundColor: theme.border }]} />

          <TouchableOpacity
            style={styles.miniCol}
            onPress={() => handleOpenAdd('expense')}
            activeOpacity={0.7}
            disabled={!canEdit}
          >
            <Text style={[styles.miniLabel, { color: theme.textMuted }]}>Despesas</Text>
            <Text style={[styles.miniExpense, { color: theme.danger }]}>
              {formatCurrency(activeSummary.totalExpense)}
            </Text>
          </TouchableOpacity>

          <View style={[styles.miniDivider, { backgroundColor: theme.border }]} />

          <TouchableOpacity
            style={styles.miniCol}
            onPress={() => handleOpenAdd('saving')}
            activeOpacity={0.7}
            disabled={!canEdit}
          >
            <Text style={[styles.miniLabel, { color: theme.textMuted }]}>Economia</Text>
            <Text style={[styles.miniExpense, { color: '#3B82F6' }]}>
              {formatCurrency(activeSummary.totalSavedInMonth)}
            </Text>
          </TouchableOpacity>
        </Card>

        {/* Filter Pills */}
        <View style={styles.filterRow}>
          <TouchableOpacity
            style={[
              styles.filterPill,
              {
                backgroundColor:
                  filterType === 'all' ? theme.primary : theme.surfaceVariant,
              },
            ]}
            onPress={() => setFilterType('all')}
          >
            <Text
              style={[
                styles.filterText,
                { color: filterType === 'all' ? '#FFF' : theme.text },
              ]}
            >
              Todos ({baseTransactions.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.filterPill,
              {
                backgroundColor:
                  filterType === 'expense' ? theme.danger : theme.surfaceVariant,
              },
            ]}
            onPress={() => setFilterType('expense')}
          >
            <Text
              style={[
                styles.filterText,
                { color: filterType === 'expense' ? '#FFF' : theme.text },
              ]}
            >
              Despesas
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.filterPill,
              {
                backgroundColor:
                  filterType === 'income' ? theme.success : theme.surfaceVariant,
              },
            ]}
            onPress={() => setFilterType('income')}
          >
            <Text
              style={[
                styles.filterText,
                { color: filterType === 'income' ? '#FFF' : theme.text },
              ]}
            >
              Receitas
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.filterPill,
              {
                backgroundColor:
                  filterType === 'saving' ? '#3B82F6' : theme.surfaceVariant,
              },
            ]}
            onPress={() => setFilterType('saving')}
          >
            <Text
              style={[
                styles.filterText,
                { color: filterType === 'saving' ? '#FFF' : theme.text },
              ]}
            >
              Economia
            </Text>
          </TouchableOpacity>
        </View>

        {/* Transactions List */}
        {filteredTransactions.length === 0 ? (
          <Card variant="flat" style={styles.emptyCard}>
            <Ionicons name="receipt-outline" size={38} color={theme.textMuted} />
            <Text style={[styles.emptyTitle, { color: theme.text }]}>
              Nenhum lançamento encontrado
            </Text>
            <Text style={[styles.emptySubtitle, { color: theme.textMuted }]}>
              {viewMode === 'monthly'
                ? 'Nenhuma transação registrada neste mês.'
                : 'Não há transações no período selecionado.'}
            </Text>
          </Card>
        ) : (
          filteredTransactions.map((tx) => (
            <TransactionItem
              key={tx.id}
              transaction={tx}
              onDelete={deleteTransaction}
              canEdit={canEdit}
            />
          ))
        )}
      </ScrollView>

      {/* Floating Action Button */}
      {canEdit && (
        <View style={styles.fabWrap}>
          <Button
            title="Novo Lançamento"
            icon={<Ionicons name="add" size={20} color="#FFF" />}
            onPress={() => handleOpenAdd('expense')}
            style={styles.fab}
          />
        </View>
      )}

      {/* Add Modal */}
      <AddTransactionModal
        visible={modalVisible}
        initialMode={modalInitialMode}
        onClose={() => setModalVisible(false)}
        onSubmit={addTransaction}
      />

      {/* Custom Date Range Modal */}
      <Modal
        visible={customModalVisible}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setCustomModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
          style={styles.modalOverlay}
        >
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={() => setCustomModalVisible(false)}
          />
          <ScrollView
            contentContainerStyle={styles.scrollModalContent}
            keyboardShouldPersistTaps="handled"
            bounces={false}
          >
            <View
              style={[
                styles.modalCard,
                { backgroundColor: theme.surface, borderColor: theme.border },
              ]}
            >
              <View style={styles.modalHeader}>
                <Ionicons name="calendar-outline" size={22} color={theme.primary} />
                <Text style={[styles.modalTitle, { color: theme.text }]}>
                  Filtrar por Período
                </Text>
              </View>

              <Text style={[styles.modalHelper, { color: theme.textMuted }]}>
                Digite o intervalo de datas para ver o extrato completo correspondente.
              </Text>

              <Text style={[styles.inputLabel, { color: theme.textMuted }]}>
                Data Inicial (DD/MM/AAAA)
              </Text>
              <TextInput
                style={[
                  styles.dateInput,
                  {
                    backgroundColor: theme.surfaceVariant,
                    color: theme.text,
                    borderColor: theme.border,
                  },
                ]}
                placeholder="01/01/2026"
                placeholderTextColor={theme.textMuted}
                keyboardType="numeric"
                maxLength={10}
                value={inputStartDate}
                onChangeText={(val) => setInputStartDate(applyDateMask(val))}
              />

              <Text style={[styles.inputLabel, { color: theme.textMuted, marginTop: 12 }]}>
                Data Final (DD/MM/AAAA)
              </Text>
              <TextInput
                style={[
                  styles.dateInput,
                  {
                    backgroundColor: theme.surfaceVariant,
                    color: theme.text,
                    borderColor: theme.border,
                  },
                ]}
                placeholder="31/12/2026"
                placeholderTextColor={theme.textMuted}
                keyboardType="numeric"
                maxLength={10}
                value={inputEndDate}
                onChangeText={(val) => setInputEndDate(applyDateMask(val))}
              />

              {dateError ? (
                <View style={styles.errorBox}>
                  <Ionicons name="alert-circle" size={16} color={theme.danger} />
                  <Text style={[styles.errorText, { color: theme.danger }]}>{dateError}</Text>
                </View>
              ) : null}

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={[styles.cancelBtn, { borderColor: theme.border }]}
                  onPress={() => setCustomModalVisible(false)}
                >
                  <Text style={[styles.cancelBtnText, { color: theme.textMuted }]}>Cancelar</Text>
                </TouchableOpacity>

                <Button
                  title="Aplicar Filtro"
                  onPress={handleApplyCustomDates}
                  style={{ flex: 1, marginLeft: 10 }}
                />
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  modeToggleRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
  },
  modeToggleTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
  },
  activeTab: {
    borderBottomWidth: 2,
  },
  modeToggleText: {
    fontSize: 13,
  },
  monthNav: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  periodNav: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  presetScroll: {
    gap: 8,
    paddingBottom: 8,
  },
  presetPill: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
  },
  presetText: {
    fontSize: 12,
    fontWeight: '700',
  },
  rangeBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    marginTop: 4,
  },
  rangeInfoWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  rangeInfoText: {
    fontSize: 13,
    fontWeight: '600',
  },
  editRangeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  editRangeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 90,
  },
  miniSummary: {
    flexDirection: 'row',
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  miniCol: {
    flex: 1,
    alignItems: 'center',
  },
  miniLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  miniIncome: {
    fontSize: 16,
    fontWeight: '700',
  },
  miniExpense: {
    fontSize: 16,
    fontWeight: '700',
  },
  miniDivider: {
    width: 1,
    height: '100%',
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  filterPill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  filterText: {
    fontSize: 13,
    fontWeight: '700',
  },
  emptyCard: {
    alignItems: 'center',
    paddingVertical: 36,
    marginTop: 12,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginTop: 10,
  },
  emptySubtitle: {
    fontSize: 13,
    marginTop: 4,
    textAlign: 'center',
    paddingHorizontal: 20,
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    padding: 20,
  },
  scrollModalContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCard: {
    width: '100%',
    maxWidth: 380,
    borderRadius: 18,
    padding: 20,
    borderWidth: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  modalHelper: {
    fontSize: 13,
    marginBottom: 16,
    lineHeight: 18,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
  },
  dateInput: {
    height: 46,
    borderRadius: 10,
    paddingHorizontal: 14,
    fontSize: 15,
    borderWidth: 1,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
  },
  errorText: {
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
  },
  modalActions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
  },
  cancelBtn: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
