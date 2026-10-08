import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { ModalContainer } from '../../../core/components/ModalContainer';
import { useTheme } from '../../../core/theme/ThemeContext';
import { RecurringDebit, DeleteRecurringScope } from '../types';
import { Ionicons } from '@expo/vector-icons';
import { getMonthLabel } from '../../../core/utils/date';
import { runSafely } from '../../../core/utils/runSafely';

interface DeleteRecurringScopeModalProps {
  visible: boolean;
  recurring: RecurringDebit | null;
  selectedMonth: number;
  selectedYear: number;
  onClose: () => void;
  onConfirm: (id: string, scope: DeleteRecurringScope) => void | Promise<void>;
}

export const DeleteRecurringScopeModal: React.FC<DeleteRecurringScopeModalProps> = ({
  visible,
  recurring,
  selectedMonth,
  selectedYear,
  onClose,
  onConfirm,
}) => {
  const { theme } = useTheme();

  if (!recurring) return null;

  const monthLabel = getMonthLabel(selectedMonth, selectedYear);

  return (
    <ModalContainer
      visible={visible}
      onClose={onClose}
      title="Excluir Conta Recorrente"
    >
      <View style={styles.container}>
        <Text style={[styles.subtitle, { color: theme.textMuted }]}>
          Como deseja aplicar a exclusão de{' '}
          <Text style={{ fontWeight: '700', color: theme.text }}>
            &quot;{recurring.title}&quot;
          </Text>
          ?
        </Text>

        {/* Opção 1: Apenas desta competência */}
        <TouchableOpacity
          style={[styles.optionCard, { backgroundColor: theme.surfaceVariant, borderColor: theme.border }]}
          onPress={() => {
            onClose();
            runSafely(() => onConfirm(recurring.id, 'month'), 'Não foi possível excluir a conta recorrente.');
          }}
          activeOpacity={0.7}
        >
          <View style={[styles.iconWrap, { backgroundColor: '#3B82F618' }]}>
            <Ionicons name="calendar-outline" size={22} color="#3B82F6" />
          </View>
          <View style={styles.optionContent}>
            <Text style={[styles.optionTitle, { color: theme.text }]}>
              Apenas de {monthLabel}
            </Text>
            <Text style={[styles.optionDesc, { color: theme.textMuted }]}>
              Não será cobrado nesta competência, mas continua ativo nos outros meses passados e futuros.
            </Text>
          </View>
        </TouchableOpacity>

        {/* Opção 2: Desta competência em diante */}
        <TouchableOpacity
          style={[styles.optionCard, { backgroundColor: theme.surfaceVariant, borderColor: theme.border }]}
          onPress={() => {
            onClose();
            runSafely(() => onConfirm(recurring.id, 'forward'), 'Não foi possível excluir a conta recorrente.');
          }}
          activeOpacity={0.7}
        >
          <View style={[styles.iconWrap, { backgroundColor: '#F59E0B18' }]}>
            <Ionicons name="stop-circle-outline" size={22} color="#F59E0B" />
          </View>
          <View style={styles.optionContent}>
            <Text style={[styles.optionTitle, { color: theme.text }]}>
              Desta competência em diante
            </Text>
            <Text style={[styles.optionDesc, { color: theme.textMuted }]}>
              Preserva 100% do histórico dos meses passados e encerra a conta a partir de {monthLabel}.
            </Text>
          </View>
        </TouchableOpacity>

        {/* Opção 3: De todos os meses (Definitivo) */}
        <TouchableOpacity
          style={[styles.optionCard, { backgroundColor: '#EF444410', borderColor: '#EF444440' }]}
          onPress={() => {
            onClose();
            runSafely(() => onConfirm(recurring.id, 'all'), 'Não foi possível excluir a conta recorrente.');
          }}
          activeOpacity={0.7}
        >
          <View style={[styles.iconWrap, { backgroundColor: '#EF444420' }]}>
            <Ionicons name="trash-outline" size={22} color="#EF4444" />
          </View>
          <View style={styles.optionContent}>
            <Text style={[styles.optionTitle, { color: '#EF4444' }]}>
              De todos os meses (Definitivo)
            </Text>
            <Text style={[styles.optionDesc, { color: theme.textMuted }]}>
              Apaga a conta por completo do passado, presente e futuro. Ideal para contas criadas por engano.
            </Text>
          </View>
        </TouchableOpacity>

        {/* Botão Cancelar */}
        <TouchableOpacity
          style={[styles.cancelBtn, { borderColor: theme.border }]}
          onPress={onClose}
          activeOpacity={0.7}
        >
          <Text style={[styles.cancelBtnText, { color: theme.text }]}>Cancelar</Text>
        </TouchableOpacity>
      </View>
    </ModalContainer>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: 8,
  },
  subtitle: {
    fontSize: 14,
    marginBottom: 16,
    lineHeight: 20,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  optionContent: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 3,
  },
  optionDesc: {
    fontSize: 12,
    lineHeight: 16,
  },
  cancelBtn: {
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    marginTop: 4,
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
