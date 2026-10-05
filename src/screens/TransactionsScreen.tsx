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
import { TransactionItem } from '../modules/transactions/components/TransactionItem';
import { AddTransactionModal } from '../modules/transactions/components/AddTransactionModal';
import { formatCurrency } from '../core/utils/currency';
import { getMonthLabel } from '../core/utils/date';
import { Button } from '../core/components/Button';
import { Card } from '../core/components/Card';
import { Ionicons } from '@expo/vector-icons';
import { TransactionType } from '../modules/transactions/types';

export const TransactionsScreen: React.FC = () => {
  const { theme } = useTheme();
  const { canEdit } = useWorkspace();
  const {
    transactions,
    selectedMonth,
    selectedYear,
    setSelectedPeriod,
    monthlySummary,
    addTransaction,
    deleteTransaction,
  } = useFinance();

  const [filterType, setFilterType] = useState<'all' | TransactionType>('all');
  const [modalVisible, setModalVisible] = useState(false);

  const filteredTransactions = useMemo(() => {
    if (filterType === 'all') return transactions;
    return transactions.filter((t) => t.type === filterType);
  }, [transactions, filterType]);

  const changeMonth = (delta: number) => {
    let newM = selectedMonth + delta;
    let newY = selectedYear;

    if (newM > 12) {
      newM = 1;
      newY += 1;
    } else if (newM < 1) {
      newM = 12;
      newY -= 1;
    }

    setSelectedPeriod(newM, newY);
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Month Navigator */}
      <View style={[styles.monthNav, { borderBottomColor: theme.border }]}>
        <TouchableOpacity
          onPress={() => changeMonth(-1)}
          style={[styles.arrowBtn, { backgroundColor: theme.surfaceVariant }]}
        >
          <Ionicons name="chevron-back" size={20} color={theme.text} />
        </TouchableOpacity>

        <View style={styles.monthCenter}>
          <Text style={[styles.monthText, { color: theme.text }]}>
            {getMonthLabel(selectedMonth, selectedYear)}
          </Text>
        </View>

        <TouchableOpacity
          onPress={() => changeMonth(1)}
          style={[styles.arrowBtn, { backgroundColor: theme.surfaceVariant }]}
        >
          <Ionicons name="chevron-forward" size={20} color={theme.text} />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Monthly Mini Bar */}
        <Card variant="flat" style={styles.miniSummary}>
          <View style={styles.miniCol}>
            <Text style={[styles.miniLabel, { color: theme.textMuted }]}>Receitas</Text>
            <Text style={[styles.miniIncome, { color: theme.success }]}>
              {formatCurrency(monthlySummary.totalIncome)}
            </Text>
          </View>
          <View style={[styles.miniDivider, { backgroundColor: theme.border }]} />
          <View style={styles.miniCol}>
            <Text style={[styles.miniLabel, { color: theme.textMuted }]}>Despesas</Text>
            <Text style={[styles.miniExpense, { color: theme.danger }]}>
              {formatCurrency(monthlySummary.totalExpense)}
            </Text>
          </View>
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
              Todos ({transactions.length})
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
        </View>

        {/* Transactions List */}
        {filteredTransactions.length === 0 ? (
          <Card variant="flat" style={{ alignItems: 'center', paddingVertical: 32, marginTop: 12 }}>
            <Ionicons name="receipt-outline" size={36} color={theme.textMuted} />
            <Text style={{ color: theme.textMuted, marginTop: 8, fontSize: 14 }}>
              Nenhuma transação encontrada neste período.
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
            onPress={() => setModalVisible(true)}
            style={styles.fab}
          />
        </View>
      )}

      {/* Add Modal */}
      <AddTransactionModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onSubmit={addTransaction}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  monthNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  arrowBtn: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthCenter: {
    alignItems: 'center',
  },
  monthText: {
    fontSize: 17,
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
