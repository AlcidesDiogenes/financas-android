import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
} from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { useFinance } from '../../modules/FinanceContext';
import { getMonthLabel } from '../utils/date';
import { Ionicons } from '@expo/vector-icons';

const MONTH_NAMES = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
];

interface PeriodSelectorProps {
  compact?: boolean;
}

export const PeriodSelector: React.FC<PeriodSelectorProps> = ({ compact = false }) => {
  const { theme } = useTheme();
  const { selectedMonth, selectedYear, setSelectedPeriod } = useFinance();
  const [modalVisible, setModalVisible] = useState(false);
  const [pickerYear, setPickerYear] = useState(selectedYear);

  const openPicker = () => {
    setPickerYear(selectedYear);
    setModalVisible(true);
  };

  const changeMonthStep = (step: number) => {
    let nextMonth = selectedMonth + step;
    let nextYear = selectedYear;

    if (nextMonth > 12) {
      nextMonth = 1;
      nextYear += 1;
    } else if (nextMonth < 1) {
      nextMonth = 12;
      nextYear -= 1;
    }

    setSelectedPeriod(nextMonth, nextYear);
  };

  const handleSelectMonth = (monthNumber: number) => {
    setSelectedPeriod(monthNumber, pickerYear);
    setModalVisible(false);
  };

  const handleResetToCurrent = () => {
    const now = new Date();
    setSelectedPeriod(now.getMonth() + 1, now.getFullYear());
    setModalVisible(false);
  };

  return (
    <>
      <View
        style={[
          styles.container,
          compact ? styles.compactContainer : styles.fullContainer,
          {
            backgroundColor: theme.surface,
            borderColor: theme.border,
          },
        ]}
      >
        <TouchableOpacity
          onPress={() => changeMonthStep(-1)}
          style={[styles.arrowBtn, { backgroundColor: theme.surfaceVariant }]}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="chevron-back" size={18} color={theme.text} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.labelButton}
          onPress={openPicker}
          activeOpacity={0.7}
        >
          <View style={styles.labelRow}>
            <Ionicons name="calendar-outline" size={16} color={theme.primary} style={{ marginRight: 6 }} />
            <Text style={[styles.labelText, { color: theme.text }]}>
              {getMonthLabel(selectedMonth, selectedYear)}
            </Text>
            <Ionicons name="chevron-down" size={14} color={theme.textMuted} style={{ marginLeft: 4 }} />
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => changeMonthStep(1)}
          style={[styles.arrowBtn, { backgroundColor: theme.surfaceVariant }]}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="chevron-forward" size={18} color={theme.text} />
        </TouchableOpacity>
      </View>

      {/* Modal de Seleção Completa de Mês e Ano */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            {/* Header do Seletor com Ano e Setas de Ano */}
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>
                Selecionar Competência
              </Text>
              <TouchableOpacity
                onPress={() => setModalVisible(false)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="close" size={22} color={theme.textMuted} />
              </TouchableOpacity>
            </View>

            {/* Navegador de Ano */}
            <View style={[styles.yearRow, { backgroundColor: theme.surfaceVariant }]}>
              <TouchableOpacity
                onPress={() => setPickerYear((y) => y - 1)}
                style={styles.yearNavBtn}
              >
                <Ionicons name="chevron-back" size={20} color={theme.text} />
              </TouchableOpacity>
              <Text style={[styles.yearText, { color: theme.text }]}>
                {pickerYear}
              </Text>
              <TouchableOpacity
                onPress={() => setPickerYear((y) => y + 1)}
                style={styles.yearNavBtn}
              >
                <Ionicons name="chevron-forward" size={20} color={theme.text} />
              </TouchableOpacity>
            </View>

            {/* Grid dos 12 Meses */}
            <View style={styles.monthGrid}>
              {MONTH_NAMES.map((name, index) => {
                const monthNum = index + 1;
                const isSelected = selectedMonth === monthNum && selectedYear === pickerYear;
                const isCurrentMonthNow =
                  new Date().getMonth() + 1 === monthNum && new Date().getFullYear() === pickerYear;

                return (
                  <TouchableOpacity
                    key={monthNum}
                    style={[
                      styles.monthGridItem,
                      {
                        backgroundColor: isSelected
                          ? theme.primary
                          : theme.surfaceVariant,
                        borderColor: isCurrentMonthNow && !isSelected ? theme.primary : 'transparent',
                        borderWidth: isCurrentMonthNow && !isSelected ? 1.5 : 0,
                      },
                    ]}
                    onPress={() => handleSelectMonth(monthNum)}
                  >
                    <Text
                      style={[
                        styles.monthGridText,
                        {
                          color: isSelected ? '#FFFFFF' : theme.text,
                          fontWeight: isSelected || isCurrentMonthNow ? '700' : '500',
                        },
                      ]}
                    >
                      {name.slice(0, 3)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Ação rápida: Mês Atual */}
            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.currentMonthBtn, { borderColor: theme.border }]}
                onPress={handleResetToCurrent}
              >
                <Ionicons name="today-outline" size={16} color={theme.primary} style={{ marginRight: 6 }} />
                <Text style={[styles.currentMonthText, { color: theme.primary }]}>
                  Ir para o mês atual
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 6,
    paddingVertical: 4,
  },
  fullContainer: {
    marginVertical: 4,
  },
  compactContainer: {
    flex: 1,
  },
  arrowBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  labelButton: {
    flex: 1,
    paddingVertical: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  labelText: {
    fontSize: 15,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxWidth: 360,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  yearRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  yearNavBtn: {
    padding: 6,
  },
  yearText: {
    fontSize: 18,
    fontWeight: '800',
  },
  monthGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginHorizontal: -4,
  },
  monthGridItem: {
    width: '30%',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
    marginHorizontal: '1.5%',
  },
  monthGridText: {
    fontSize: 14,
  },
  modalFooter: {
    marginTop: 10,
    alignItems: 'center',
  },
  currentMonthBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 1,
  },
  currentMonthText: {
    fontSize: 13,
    fontWeight: '600',
  },
});
