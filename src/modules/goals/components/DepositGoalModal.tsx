import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { ModalContainer } from '../../../core/components/ModalContainer';
import { Input } from '../../../core/components/Input';
import { Button } from '../../../core/components/Button';
import { useTheme } from '../../../core/theme/ThemeContext';
import { Ionicons } from '@expo/vector-icons';

interface DepositGoalModalProps {
  visible: boolean;
  onClose: () => void;
  goalTitle: string;
  initialMode?: 'deposit' | 'withdraw';
  maxWithdrawAmount?: number;
  onSubmit: (amount: number, mode: 'deposit' | 'withdraw', createTransaction: boolean) => void;
}

export const DepositGoalModal: React.FC<DepositGoalModalProps> = ({
  visible,
  onClose,
  goalTitle,
  initialMode = 'deposit',
  maxWithdrawAmount = 0,
  onSubmit,
}) => {
  const { theme } = useTheme();
  const [mode, setMode] = useState<'deposit' | 'withdraw'>(initialMode);
  const [amountStr, setAmountStr] = useState('');
  const [createTransaction, setCreateTransaction] = useState(true);
  const [error, setError] = useState('');

  React.useEffect(() => {
    setMode(initialMode);
    setAmountStr('');
    setError('');
  }, [initialMode, visible]);

  const handleConfirm = () => {
    const cleanAmount = parseFloat(amountStr.replace(',', '.'));
    if (isNaN(cleanAmount) || cleanAmount <= 0) {
      setError('Informe um valor válido maior que zero');
      return;
    }

    if (mode === 'withdraw' && cleanAmount > maxWithdrawAmount) {
      setError(`Valor máximo para resgate é R$ ${maxWithdrawAmount.toFixed(2)}`);
      return;
    }

    setError('');
    onSubmit(cleanAmount, mode, createTransaction);
    setAmountStr('');
    onClose();
  };

  return (
    <ModalContainer
      visible={visible}
      onClose={onClose}
      title={mode === 'deposit' ? `Aporte: ${goalTitle}` : `Resgate: ${goalTitle}`}
    >
      {/* Mode Selector */}
      <View style={styles.modeRow}>
        <TouchableOpacity
          style={[
            styles.modePill,
            {
              backgroundColor: mode === 'deposit' ? theme.primary : theme.surfaceVariant,
              borderColor: mode === 'deposit' ? theme.primary : theme.border,
            },
          ]}
          onPress={() => {
            setMode('deposit');
            setError('');
          }}
        >
          <Ionicons
            name="arrow-down-circle"
            size={16}
            color={mode === 'deposit' ? '#FFF' : theme.text}
          />
          <Text
            style={[
              styles.modePillText,
              { color: mode === 'deposit' ? '#FFF' : theme.text },
            ]}
          >
            Guardar / Aporte
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.modePill,
            {
              backgroundColor: mode === 'withdraw' ? theme.primary : theme.surfaceVariant,
              borderColor: mode === 'withdraw' ? theme.primary : theme.border,
            },
          ]}
          onPress={() => {
            setMode('withdraw');
            setError('');
          }}
        >
          <Ionicons
            name="arrow-up-circle"
            size={16}
            color={mode === 'withdraw' ? '#FFF' : theme.text}
          />
          <Text
            style={[
              styles.modePillText,
              { color: mode === 'withdraw' ? '#FFF' : theme.text },
            ]}
          >
            Retirar / Resgate
          </Text>
        </TouchableOpacity>
      </View>

      <Input
        label={mode === 'deposit' ? 'Valor do Aporte (R$)' : 'Valor da Retirada (R$)'}
        placeholder="Ex: 500.00"
        keyboardType="decimal-pad"
        value={amountStr}
        onChangeText={(val) => {
          setAmountStr(val);
          if (error) setError('');
        }}
        error={error}
      />

      {/* Extrato Linking Checkbox */}
      <TouchableOpacity
        style={styles.checkboxRow}
        activeOpacity={0.7}
        onPress={() => setCreateTransaction(!createTransaction)}
      >
        <Ionicons
          name={createTransaction ? 'checkbox' : 'square-outline'}
          size={20}
          color={createTransaction ? theme.primary : theme.textMuted}
        />
        <Text style={[styles.checkboxLabel, { color: theme.text }]}>
          {mode === 'deposit'
            ? 'Lançar como saída em Economia no extrato deste mês'
            : 'Lançar como entrada de resgate no extrato deste mês'}
        </Text>
      </TouchableOpacity>

      <Button
        title={mode === 'deposit' ? 'Confirmar Aporte na Meta' : 'Confirmar Resgate da Meta'}
        onPress={handleConfirm}
        style={{ marginTop: 12 }}
      />
    </ModalContainer>
  );
};

const styles = StyleSheet.create({
  modeRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  modePill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    gap: 6,
  },
  modePillText: {
    fontSize: 13,
    fontWeight: '700',
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    paddingVertical: 6,
  },
  checkboxLabel: {
    fontSize: 13,
    marginLeft: 8,
    flex: 1,
  },
});
