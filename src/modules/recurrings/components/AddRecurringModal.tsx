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
import { TransactionCategory } from '../../transactions/types';
import { RecurringFrequency } from '../types';
import { CATEGORIES_META } from '../../../core/utils/categories';
import { Ionicons } from '@expo/vector-icons';

interface AddRecurringModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (data: {
    title: string;
    amount: number;
    category: TransactionCategory;
    frequency: RecurringFrequency;
    dueDay: number;
    reminderEnabled: boolean;
    notes?: string;
  }) => void;
}

const CATEGORIES: TransactionCategory[] = [
  'Moradia',
  'Assinaturas',
  'Saúde',
  'Educação',
  'Transporte',
  'Lazer',
  'Alimentação',
  'Outros',
];

export const AddRecurringModal: React.FC<AddRecurringModalProps> = ({
  visible,
  onClose,
  onSubmit,
}) => {
  const { theme } = useTheme();

  const [title, setTitle] = useState('');
  const [amountStr, setAmountStr] = useState('');
  const [category, setCategory] = useState<TransactionCategory>('Moradia');
  const [dueDayStr, setDueDayStr] = useState('10');
  const [frequency, setFrequency] = useState<RecurringFrequency>('monthly');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');

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

    setError('');
    onSubmit({
      title: title.trim(),
      amount: cleanAmount,
      category,
      frequency,
      dueDay: day,
      reminderEnabled: true,
      notes: notes.trim() || undefined,
    });

    // Reset
    setTitle('');
    setAmountStr('');
    setCategory('Moradia');
    setDueDayStr('10');
    setNotes('');
    onClose();
  };

  return (
    <ModalContainer
      visible={visible}
      onClose={onClose}
      title="Novo Débito Recorrente"
    >
      <Input
        label="Nome do Débito / Assinatura"
        placeholder="Ex: Aluguel, Netflix, Internet, Academia"
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
            label="Dia de Venc."
            placeholder="Ex: 10"
            keyboardType="number-pad"
            maxLength={2}
            value={dueDayStr}
            onChangeText={setDueDayStr}
          />
        </View>
      </View>

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
        placeholder="Ex: Débito automático no cartão"
        value={notes}
        onChangeText={setNotes}
      />

      <Button
        title="Cadastrar Débito Recorrente"
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
});
