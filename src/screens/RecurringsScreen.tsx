import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  TextInput,
  Platform,
  UIManager,
  LayoutAnimation,
} from 'react-native';
import { useTheme } from '../core/theme/ThemeContext';
import { useFinance } from '../modules/FinanceContext';
import { useWorkspace } from '../modules/workspaces/WorkspaceContext';
import { RecurringItem } from '../modules/recurrings/components/RecurringItem';
import { AddRecurringModal } from '../modules/recurrings/components/AddRecurringModal';
import { DeleteRecurringScopeModal } from '../modules/recurrings/components/DeleteRecurringScopeModal';
import { RecurringDebit, isRecurringActiveInMonth, DeleteRecurringScope } from '../modules/recurrings/types';
import { formatCurrency } from '../core/utils/currency';
import { Card } from '../core/components/Card';
import { Button } from '../core/components/Button';
import { Input } from '../core/components/Input';
import { ModalContainer } from '../core/components/ModalContainer';
import { PeriodSelector } from '../core/components/PeriodSelector';
import { getMonthLabel } from '../core/utils/date';
import { getCategoryMeta } from '../core/utils/categories';
import { Ionicons } from '@expo/vector-icons';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

type GroupMode = 'list' | 'category' | 'person';
type TypeFilter = 'all' | 'expense' | 'income';

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
    batchSetRecurringsPaid,
    deleteRecurring,
  } = useFinance();

  // Filters & Modes
  const [filterVigencia, setFilterVigencia] = useState<'active' | 'all'>('active');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [groupMode, setGroupMode] = useState<GroupMode>('list');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals state
  const [modalVisible, setModalVisible] = useState(false);
  const [fullEditItem, setFullEditItem] = useState<RecurringDebit | null>(null);
  const [editAmountModalVisible, setEditAmountModalVisible] = useState(false);
  const [editingItem, setEditingItem] = useState<{ id: string; title: string; amount: number } | null>(null);
  const [newAmountStr, setNewAmountStr] = useState('');
  const [amountScope, setAmountScope] = useState<'month' | 'forward' | 'base'>('month');

  // Modal de escopo de exclusão
  const [deleteScopeModalVisible, setDeleteScopeModalVisible] = useState(false);
  const [recurringToDelete, setRecurringToDelete] = useState<RecurringDebit | null>(null);

  const handleRequestDelete = (rec: RecurringDebit) => {
    setRecurringToDelete(rec);
    setDeleteScopeModalVisible(true);
  };

  const handleConfirmDeleteScope = async (id: string, scope: DeleteRecurringScope) => {
    await deleteRecurring(id, scope);
    setDeleteScopeModalVisible(false);
    setRecurringToDelete(null);
  };

  // Recurrings active in this month
  const activeInMonth = useMemo(() => {
    return recurrings.filter((r) => isRecurringActiveInMonth(r, selectedMonth, selectedYear));
  }, [recurrings, selectedMonth, selectedYear]);

  // Vigencia base list
  const baseList = useMemo(() => {
    if (filterVigencia === 'active') return activeInMonth;
    return recurrings;
  }, [filterVigencia, activeInMonth, recurrings]);

  // Overall financial summary for activeInMonth
  const stats = useMemo(() => {
    const expenses = activeInMonth.filter((r) => r.type !== 'income' && !r.isPaused);
    const incomes = activeInMonth.filter((r) => r.type === 'income' && !r.isPaused);

    const totalExpense = expenses.reduce((sum, r) => sum + r.amount, 0);
    const paidExpense = expenses
      .filter((r) => r.isPaidCurrentMonth)
      .reduce((sum, r) => sum + r.amount, 0);
    const pendingExpense = totalExpense - paidExpense;

    const totalIncome = incomes.reduce((sum, r) => sum + r.amount, 0);
    const receivedIncome = incomes
      .filter((r) => r.isPaidCurrentMonth)
      .reduce((sum, r) => sum + r.amount, 0);
    const pendingIncome = totalIncome - receivedIncome;

    const netSurplus = totalIncome - totalExpense;
    const progressPercent = totalExpense > 0 ? Math.min(100, Math.round((paidExpense / totalExpense) * 100)) : 0;

    return {
      totalExpense,
      paidExpense,
      pendingExpense,
      totalIncome,
      receivedIncome,
      pendingIncome,
      netSurplus,
      progressPercent,
      hasIncome: incomes.length > 0,
      hasExpense: expenses.length > 0,
      pendingCount: expenses.filter((r) => !r.isPaidCurrentMonth).length,
      pendingIncomeCount: incomes.filter((r) => !r.isPaidCurrentMonth).length,
    };
  }, [activeInMonth]);

  // Filtered by Type & Search
  const filteredList = useMemo(() => {
    let list = [...baseList];

    // Filter by type
    if (typeFilter === 'expense') {
      list = list.filter((r) => r.type !== 'income');
    } else if (typeFilter === 'income') {
      list = list.filter((r) => r.type === 'income');
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (r) =>
          r.title.toLowerCase().includes(q) ||
          r.category.toLowerCase().includes(q) ||
          (r.assignedTo && r.assignedTo.toLowerCase().includes(q))
      );
    }

    return list;
  }, [baseList, typeFilter, searchQuery]);

  // Handler for Batch Pay All Pending Expenses (apenas débitos/despesas)
  const handleBatchPayPending = (itemsToPay: RecurringDebit[], titlePrefix = 'Liquidar Débitos Pendentes') => {
    const pendingItems = itemsToPay.filter(
      (r) => r.type !== 'income' && !r.isPaidCurrentMonth && !r.isPaused
    );
    if (pendingItems.length === 0) {
      Alert.alert('Tudo Pago!', 'Não há contas ou débitos pendentes nesta lista.');
      return;
    }

    const totalAmount = pendingItems.reduce((acc, cur) => acc + cur.amount, 0);
    const previewItems = pendingItems
      .slice(0, 5)
      .map((item) => `• ${item.title}: ${formatCurrency(item.amount)}`)
      .join('\n');
    const remainingCount = pendingItems.length - 5;
    const remainingText =
      remainingCount > 0
        ? `\n• + ${remainingCount} ${remainingCount === 1 ? 'outro débito' : 'outros débitos'}`
        : '';

    Alert.alert(
      titlePrefix,
      `Deseja marcar como PAGAS ${pendingItems.length} ${pendingItems.length === 1 ? 'conta pendente' : 'contas pendentes'}?\n\nTotal: ${formatCurrency(totalAmount)}\n\nItens incluídos:\n${previewItems}${remainingText}`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Sim, Marcar Pagas',
          onPress: async () => {
            const ids = pendingItems.map((r) => r.id);
            await batchSetRecurringsPaid(ids, true);
          },
        },
      ]
    );
  };

  // Handler for Batch Receive All Pending Incomes (apenas proventos/receitas)
  const handleBatchReceivePending = (itemsToReceive: RecurringDebit[], titlePrefix = 'Receber Proventos Pendentes') => {
    const pendingItems = itemsToReceive.filter(
      (r) => r.type === 'income' && !r.isPaidCurrentMonth && !r.isPaused
    );
    if (pendingItems.length === 0) {
      Alert.alert('Tudo Recebido!', 'Não há proventos ou rendas pendentes nesta lista.');
      return;
    }

    const totalAmount = pendingItems.reduce((acc, cur) => acc + cur.amount, 0);
    const previewItems = pendingItems
      .slice(0, 5)
      .map((item) => `• ${item.title}: ${formatCurrency(item.amount)}`)
      .join('\n');
    const remainingCount = pendingItems.length - 5;
    const remainingText =
      remainingCount > 0
        ? `\n• + ${remainingCount} ${remainingCount === 1 ? 'outro provento' : 'outros proventos'}`
        : '';

    Alert.alert(
      titlePrefix,
      `Deseja marcar como RECEBIDOS ${pendingItems.length} ${pendingItems.length === 1 ? 'provento pendente' : 'proventos pendentes'}?\n\nTotal: ${formatCurrency(totalAmount)}\n\nItens incluídos:\n${previewItems}${remainingText}`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Sim, Marcar Recebidos',
          onPress: async () => {
            const ids = pendingItems.map((r) => r.id);
            await batchSetRecurringsPaid(ids, true);
          },
        },
      ]
    );
  };

  // --- Lista ordenada naturalmente por dia de vencimento (dueDay) ---
  const sortedList = useMemo(() => {
    return [...filteredList].sort((a, b) => a.dueDay - b.dueDay);
  }, [filteredList]);

  // Helper renderer for a single Recurring item
  const renderItem = (item: RecurringDebit) => {
    return (
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
        onRequestDelete={handleRequestDelete}
        canEdit={canEdit}
        showVigencia={filterVigencia === 'all'}
        selectedMonth={selectedMonth}
        selectedYear={selectedYear}
      />
    );
  };

  // --- Grouping by Person / Responsible ---
  const personGroups = useMemo(() => {
    const map = new Map<string, RecurringDebit[]>();

    filteredList.forEach((item) => {
      const personKey = item.assignedTo ? item.assignedTo.trim() : 'Sem Responsável';
      if (!map.has(personKey)) {
        map.set(personKey, []);
      }
      map.get(personKey)!.push(item);
    });

    const groups = Array.from(map.entries()).map(([person, items]) => {
      const expenses = items.filter((r) => r.type !== 'income' && !r.isPaused);
      const totalExpense = expenses.reduce((s, r) => s + r.amount, 0);
      const paidExpense = expenses.filter((r) => r.isPaidCurrentMonth).reduce((s, r) => s + r.amount, 0);
      const pendingExpense = totalExpense - paidExpense;
      const pendingCount = expenses.filter((r) => !r.isPaidCurrentMonth).length;

      const incomes = items.filter((r) => r.type === 'income' && !r.isPaused);
      const totalIncome = incomes.reduce((s, r) => s + r.amount, 0);
      const receivedIncome = incomes.filter((r) => r.isPaidCurrentMonth).reduce((s, r) => s + r.amount, 0);
      const pendingIncome = totalIncome - receivedIncome;
      const pendingIncomeCount = incomes.filter((r) => !r.isPaidCurrentMonth).length;

      // Ordenar os itens da pessoa pelo dia de vencimento
      items.sort((a, b) => a.dueDay - b.dueDay);

      return {
        person,
        items,
        totalExpense,
        paidExpense,
        pendingExpense,
        pendingCount,
        totalIncome,
        receivedIncome,
        pendingIncome,
        pendingIncomeCount,
      };
    });

    // Sort by total expense descending (or total income when viewing income tab)
    if (typeFilter === 'income') {
      groups.sort((a, b) => b.totalIncome - a.totalIncome);
    } else {
      groups.sort((a, b) => b.totalExpense - a.totalExpense);
    }
    return groups;
  }, [filteredList, typeFilter]);

  // --- Grouping by Category ---
  const categoryGroups = useMemo(() => {
    const map = new Map<string, RecurringDebit[]>();

    filteredList.forEach((item) => {
      if (!map.has(item.category)) {
        map.set(item.category, []);
      }
      map.get(item.category)!.push(item);
    });

    const groups = Array.from(map.entries()).map(([category, items]) => {
      // Ordenar os itens dentro de cada categoria pelo dia de vencimento
      items.sort((a, b) => a.dueDay - b.dueDay);
      const total = items.reduce((s, r) => s + r.amount, 0);
      const paid = items.filter((r) => r.isPaidCurrentMonth).reduce((s, r) => s + r.amount, 0);
      return {
        category,
        items,
        total,
        paid,
      };
    });

    groups.sort((a, b) => b.total - a.total);
    return groups;
  }, [filteredList]);

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
          <View style={styles.summaryHeaderRow}>
            <View style={{ flex: 1, marginRight: 8 }}>
              <Text style={[styles.summaryTitle, { color: theme.textMuted }]}>
                {typeFilter === 'income' ? 'Renda Fixa Prevista' : 'Contas Recorrentes'} ({getMonthLabel(selectedMonth, selectedYear)})
              </Text>
              <Text style={[styles.summaryAmount, { color: theme.text }]}>
                {formatCurrency(typeFilter === 'income' ? stats.totalIncome : stats.totalExpense)}
              </Text>
            </View>

            {canEdit && (
              <View style={{ alignItems: 'flex-end', gap: 6 }}>
                {/* Botão de Pagar Débitos (aparece em "Todas" ou "Despesas" quando houver débitos pendentes) */}
                {typeFilter !== 'income' && stats.pendingCount > 0 && (
                  <TouchableOpacity
                    style={[styles.payAllBtn, { backgroundColor: theme.primary }]}
                    onPress={() => handleBatchPayPending(activeInMonth, 'Liquidar Débitos Pendentes')}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="checkmark-done" size={15} color="#FFF" />
                    <Text style={styles.payAllBtnText}>Pagar Débitos ({stats.pendingCount})</Text>
                  </TouchableOpacity>
                )}

                {/* Botão de Receber Proventos (aparece em "Rendas", ou em "Todas" se houver proventos pendentes) */}
                {((typeFilter === 'income' && stats.pendingIncomeCount > 0) ||
                  (typeFilter === 'all' && stats.pendingIncomeCount > 0 && stats.hasIncome)) && (
                  <TouchableOpacity
                    style={[styles.payAllBtn, { backgroundColor: '#10B981' }]}
                    onPress={() => handleBatchReceivePending(activeInMonth, 'Receber Proventos Pendentes')}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="cash-outline" size={15} color="#FFF" />
                    <Text style={styles.payAllBtnText}>Receber Rendas ({stats.pendingIncomeCount})</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>

          {/* Visual Progress Bar for Expenses */}
          {typeFilter !== 'income' && stats.totalExpense > 0 && (
            <View style={styles.progressSection}>
              <View style={styles.progressInfoRow}>
                <Text style={[styles.progressInfoText, { color: theme.textMuted }]}>
                  Progresso de Pagamento
                </Text>
                <Text style={[styles.progressPercentText, { color: theme.primary, fontWeight: '700' }]}>
                  {stats.progressPercent}% Concluído
                </Text>
              </View>
              <View style={[styles.progressBarTrack, { backgroundColor: theme.surfaceVariant }]}>
                <View
                  style={[
                    styles.progressBarFill,
                    {
                      width: `${stats.progressPercent}%`,
                      backgroundColor: stats.progressPercent === 100 ? theme.success : theme.primary,
                    },
                  ]}
                />
              </View>
            </View>
          )}

          {/* Status Columns */}
          <View style={[styles.statusRow, { borderTopColor: theme.border }]}>
            <View style={styles.statusCol}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                <Ionicons name="checkmark-circle" size={14} color={theme.success} style={{ marginRight: 4 }} />
                <Text style={[styles.statusLabel, { color: theme.textMuted }]}>
                  {typeFilter === 'income' ? 'Recebido' : 'Já Pago no Mês'}
                </Text>
              </View>
              <Text style={[styles.statusValue, { color: theme.success }]}>
                {formatCurrency(typeFilter === 'income' ? stats.receivedIncome : stats.paidExpense)}
              </Text>
            </View>

            <View style={[styles.divider, { backgroundColor: theme.border }]} />

            <View style={styles.statusCol}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                <Ionicons name="time-outline" size={14} color={theme.warning} style={{ marginRight: 4 }} />
                <Text style={[styles.statusLabel, { color: theme.textMuted }]}>
                  {typeFilter === 'income' ? 'A Receber' : 'Pendente a Pagar'}
                </Text>
              </View>
              <Text style={[styles.statusValue, { color: theme.warning }]}>
                {formatCurrency(typeFilter === 'income' ? stats.pendingIncome : stats.pendingExpense)}
              </Text>
            </View>
          </View>

          {/* Sobra Livre Recorrente (Rendas - Despesas Fixas) */}
          {stats.hasIncome && typeFilter === 'all' && (
            <View style={[styles.surplusRow, { borderTopColor: theme.border }]}>
              <View>
                <Text style={{ fontSize: 12, color: theme.textMuted, fontWeight: '600' }}>
                  Sobra Livre Fixa Prevista:
                </Text>
                <Text style={{ fontSize: 11, color: theme.textMuted, marginTop: 1 }}>
                  (Renda Fixa: {formatCurrency(stats.totalIncome)})
                </Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text
                  style={{
                    fontSize: 16,
                    fontWeight: '800',
                    color: stats.netSurplus >= 0 ? theme.success : theme.danger,
                  }}
                >
                  {formatCurrency(stats.netSurplus)}
                </Text>
                <Text style={{ fontSize: 10, color: theme.textMuted, fontWeight: '600' }}>
                  {stats.netSurplus >= 0 ? 'Positivo' : 'Déficit'}
                </Text>
              </View>
            </View>
          )}
        </Card>

        {/* Search Bar */}
        <View style={[styles.searchBar, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Ionicons name="search-outline" size={18} color={theme.textMuted} style={{ marginRight: 8 }} />
          <TextInput
            placeholder="Buscar por conta, categoria ou pessoa..."
            placeholderTextColor={theme.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
            style={[styles.searchInput, { color: theme.text }]}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name="close-circle" size={18} color={theme.textMuted} />
            </TouchableOpacity>
          )}
        </View>

        {/* 1st Control Row: Type Tabs (Todas | Despesas | Receitas) */}
        <View style={[styles.typeTabBar, { backgroundColor: theme.surfaceVariant }]}>
          <TouchableOpacity
            style={[
              styles.typeTabBtn,
              typeFilter === 'all' && [styles.typeTabBtnActive, { backgroundColor: theme.primary }],
            ]}
            onPress={() => setTypeFilter('all')}
          >
            <Text
              style={[
                styles.typeTabText,
                { color: typeFilter === 'all' ? '#FFF' : theme.text },
              ]}
            >
              Todas ({baseList.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.typeTabBtn,
              typeFilter === 'expense' && [styles.typeTabBtnActive, { backgroundColor: theme.danger }],
            ]}
            onPress={() => setTypeFilter('expense')}
          >
            <Text
              style={[
                styles.typeTabText,
                { color: typeFilter === 'expense' ? '#FFF' : theme.text },
              ]}
            >
              🔴 Despesas ({baseList.filter((r) => r.type !== 'income').length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.typeTabBtn,
              typeFilter === 'income' && [styles.typeTabBtnActive, { backgroundColor: theme.success }],
            ]}
            onPress={() => setTypeFilter('income')}
          >
            <Text
              style={[
                styles.typeTabText,
                { color: typeFilter === 'income' ? '#FFF' : theme.text },
              ]}
            >
              🟢 Rendas ({baseList.filter((r) => r.type === 'income').length})
            </Text>
          </TouchableOpacity>
        </View>

        {/* 2nd Control Row: View Modes (Lista Geral | Por Categoria | Por Pessoa) */}
        <View style={styles.groupModesRow}>
          <Text style={[styles.groupModesLabel, { color: theme.textMuted }]}>
            Visualização:
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
            <TouchableOpacity
              style={[
                styles.groupModeChip,
                {
                  backgroundColor: groupMode === 'list' ? theme.primary : theme.surfaceVariant,
                  borderColor: groupMode === 'list' ? theme.primary : theme.border,
                },
              ]}
              onPress={() => setGroupMode('list')}
            >
              <Ionicons
                name="list-outline"
                size={14}
                color={groupMode === 'list' ? '#FFF' : theme.text}
                style={{ marginRight: 5 }}
              />
              <Text style={[styles.groupModeChipText, { color: groupMode === 'list' ? '#FFF' : theme.text }]}>
                Lista Geral
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.groupModeChip,
                {
                  backgroundColor: groupMode === 'category' ? theme.primary : theme.surfaceVariant,
                  borderColor: groupMode === 'category' ? theme.primary : theme.border,
                },
              ]}
              onPress={() => setGroupMode('category')}
            >
              <Ionicons
                name="pricetag-outline"
                size={14}
                color={groupMode === 'category' ? '#FFF' : theme.text}
                style={{ marginRight: 5 }}
              />
              <Text style={[styles.groupModeChipText, { color: groupMode === 'category' ? '#FFF' : theme.text }]}>
                Por Categoria
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.groupModeChip,
                {
                  backgroundColor: groupMode === 'person' ? theme.primary : theme.surfaceVariant,
                  borderColor: groupMode === 'person' ? theme.primary : theme.border,
                },
              ]}
              onPress={() => setGroupMode('person')}
            >
              <Ionicons
                name="people-outline"
                size={14}
                color={groupMode === 'person' ? '#FFF' : theme.text}
                style={{ marginRight: 5 }}
              />
              <Text style={[styles.groupModeChipText, { color: groupMode === 'person' ? '#FFF' : theme.text }]}>
                Por Pessoa
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>

        {/* Vigência Switch Pills */}
        <View style={styles.vigenciaFilterRow}>
          <TouchableOpacity
            style={[
              styles.vigenciaPill,
              {
                backgroundColor: filterVigencia === 'active' ? theme.surface : 'transparent',
                borderColor: filterVigencia === 'active' ? theme.primary : theme.border,
              },
            ]}
            onPress={() => setFilterVigencia('active')}
          >
            <Text
              style={[
                styles.vigenciaText,
                { color: filterVigencia === 'active' ? theme.primary : theme.textMuted },
              ]}
            >
              Vigentes em {getMonthLabel(selectedMonth, selectedYear)} ({activeInMonth.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.vigenciaPill,
              {
                backgroundColor: filterVigencia === 'all' ? theme.surface : 'transparent',
                borderColor: filterVigencia === 'all' ? theme.primary : theme.border,
              },
            ]}
            onPress={() => setFilterVigencia('all')}
          >
            <Text
              style={[
                styles.vigenciaText,
                { color: filterVigencia === 'all' ? theme.primary : theme.textMuted },
              ]}
            >
              Todas Cadastradas ({recurrings.length})
            </Text>
          </TouchableOpacity>
        </View>

        {/* Empty State */}
        {filteredList.length === 0 ? (
          <Card variant="flat" style={{ alignItems: 'center', paddingVertical: 40, marginTop: 12 }}>
            <Ionicons name="calendar-outline" size={42} color={theme.textMuted} />
            <Text style={{ color: theme.text, fontSize: 16, fontWeight: '700', marginTop: 12 }}>
              Nenhum item encontrado
            </Text>
            <Text style={{ color: theme.textMuted, marginTop: 4, textAlign: 'center', paddingHorizontal: 20 }}>
              {searchQuery.trim()
                ? `Não encontramos resultados para "${searchQuery}".`
                : filterVigencia === 'active'
                ? `Nenhuma conta ou provento ativo em ${getMonthLabel(selectedMonth, selectedYear)}.`
                : 'Cadastre suas contas fixas e proventos para organizar o mês.'}
            </Text>
          </Card>
        ) : (
          <>
            {/* ======================================================== */}
            {/* VIEW MODE 1: LISTA GERAL                                */}
            {/* ======================================================== */}
            {groupMode === 'list' && (
              <View style={{ marginTop: 8 }}>
                {sortedList.map(renderItem)}
              </View>
            )}

            {/* ======================================================== */}
            {/* VIEW MODE 2: BY CATEGORY                                */}
            {/* ======================================================== */}
            {groupMode === 'category' && (
              <View style={{ marginTop: 8 }}>
                {categoryGroups.map((group) => {
                  const meta = getCategoryMeta(group.category as any);
                  return (
                    <View key={group.category} style={styles.bucketBlock}>
                      <View style={[styles.bucketHeader, { backgroundColor: theme.surfaceVariant, borderColor: theme.border }]}>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                          <Ionicons name={meta.icon as any} size={18} color={meta.color || theme.primary} style={{ marginRight: 8 }} />
                          <Text style={[styles.bucketTitle, { color: theme.text }]}>
                            {group.category} ({group.items.length})
                          </Text>
                        </View>
                        <Text style={[styles.bucketTotal, { color: theme.text }]}>
                          {formatCurrency(group.total)}
                        </Text>
                      </View>
                      {group.items.map(renderItem)}
                    </View>
                  );
                })}
              </View>
            )}

            {/* ======================================================== */}
            {/* VIEW MODE 2: BY PERSON / RESPONSIBLE                    */}
            {/* ======================================================== */}
            {groupMode === 'person' && (
              <View style={{ marginTop: 8 }}>
                {/* Household Expense Split Progress Bar */}
                {personGroups.length > 1 && stats.totalExpense > 0 && (
                  <Card variant="flat" style={[styles.splitCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
                    <Text style={[styles.splitTitle, { color: theme.textMuted }]}>
                      Divisão de Contas da Casa ({getMonthLabel(selectedMonth, selectedYear)})
                    </Text>
                    <View style={styles.splitMultiBar}>
                      {personGroups.map((group, idx) => {
                        const pct = stats.totalExpense > 0 ? (group.totalExpense / stats.totalExpense) * 100 : 0;
                        if (pct <= 0) return null;
                        const colors = ['#3B82F6', '#EC4899', '#10B981', '#F59E0B', '#8B5CF6'];
                        const color = colors[idx % colors.length];
                        return (
                          <View
                            key={group.person}
                            style={{
                              width: `${pct}%`,
                              backgroundColor: color,
                              height: 10,
                              borderTopLeftRadius: idx === 0 ? 5 : 0,
                              borderBottomLeftRadius: idx === 0 ? 5 : 0,
                              borderTopRightRadius: idx === personGroups.length - 1 ? 5 : 0,
                              borderBottomRightRadius: idx === personGroups.length - 1 ? 5 : 0,
                            }}
                          />
                        );
                      })}
                    </View>
                    <View style={styles.splitLegendRow}>
                      {personGroups.map((group, idx) => {
                        const pct = stats.totalExpense > 0 ? Math.round((group.totalExpense / stats.totalExpense) * 100) : 0;
                        const colors = ['#3B82F6', '#EC4899', '#10B981', '#F59E0B', '#8B5CF6'];
                        const color = colors[idx % colors.length];
                        return (
                          <View key={group.person} style={styles.splitLegendItem}>
                            <View style={[styles.splitLegendDot, { backgroundColor: color }]} />
                            <Text style={[styles.splitLegendText, { color: theme.text }]}>
                              {group.person}: {pct}% ({formatCurrency(group.totalExpense)})
                            </Text>
                          </View>
                        );
                      })}
                    </View>
                  </Card>
                )}

                {personGroups.map((group) => (
                  <View key={group.person} style={styles.bucketBlock}>
                    <View style={[styles.personHeader, { backgroundColor: theme.surfaceVariant, borderColor: theme.border }]}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                        <View style={[styles.personAvatar, { backgroundColor: theme.primary }]}>
                          <Text style={styles.personAvatarText}>
                            {group.person.charAt(0).toUpperCase()}
                          </Text>
                        </View>
                        <View style={{ marginLeft: 10 }}>
                          <Text style={[styles.personName, { color: theme.text }]}>
                            {group.person}
                          </Text>
                          <Text style={[styles.personSubtitle, { color: theme.textMuted }]}>
                            {typeFilter === 'income'
                              ? `${group.items.length} ${group.items.length === 1 ? 'item' : 'itens'} • ${formatCurrency(group.totalIncome)}`
                              : `${group.items.length} ${group.items.length === 1 ? 'item' : 'itens'} • ${formatCurrency(group.totalExpense)}`}
                          </Text>
                        </View>
                      </View>

                      {canEdit && typeFilter !== 'income' && group.pendingCount > 0 && (
                        <TouchableOpacity
                          style={[styles.personPayBtn, { backgroundColor: theme.primary }]}
                          onPress={() => handleBatchPayPending(group.items, `Liquidar Débitos de ${group.person}`)}
                        >
                          <Ionicons name="checkmark-done" size={14} color="#FFF" style={{ marginRight: 4 }} />
                          <Text style={styles.personPayBtnText}>Pagar Débitos ({group.pendingCount})</Text>
                        </TouchableOpacity>
                      )}

                      {canEdit && typeFilter === 'income' && group.pendingIncomeCount > 0 && (
                        <TouchableOpacity
                          style={[styles.personPayBtn, { backgroundColor: '#10B981' }]}
                          onPress={() => handleBatchReceivePending(group.items, `Receber Proventos de ${group.person}`)}
                        >
                          <Ionicons name="cash-outline" size={14} color="#FFF" style={{ marginRight: 4 }} />
                          <Text style={styles.personPayBtnText}>Receber ({group.pendingIncomeCount})</Text>
                        </TouchableOpacity>
                      )}
                    </View>

                    {group.items.map(renderItem)}
                  </View>
                ))}
              </View>
            )}
          </>
        )}
      </ScrollView>

      {/* FAB: Novo Item Recorrente */}
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
        onDelete={(id) => {
          setModalVisible(false);
          const item = recurrings.find((r) => r.id === id) || fullEditItem;
          if (item) {
            handleRequestDelete(item);
          } else {
            deleteRecurring(id);
          }
        }}
      />

      {/* Modal Escolha de Escopo de Exclusão */}
      <DeleteRecurringScopeModal
        visible={deleteScopeModalVisible}
        recurring={recurringToDelete}
        selectedMonth={selectedMonth}
        selectedYear={selectedYear}
        onClose={() => {
          setDeleteScopeModalVisible(false);
          setRecurringToDelete(null);
        }}
        onConfirm={handleConfirmDeleteScope}
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

        <View style={{ flexDirection: 'column', gap: 8, marginBottom: 16 }}>
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
            <Ionicons
              name="calendar-outline"
              size={15}
              color={amountScope === 'month' ? '#FFF' : theme.text}
              style={{ marginRight: 6 }}
            />
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
                  amountScope === 'forward' ? theme.primary : theme.surfaceVariant,
                borderColor: amountScope === 'forward' ? theme.primary : theme.border,
              },
            ]}
            onPress={() => setAmountScope('forward')}
            activeOpacity={0.7}
          >
            <Ionicons
              name="arrow-forward-circle-outline"
              size={15}
              color={amountScope === 'forward' ? '#FFF' : theme.text}
              style={{ marginRight: 6 }}
            />
            <Text
              style={[
                styles.scopePillText,
                { color: amountScope === 'forward' ? '#FFF' : theme.text },
              ]}
            >
              A partir de {getMonthLabel(selectedMonth, selectedYear)} (em diante)
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
            <Ionicons
              name="repeat-outline"
              size={15}
              color={amountScope === 'base' ? '#FFF' : theme.text}
              style={{ marginRight: 6 }}
            />
            <Text
              style={[
                styles.scopePillText,
                { color: amountScope === 'base' ? '#FFF' : theme.text },
              ]}
            >
              Todos os meses (Passado e futuro)
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
                await updateRecurringAmount(editingItem.id, val, amountScope);
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
  periodBar: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 95,
  },
  summaryCard: {
    padding: 18,
    marginBottom: 14,
    borderRadius: 16,
  },
  summaryHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  summaryTitle: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  summaryAmount: {
    fontSize: 28,
    fontWeight: '900',
    marginTop: 4,
    marginBottom: 4,
  },
  payAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
  payAllBtnText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '700',
    marginLeft: 4,
  },
  progressSection: {
    marginTop: 10,
    marginBottom: 8,
  },
  progressInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  progressInfoText: {
    fontSize: 11,
    fontWeight: '600',
  },
  progressPercentText: {
    fontSize: 11,
  },
  progressBarTrack: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  statusRow: {
    flexDirection: 'row',
    borderTopWidth: 1,
    paddingTop: 12,
    marginTop: 8,
  },
  statusCol: {
    flex: 1,
  },
  statusLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  statusValue: {
    fontSize: 15,
    fontWeight: '800',
  },
  divider: {
    width: 1,
    marginHorizontal: 12,
  },
  surplusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    paddingTop: 12,
    marginTop: 12,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    padding: 0,
  },
  typeTabBar: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: 4,
    marginBottom: 12,
  },
  typeTabBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 9,
  },
  typeTabBtnActive: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 2,
  },
  typeTabText: {
    fontSize: 12,
    fontWeight: '700',
  },
  groupModesRow: {
    marginBottom: 12,
  },
  groupModesLabel: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  groupModeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
  },
  groupModeChipText: {
    fontSize: 12,
    fontWeight: '700',
  },
  vigenciaFilterRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  vigenciaPill: {
    flex: 1,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  vigenciaText: {
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'center',
  },
  bucketBlock: {
    marginBottom: 14,
  },
  bucketHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 8,
  },
  bucketTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  bucketTotal: {
    fontSize: 13,
    fontWeight: '800',
  },
  splitCard: {
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 14,
  },
  splitTitle: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  splitMultiBar: {
    flexDirection: 'row',
    height: 10,
    borderRadius: 5,
    overflow: 'hidden',
    marginBottom: 10,
  },
  splitLegendRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  splitLegendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  splitLegendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  splitLegendText: {
    fontSize: 11,
    fontWeight: '600',
  },
  personHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
  },
  personAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  personAvatarText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '800',
  },
  personName: {
    fontSize: 14,
    fontWeight: '700',
  },
  personSubtitle: {
    fontSize: 11,
  },
  personPayBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
  },
  personPayBtnText: {
    color: '#FFF',
    fontSize: 11,
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
  scopePill: {
    flexDirection: 'row',
    paddingVertical: 11,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  scopePillText: {
    fontSize: 13,
    fontWeight: '700',
  },
});
