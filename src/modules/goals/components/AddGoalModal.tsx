import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { ModalContainer } from '../../../core/components/ModalContainer';
import { Input } from '../../../core/components/Input';
import { Button } from '../../../core/components/Button';
import { useTheme } from '../../../core/theme/ThemeContext';
import { Ionicons } from '@expo/vector-icons';

interface AddGoalModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (data: {
    title: string;
    targetAmount: number;
    initialAmount: number;
    deadlineDate: string;
    icon: string;
    color: string;
    notes?: string;
  }) => void;
}

const GOAL_ICONS = [
  { icon: 'shield-checkmark-outline', color: '#10B981', label: 'Reserva' },
  { icon: 'airplane-outline', color: '#3B82F6', label: 'Viagem' },
  { icon: 'business-outline', color: '#8B5CF6', label: 'Imóvel' },
  { icon: 'car-outline', color: '#F59E0B', label: 'Carro' },
  { icon: 'school-outline', color: '#06B6D4', label: 'Estudos' },
  { icon: 'heart-outline', color: '#EC4899', label: 'Casamento' },
  { icon: 'star-outline', color: '#6366F1', label: 'Sonho' },
];

export const AddGoalModal: React.FC<AddGoalModalProps> = ({
  visible,
  onClose,
  onSubmit,
}) => {
  const { theme } = useTheme();

  const [title, setTitle] = useState('');
  const [targetAmountStr, setTargetAmountStr] = useState('');
  const [initialAmountStr, setInitialAmountStr] = useState('');
  const [monthsAhead, setMonthsAhead] = useState('12');
  const [selectedIconIndex, setSelectedIconIndex] = useState(0);
  const [error, setError] = useState('');

  const handleSave = () => {
    if (!title.trim()) {
      setError('Informe o título da meta');
      return;
    }

    const target = parseFloat(targetAmountStr.replace(',', '.'));
    if (isNaN(target) || target <= 0) {
      setError('Informe um valor de objetivo válido');
      return;
    }

    const initial = parseFloat(initialAmountStr.replace(',', '.')) || 0;
    const months = parseInt(monthsAhead, 10) || 12;

    const deadline = new Date();
    deadline.setMonth(deadline.getMonth() + months);

    setError('');
    onSubmit({
      title: title.trim(),
      targetAmount: target,
      initialAmount: initial,
      deadlineDate: deadline.toISOString(),
      icon: GOAL_ICONS[selectedIconIndex].icon,
      color: GOAL_ICONS[selectedIconIndex].color,
    });

    // Reset
    setTitle('');
    setTargetAmountStr('');
    setInitialAmountStr('');
    setMonthsAhead('12');
    setSelectedIconIndex(0);
    onClose();
  };

  return (
    <ModalContainer
      visible={visible}
      onClose={onClose}
      title="Nova Meta Financeira"
    >
      <Input
        label="Nome da Meta"
        placeholder="Ex: Reserva de Emergência, Comprar Carro"
        value={title}
        onChangeText={setTitle}
      />

      <View style={styles.row}>
        <View style={{ flex: 1, marginRight: 8 }}>
          <Input
            label="Objetivo (R$)"
            placeholder="0.00"
            keyboardType="decimal-pad"
            value={targetAmountStr}
            onChangeText={setTargetAmountStr}
          />
        </View>

        <View style={{ flex: 1 }}>
          <Input
            label="Já tenho (R$)"
            placeholder="0.00"
            keyboardType="decimal-pad"
            value={initialAmountStr}
            onChangeText={setInitialAmountStr}
          />
        </View>
      </View>

      <Input
        label="Prazo estimado (meses)"
        placeholder="Ex: 12"
        keyboardType="number-pad"
        value={monthsAhead}
        onChangeText={setMonthsAhead}
      />

      {error ? (
        <Text style={[styles.error, { color: theme.danger }]}>{error}</Text>
      ) : null}

      <Text style={[styles.sectionLabel, { color: theme.textMuted }]}>
        Ícone & Categoria
      </Text>
      <View style={styles.iconRow}>
        {GOAL_ICONS.map((item, idx) => {
          const isSelected = selectedIconIndex === idx;
          return (
            <TouchableOpacity
              key={idx}
              style={[
                styles.iconChip,
                {
                  backgroundColor: isSelected ? `${item.color}25` : theme.surfaceVariant,
                  borderColor: isSelected ? item.color : theme.border,
                },
              ]}
              onPress={() => setSelectedIconIndex(idx)}
            >
              <Ionicons name={item.icon as any} size={22} color={item.color} />
              <Text style={[styles.iconLabel, { color: theme.text }]}>
                {item.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <Button
        title="Criar Meta Financeira"
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
    marginBottom: 10,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
  },
  iconRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  iconChip: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    minWidth: 70,
  },
  iconLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 4,
  },
});
