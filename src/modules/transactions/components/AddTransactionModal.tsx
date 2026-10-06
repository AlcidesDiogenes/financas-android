import React, { useState, useEffect } from 'react';
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
import { TransactionCategory, TransactionType } from '../types';
import { CATEGORIES_META } from '../../../core/utils/categories';
import { Ionicons } from '@expo/vector-icons';

interface AddTransactionModalProps {
  visible: boolean;
  onClose: () => void;
  initialMode?: 'expense' | 'income' | 'saving';
  onSubmit: (data: {
    title: string;
    amount: number;
    type: TransactionType;
    category: TransactionCategory;
    date: string;
    assignedTo?: string;
    notes?: string;
  }) => void;
}

const EXPENSE_CATEGORIES: TransactionCategory[] = [
  'Alimentação',
  'Moradia',
  'Transporte',
  'Lazer',
  'Saúde',
  'Educação',
  'Assinaturas',
  'Outros',
];

const INCOME_CATEGORIES: TransactionCategory[] = [
  'Salário',
  'Investimentos',
  'Extra',
  'Outros',
];

const SAVING_CATEGORIES: TransactionCategory[] = [
  'Economia',
  'Investimentos',
  'Outros',
];

export const AddTransactionModal: React.FC<AddTransactionModalProps> = ({
  visible,
  onClose,
  initialMode = 'expense',
  onSubmit,
}) => {
  const { theme } = useTheme();
  const { activeWorkspace } = useWorkspace();

  const [entryMode, setEntryMode] = useState<'expense' | 'income' | 'saving'>(initialMode);
  const [title, setTitle] = useState('');
  const [amountStr, setAmountStr] = useState('');
  const [type, setType] = useState<TransactionType>('expense');
  const [category, setCategory] = useState<TransactionCategory>('Alimentação');
  const [assignedTo, setAssignedTo] = useState<string>('');
  const [notes, setNotes] = useState('');
  const [titleError, setTitleError] = useState('');
  const [amountError, setAmountError] = useState('');

  useEffect(() => {
    if (visible) {
      const mode = initialMode || 'expense';
      setEntryMode(mode);
      if (mode === 'saving') {
        setType('expense');
        setCategory('Economia');
      } else if (mode === 'income') {
        setType('income');
        setCategory('Salário');
      } else {
        setType('expense');
        setCategory('Alimentação');
      }
      setTitleError('');
      setAmountError('');
    }
  }, [visible, initialMode]);

  const handleSave = () => {
    let hasError = false;

    if (!title.trim()) {
      setTitleError(
        entryMode === 'saving'
          ? 'Informe onde guardou o dinheiro'
          : 'Informe a descrição do lançamento'
      );
      hasError = true;
    } else {
      setTitleError('');
    }

    const cleanAmount = parseFloat(amountStr.replace(',', '.'));
    if (isNaN(cleanAmount) || cleanAmount <= 0) {
      setAmountError('Informe um valor válido maior que zero');
      hasError = true;
    } else {
      setAmountError('');
    }

    if (hasError) return;

    onSubmit({
      title: title.trim(),
      amount: cleanAmount,
      type,
      category,
      date: new Date().toISOString(),
      assignedTo: assignedTo.trim() || undefined,
      notes: notes.trim() || undefined,
    });

    // Reset form
    setTitle('');
    setAmountStr('');
    setAssignedTo('');
    setNotes('');
    onClose();
  };

  const isShared = activeWorkspace.type === 'shared';
  const categoriesList =
    entryMode === 'saving'
      ? SAVING_CATEGORIES
      : entryMode === 'income'
      ? INCOME_CATEGORIES
      : EXPENSE_CATEGORIES;

  return (
    <ModalContainer
      visible={visible}
      onClose={onClose}
      title={
        entryMode === 'saving'
          ? 'Nova Economia / Guardado'
          : entryMode === 'income'
          ? 'Nova Receita'
          : 'Nova Despesa'
      }
    >
      {/* Type Toggle: Despesa vs Receita vs Economia */}
      <View style={[styles.typeContainer, { backgroundColor: theme.surfaceVariant }]}>
        <TouchableOpacity
          style={[
            styles.typeButton,
            entryMode === 'expense' && { backgroundColor: theme.danger },
          ]}
          onPress={() => {
            setEntryMode('expense');
            setType('expense');
            setCategory('Alimentação');
          }}
        >
          <Ionicons
            name="arrow-down-circle"
            size={16}
            color={entryMode === 'expense' ? '#FFF' : theme.textMuted}
          />
          <Text
            style={[
              styles.typeText,
              { color: entryMode === 'expense' ? '#FFF' : theme.textMuted },
            ]}
          >
            Despesa
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.typeButton,
            entryMode === 'income' && { backgroundColor: theme.success },
          ]}
          onPress={() => {
            setEntryMode('income');
            setType('income');
            setCategory('Salário');
          }}
        >
          <Ionicons
            name="arrow-up-circle"
            size={16}
            color={entryMode === 'income' ? '#FFF' : theme.textMuted}
          />
          <Text
            style={[
              styles.typeText,
              { color: entryMode === 'income' ? '#FFF' : theme.textMuted },
            ]}
          >
            Receita
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.typeButton,
            entryMode === 'saving' && { backgroundColor: '#3B82F6' },
          ]}
          onPress={() => {
            setEntryMode('saving');
            setType('expense');
            setCategory('Economia');
          }}
        >
          <Ionicons
            name="wallet"
            size={16}
            color={entryMode === 'saving' ? '#FFF' : theme.textMuted}
          />
          <Text
            style={[
              styles.typeText,
              { color: entryMode === 'saving' ? '#FFF' : theme.textMuted },
            ]}
          >
            Economia
          </Text>
        </TouchableOpacity>
      </View>

      <Input
        label={
          entryMode === 'saving'
            ? 'Onde guardou? (Banco / Poupança)'
            : entryMode === 'income'
            ? 'Origem da Receita'
            : 'Descrição da Despesa'
        }
        placeholder={
          entryMode === 'saving'
            ? 'Ex: Guardado no Banco, Poupança, Caixinha Nubank'
            : entryMode === 'income'
            ? 'Ex: Salário, Venda, Pix Recebido, Extra'
            : 'Ex: Supermercado, Farmácia, Gasolina, Uber'
        }
        value={title}
        onChangeText={(val) => {
          setTitle(val);
          if (titleError) setTitleError('');
        }}
        error={titleError}
      />

      <Input
        label="Valor (R$)"
        placeholder="0.00"
        keyboardType="decimal-pad"
        value={amountStr}
        onChangeText={(val) => {
          setAmountStr(val);
          if (amountError) setAmountError('');
        }}
        error={amountError}
      />

      {/* Responsável - Apenas se o espaço for Compartilhado */}
      {isShared && activeWorkspace.members.length > 0 && (
        <View style={{ marginBottom: 14 }}>
          <Text style={[styles.sectionLabel, { color: theme.textMuted }]}>
            Quem pagou / guardou?
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
        placeholder={
          entryMode === 'saving'
            ? 'Ex: Reserva de emergência, rendimento a 100% do CDI'
            : 'Detalhes adicionais...'
        }
        value={notes}
        onChangeText={setNotes}
      />

      <Button
        title={
          entryMode === 'saving'
            ? 'Salvar Economia Guardada'
            : entryMode === 'income'
            ? 'Cadastrar Receita'
            : 'Cadastrar Despesa'
        }
        onPress={handleSave}
        style={{ marginTop: 12 }}
      />
    </ModalContainer>
  );
};

const styles = StyleSheet.create({
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
    marginLeft: 6,
    fontWeight: '700',
    fontSize: 13,
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
