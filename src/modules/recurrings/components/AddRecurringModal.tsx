import React, { useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { ModalContainer } from '../../../core/components/ModalContainer';
import { Input } from '../../../core/components/Input';
import { Button } from '../../../core/components/Button';
import { useTheme } from '../../../core/theme/ThemeContext';
import { useWorkspace } from '../../workspaces/WorkspaceContext';
import { TransactionCategory } from '../../transactions/types';
import { RecurringDebit, RecurringFrequency, RecurringType } from '../types';
import { CATEGORIES_META } from '../../../core/utils/categories';
import {
  getCurrentMonthYear,
  applyMonthYearMask,
  parseMonthYear,
} from '../../../core/utils/date';
import { Ionicons } from '@expo/vector-icons';

interface AddRecurringModalProps {
  visible: boolean;
  initialData?: RecurringDebit | null;
  onClose: () => void;
  onSubmit: (data: {
    title: string;
    amount: number;
    category: TransactionCategory;
    frequency: RecurringFrequency;
    type?: RecurringType;
    dueDay: number;
    reminderEnabled: boolean;
    assignedTo?: string;
    notes?: string;
    startDate?: string;
    endDate?: string;
  }) => void;
}

const EXPENSE_CATEGORIES: TransactionCategory[] = [
  'Moradia',
  'Assinaturas',
  'Saúde',
  'Educação',
  'Transporte',
  'Lazer',
  'Alimentação',
  'Outros',
];

const INCOME_CATEGORIES: TransactionCategory[] = [
  'Salário',
  'Investimentos',
  'Extra',
  'Outros',
];

export const AddRecurringModal: React.FC<AddRecurringModalProps> = ({
  visible,
  initialData,
  onClose,
  onSubmit,
}) => {
  const { theme } = useTheme();
  const { activeWorkspace } = useWorkspace();
  const currentPeriod = useMemo(() => getCurrentMonthYear(), []);

  const [type, setType] = useState<RecurringType>('expense');
  const [title, setTitle] = useState('');
  const [amountStr, setAmountStr] = useState('');
  const [category, setCategory] = useState<TransactionCategory>('Moradia');
  const [dueDayStr, setDueDayStr] = useState('10');
  const [frequency, setFrequency] = useState<RecurringFrequency>('monthly');
  const [assignedTo, setAssignedTo] = useState<string>('');
  const [notes, setNotes] = useState('');
  const [startMonthYear, setStartMonthYear] = useState<string>(
    `${String(currentPeriod.month).padStart(2, '0')}/${currentPeriod.year}`
  );
  const [endMonthYear, setEndMonthYear] = useState<string>('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (visible) {
      if (initialData) {
        setType(initialData.type || 'expense');
        setTitle(initialData.title);
        setAmountStr(initialData.amount ? initialData.amount.toString() : '');
        setCategory(initialData.category);
        setDueDayStr(initialData.dueDay ? initialData.dueDay.toString() : '10');
        setFrequency(initialData.frequency || 'monthly');
        setAssignedTo(initialData.assignedTo || '');
        setNotes(initialData.notes || '');

        if (initialData.startDate) {
          const parts = initialData.startDate.split('-');
          if (parts.length >= 2) {
            setStartMonthYear(`${parts[1]}/${parts[0]}`);
          } else {
            setStartMonthYear('');
          }
        } else {
          setStartMonthYear('');
        }

        if (initialData.endDate) {
          const parts = initialData.endDate.split('-');
          if (parts.length >= 2) {
            setEndMonthYear(`${parts[1]}/${parts[0]}`);
          } else {
            setEndMonthYear('');
          }
        } else {
          setEndMonthYear('');
        }
      } else {
        setType('expense');
        setTitle('');
        setAmountStr('');
        setCategory('Moradia');
        setDueDayStr('10');
        setFrequency('monthly');
        setAssignedTo('');
        setNotes('');
        setStartMonthYear(`${String(currentPeriod.month).padStart(2, '0')}/${currentPeriod.year}`);
        setEndMonthYear('');
      }
      setError('');
    }
  }, [visible, initialData, currentPeriod]);

  const handleSave = () => {
    if (!title.trim()) {
      setError('Informe o nome da conta ou assinatura');
      return;
    }

    const cleanAmount = parseFloat(amountStr.replace(',', '.'));
    if (isNaN(cleanAmount) || cleanAmount <= 0) {
      setError('Informe um valor válido maior que zero');
      return;
    }

    const day = parseInt(dueDayStr, 10);
    if (isNaN(day) || day < 1 || day > 31) {
      setError('O dia de vencimento deve ser entre 1 e 31');
      return;
    }

    let startDateFormatted: string | undefined = undefined;
    if (startMonthYear.trim()) {
      const parsedStart = parseMonthYear(startMonthYear);
      if (!parsedStart) {
        setError('Mês/Ano inicial de vigência inválido. Use MM/AAAA');
        return;
      }
      startDateFormatted = `${parsedStart.year}-${String(parsedStart.month).padStart(2, '0')}`;
    }

    let endDateFormatted: string | undefined = undefined;
    if (endMonthYear.trim()) {
      const parsedEnd = parseMonthYear(endMonthYear);
      if (!parsedEnd) {
        setError('Mês/Ano final de vigência inválido. Use MM/AAAA');
        return;
      }
      if (startMonthYear.trim()) {
        const parsedStart = parseMonthYear(startMonthYear)!;
        if (parsedStart.year * 12 + parsedStart.month > parsedEnd.year * 12 + parsedEnd.month) {
          setError('A vigência final deve ser igual ou posterior ao início.');
          return;
        }
      }
      endDateFormatted = `${parsedEnd.year}-${String(parsedEnd.month).padStart(2, '0')}`;
    }

    setError('');
    onSubmit({
      title: title.trim(),
      amount: cleanAmount,
      category,
      frequency,
      type,
      dueDay: day,
      reminderEnabled: true,
      assignedTo: assignedTo.trim() || undefined,
      notes: notes.trim() || undefined,
      startDate: startDateFormatted,
      endDate: endDateFormatted,
    });

    onClose();
  };

  const isShared = activeWorkspace.type === 'shared';
  const categoriesList = type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;

  const modalTitle = initialData
    ? type === 'income'
      ? 'Editar Provento / Renda'
      : 'Editar Conta / Débito Fixo'
    : type === 'income'
    ? 'Novo Provento / Renda'
    : 'Nova Conta / Débito Fixo';

  return (
    <ModalContainer
      visible={visible}
      onClose={onClose}
      title={modalTitle}
    >
      {/* Type Toggle: Débito Fixo vs Provento/Renda Recorrente */}
      <View style={[styles.typeContainer, { backgroundColor: theme.surfaceVariant }]}>
        <TouchableOpacity
          style={[
            styles.typeButton,
            type === 'expense' && { backgroundColor: theme.danger },
          ]}
          onPress={() => {
            setType('expense');
            setCategory('Moradia');
          }}
        >
          <Ionicons
            name="arrow-down-circle"
            size={18}
            color={type === 'expense' ? '#FFF' : theme.textMuted}
          />
          <Text
            style={[
              styles.typeText,
              { color: type === 'expense' ? '#FFF' : theme.textMuted },
            ]}
          >
            Débito Fixo
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.typeButton,
            type === 'income' && { backgroundColor: theme.success },
          ]}
          onPress={() => {
            setType('income');
            setCategory('Salário');
          }}
        >
          <Ionicons
            name="arrow-up-circle"
            size={18}
            color={type === 'income' ? '#FFF' : theme.textMuted}
          />
          <Text
            style={[
              styles.typeText,
              { color: type === 'income' ? '#FFF' : theme.textMuted },
            ]}
          >
            Provento / Renda
          </Text>
        </TouchableOpacity>
      </View>

      <Input
        label={type === 'income' ? 'Descrição da Renda Recorrente' : 'Nome do Débito / Assinatura'}
        placeholder={type === 'income' ? 'Ex: Salário, Aluguel Recebido, Pensão' : 'Ex: Aluguel, Netflix, Internet, Cartão'}
        value={title}
        onChangeText={setTitle}
      />

      <View style={styles.row}>
        <View style={{ flex: 1.5, marginRight: 12 }}>
          <Input
            label="Valor Mensal (R$)"
            placeholder="0.00"
            keyboardType="decimal-pad"
            value={amountStr}
            onChangeText={setAmountStr}
          />
        </View>
        <View style={{ flex: 1 }}>
          <Input
            label={type === 'income' ? 'Dia do Pag.' : 'Dia de Venc.'}
            placeholder="Ex: 10"
            keyboardType="number-pad"
            maxLength={2}
            value={dueDayStr}
            onChangeText={setDueDayStr}
          />
        </View>
      </View>

      {/* Vigência (Início e Fim) */}
      <View style={{ marginBottom: 14 }}>
        <Text style={[styles.sectionLabel, { color: theme.textMuted }]}>
          Vigência (Duração / Período)
        </Text>
        <View style={styles.row}>
          <View style={{ flex: 1, marginRight: 12 }}>
            <Input
              label="Início (MM/AAAA)"
              placeholder="Ex: 01/2026"
              keyboardType="numeric"
              maxLength={7}
              value={startMonthYear}
              onChangeText={(val) => setStartMonthYear(applyMonthYearMask(val))}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Input
              label="Término (Opcional)"
              placeholder="Ex: 12/2026"
              keyboardType="numeric"
              maxLength={7}
              value={endMonthYear}
              onChangeText={(val) => setEndMonthYear(applyMonthYearMask(val))}
            />
          </View>
        </View>
        <Text style={{ fontSize: 11, color: theme.textMuted, marginTop: 2, marginLeft: 2 }}>
          💡 Deixe o término em branco se a conta ou renda for contínua/sem prazo final.
        </Text>
      </View>

      {/* Responsável - Apenas se o espaço for Compartilhado */}
      {isShared && activeWorkspace.members.length > 0 && (
        <View style={{ marginBottom: 14 }}>
          <Text style={[styles.sectionLabel, { color: theme.textMuted }]}>
            Responsável / De Quem?
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {activeWorkspace.members.map((m) => {
              const isSelected = assignedTo === m.name;
              return (
                <TouchableOpacity
                  key={m.id}
                  style={[
                    styles.memberChip,
                    {
                      backgroundColor: isSelected ? theme.primary : theme.surfaceVariant,
                      borderColor: isSelected ? theme.primary : theme.border,
                    },
                  ]}
                  onPress={() => setAssignedTo(isSelected ? '' : m.name)}
                >
                  <Ionicons
                    name="person"
                    size={14}
                    color={isSelected ? '#FFF' : theme.text}
                  />
                  <Text
                    style={[
                      styles.memberChipText,
                      { color: isSelected ? '#FFF' : theme.text },
                    ]}
                  >
                    {m.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      )}

      {error ? (
        <Text style={[styles.error, { color: theme.danger }]}>{error}</Text>
      ) : null}

      <Text style={[styles.sectionLabel, { color: theme.textMuted }]}>
        Categoria
      </Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.categoryList}
      >
        {categoriesList.map((cat) => {
          const isSelected = category === cat;
          const meta = CATEGORIES_META[cat];
          return (
            <TouchableOpacity
              key={cat}
              style={[
                styles.categoryChip,
                {
                  backgroundColor: isSelected ? meta.color : theme.surfaceVariant,
                  borderColor: isSelected ? meta.color : theme.border,
                },
              ]}
              onPress={() => setCategory(cat)}
            >
              <Ionicons
                name={meta.icon as any}
                size={16}
                color={isSelected ? '#FFF' : theme.text}
              />
              <Text
                style={[
                  styles.categoryText,
                  { color: isSelected ? '#FFF' : theme.text },
                ]}
              >
                {cat}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <Input
        label="Observações (Opcional)"
        placeholder={type === 'income' ? 'Ex: Depósito em conta todo dia 5' : 'Ex: Débito automático no cartão'}
        value={notes}
        onChangeText={setNotes}
      />

      <Button
        title={initialData ? 'Salvar Alterações' : type === 'income' ? 'Salvar Provento / Renda' : 'Salvar Conta / Débito Fixo'}
        onPress={handleSave}
        style={{ marginTop: 8 }}
      />
    </ModalContainer>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
  },
  error: {
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 12,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
  },
  categoryList: {
    paddingBottom: 16,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    marginRight: 8,
  },
  categoryText: {
    marginLeft: 6,
    fontSize: 13,
    fontWeight: '600',
  },
  typeContainer: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
  },
  typeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
  },
  typeText: {
    fontSize: 13,
    fontWeight: '700',
    marginLeft: 6,
  },
  memberChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 8,
  },
  memberChipText: {
    marginLeft: 6,
    fontSize: 12,
    fontWeight: '700',
  },
});
