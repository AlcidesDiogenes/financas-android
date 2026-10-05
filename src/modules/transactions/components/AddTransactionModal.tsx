import React, { useState } from 'react';
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
import { TransactionCategory, TransactionType } from '../types';
import { CATEGORIES_META } from '../../../core/utils/categories';
import { Ionicons } from '@expo/vector-icons';

interface AddTransactionModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (data: {
    title: string;
    amount: number;
    type: TransactionType;
    category: TransactionCategory;
    date: string;
    notes?: string;
  }) => void;
}

const CATEGORIES: TransactionCategory[] = [
  'Alimentação',
  'Moradia',
  'Transporte',
  'Lazer',
  'Saúde',
  'Educação',
  'Assinaturas',
  'Salário',
  'Investimentos',
  'Extra',
  'Outros',
];

export const AddTransactionModal: React.FC<AddTransactionModalProps> = ({
  visible,
  onClose,
  onSubmit,
}) => {
  const { theme } = useTheme();

  const [title, setTitle] = useState('');
  const [amountStr, setAmountStr] = useState('');
  const [type, setType] = useState<TransactionType>('expense');
  const [category, setCategory] = useState<TransactionCategory>('Alimentação');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');

  const handleSave = () => {
    if (!title.trim()) {
      setError('Informe a descrição do lançamento');
      return;
    }

    const cleanAmount = parseFloat(amountStr.replace(',', '.'));
    if (isNaN(cleanAmount) || cleanAmount <= 0) {
      setError('Informe um valor válido maior que zero');
      return;
    }

    setError('');
    onSubmit({
      title: title.trim(),
      amount: cleanAmount,
      type,
      category,
      date: new Date().toISOString(),
      notes: notes.trim() || undefined,
    });

    // Reset form
    setTitle('');
    setAmountStr('');
    setType('expense');
    setCategory('Alimentação');
    setNotes('');
    onClose();
  };

  return (
    <ModalContainer
      visible={visible}
      onClose={onClose}
      title="Novo Lançamento"
    >
      {/* Type Toggle: Despesa vs Receita */}
      <View style={[styles.typeContainer, { backgroundColor: theme.surfaceVariant }]}>
        <TouchableOpacity
          style={[
            styles.typeButton,
            type === 'expense' && { backgroundColor: theme.danger },
          ]}
          onPress={() => setType('expense')}
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
            Despesa
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.typeButton,
            type === 'income' && { backgroundColor: theme.success },
          ]}
          onPress={() => {
            setType('income');
            if (category === 'Alimentação') setCategory('Salário');
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
            Receita
          </Text>
        </TouchableOpacity>
      </View>

      <Input
        label="Descrição"
        placeholder="Ex: Supermercado, Salário, Uber"
        value={title}
        onChangeText={setTitle}
      />

      <Input
        label="Valor (R$)"
        placeholder="0.00"
        keyboardType="decimal-pad"
        value={amountStr}
        onChangeText={setAmountStr}
        error={error}
      />

      <Text style={[styles.sectionLabel, { color: theme.textMuted }]}>
        Categoria
      </Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.categoryList}
      >
        {CATEGORIES.map((cat) => {
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
        placeholder="Detalhes adicionais..."
        value={notes}
        onChangeText={setNotes}
      />

      <Button
        title="Salvar Lançamento"
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
    fontSize: 14,
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
});
