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
import { CATEGORIES_META } from '../../../core/utils/categories';
import { Ionicons } from '@expo/vector-icons';

interface AddBudgetModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (category: TransactionCategory, limitAmount: number) => void;
}

const CATEGORIES: TransactionCategory[] = [
  'Alimentação',
  'Transporte',
  'Moradia',
  'Lazer',
  'Saúde',
  'Educação',
  'Assinaturas',
  'Outros',
];

export const AddBudgetModal: React.FC<AddBudgetModalProps> = ({
  visible,
  onClose,
  onSubmit,
}) => {
  const { theme } = useTheme();

  const [category, setCategory] = useState<TransactionCategory>('Alimentação');
  const [limitStr, setLimitStr] = useState('');
  const [error, setError] = useState('');

  const handleSave = () => {
    const cleanAmount = parseFloat(limitStr.replace(',', '.'));
    if (isNaN(cleanAmount) || cleanAmount <= 0) {
      setError('Informe um valor de teto válido');
      return;
    }

    setError('');
    onSubmit(category, cleanAmount);

    setLimitStr('');
    setCategory('Alimentação');
    onClose();
  };

  return (
    <ModalContainer
      visible={visible}
      onClose={onClose}
      title="Definir Teto de Gastos (Budget)"
    >
      <Text style={[styles.sectionLabel, { color: theme.textMuted }]}>
        Selecione a Categoria
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
        label="Limite Máximo Mensal (R$)"
        placeholder="Ex: 1500.00"
        keyboardType="decimal-pad"
        value={limitStr}
        onChangeText={setLimitStr}
        error={error}
      />

      <Button
        title="Salvar Orçamento"
        onPress={handleSave}
        style={{ marginTop: 8 }}
      />
    </ModalContainer>
  );
};

const styles = StyleSheet.create({
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
