import React, { useState } from 'react';
import { Text, StyleSheet } from 'react-native';
import { ModalContainer } from '../../../core/components/ModalContainer';
import { Input } from '../../../core/components/Input';
import { Button } from '../../../core/components/Button';
import { useTheme } from '../../../core/theme/ThemeContext';

interface DepositGoalModalProps {
  visible: boolean;
  onClose: () => void;
  goalTitle: string;
  onSubmit: (amount: number) => void;
}

export const DepositGoalModal: React.FC<DepositGoalModalProps> = ({
  visible,
  onClose,
  goalTitle,
  onSubmit,
}) => {
  const { theme } = useTheme();
  const [amountStr, setAmountStr] = useState('');
  const [error, setError] = useState('');

  const handleDeposit = () => {
    const cleanAmount = parseFloat(amountStr.replace(',', '.'));
    if (isNaN(cleanAmount) || cleanAmount <= 0) {
      setError('Informe um valor de aporte válido maior que zero');
      return;
    }

    setError('');
    onSubmit(cleanAmount);
    setAmountStr('');
    onClose();
  };

  return (
    <ModalContainer
      visible={visible}
      onClose={onClose}
      title={`Aporte em: ${goalTitle}`}
    >
      <Input
        label="Valor do Aporte (R$)"
        placeholder="Ex: 500.00"
        keyboardType="decimal-pad"
        value={amountStr}
        onChangeText={setAmountStr}
        error={error}
      />

      <Button
        title="Confirmar Depósito na Meta"
        onPress={handleDeposit}
        style={{ marginTop: 8 }}
      />
    </ModalContainer>
  );
};
