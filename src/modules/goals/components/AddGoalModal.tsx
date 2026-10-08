import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { ModalContainer } from '../../../core/components/ModalContainer';
import { Input } from '../../../core/components/Input';
import { Button } from '../../../core/components/Button';
import { runSafely } from '../../../core/utils/runSafely';
import { useTheme } from '../../../core/theme/ThemeContext';
import { Goal } from '../types';
import { Ionicons } from '@expo/vector-icons';
import { formatCurrency } from '../../../core/utils/currency';
import { applyMonthYearMask, parseMonthYear, getMonthLabel } from '../../../core/utils/date';

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
  }) => void | Promise<void>;
  initialData?: Goal | null;
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

const PRESET_MONTHS = [
  { label: '6 meses', months: 6 },
  { label: '1 ano', months: 12 },
  { label: '2 anos', months: 24 },
  { label: '3 anos', months: 36 },
  { label: '5 anos', months: 60 },
];

export const AddGoalModal: React.FC<AddGoalModalProps> = ({
  visible,
  onClose,
  onSubmit,
  initialData,
}) => {
  const { theme } = useTheme();

  const [title, setTitle] = useState('');
  const [targetAmountStr, setTargetAmountStr] = useState('');
  const [initialAmountStr, setInitialAmountStr] = useState('');
  const [deadlineMode, setDeadlineMode] = useState<'months' | 'date'>('months');
  const [monthsAhead, setMonthsAhead] = useState('12');
  const [targetMonthYearStr, setTargetMonthYearStr] = useState('');
  const [notes, setNotes] = useState('');
  const [selectedIconIndex, setSelectedIconIndex] = useState(0);

  const [titleError, setTitleError] = useState('');
  const [targetError, setTargetError] = useState('');
  const [dateError, setDateError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Helper para calcular mês/ano a partir de N meses à frente
  const calculateMonthYearFromMonths = (months: number) => {
    const d = new Date();
    d.setMonth(d.getMonth() + months);
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const y = d.getFullYear();
    return `${m}/${y}`;
  };

  useEffect(() => {
    if (initialData) {
      setTitle(initialData.title);
      setTargetAmountStr(initialData.targetAmount.toString());
      setInitialAmountStr(initialData.currentAmount.toString());
      setNotes(initialData.notes || '');

      const deadline = new Date(initialData.deadlineDate);
      const today = new Date();
      const diffMonths = Math.max(
        1,
        (deadline.getFullYear() - today.getFullYear()) * 12 +
          (deadline.getMonth() - today.getMonth())
      );
      setMonthsAhead(diffMonths.toString());
      const m = String(deadline.getMonth() + 1).padStart(2, '0');
      const y = deadline.getFullYear();
      setTargetMonthYearStr(`${m}/${y}`);

      const foundIdx = GOAL_ICONS.findIndex((i) => i.icon === initialData.icon);
      setSelectedIconIndex(foundIdx >= 0 ? foundIdx : 0);
    } else {
      setTitle('');
      setTargetAmountStr('');
      setInitialAmountStr('');
      setMonthsAhead('12');
      setTargetMonthYearStr(calculateMonthYearFromMonths(12));
      setNotes('');
      setSelectedIconIndex(0);
      setDeadlineMode('months');
    }
    setTitleError('');
    setTargetError('');
    setDateError('');
  }, [initialData, visible]);

  // Atualização bidirecional quando o usuário digita meses
  const handleMonthsChange = (val: string) => {
    setMonthsAhead(val);
    setDateError('');
    const num = parseInt(val, 10);
    if (!isNaN(num) && num > 0) {
      setTargetMonthYearStr(calculateMonthYearFromMonths(num));
    }
  };

  // Atualização quando escolhe preset
  const handleSelectPreset = (months: number) => {
    setMonthsAhead(months.toString());
    setTargetMonthYearStr(calculateMonthYearFromMonths(months));
    setDateError('');
  };

  // Atualização bidirecional quando o usuário digita MM/AAAA
  const handleMonthYearChange = (val: string) => {
    const masked = applyMonthYearMask(val);
    setTargetMonthYearStr(masked);

    if (masked.length === 7) {
      const parsed = parseMonthYear(masked);
      if (!parsed) {
        setDateError('Mês e ano inválidos (use MM/AAAA)');
        return;
      }
      const today = new Date();
      const currentTotalMonths = today.getFullYear() * 12 + today.getMonth();
      const targetTotalMonths = parsed.year * 12 + (parsed.month - 1);
      const diff = targetTotalMonths - currentTotalMonths;

      if (diff < 1) {
        setDateError('O prazo deve ser no mínimo para o próximo mês');
      } else {
        setDateError('');
        setMonthsAhead(diff.toString());
      }
    } else {
      setDateError('');
    }
  };

  // Cálculo da previsão em tempo real
  const parsedMonths = parseInt(monthsAhead, 10) || 0;
  const targetAmount = parseFloat(targetAmountStr.replace(',', '.')) || 0;
  const initialAmount = parseFloat(initialAmountStr.replace(',', '.')) || 0;
  const neededTotal = Math.max(0, targetAmount - initialAmount);
  const monthlySavings = parsedMonths > 0 ? neededTotal / parsedMonths : 0;

  const previewDateLabel = useMemo(() => {
    const parsed = parseMonthYear(targetMonthYearStr);
    if (parsed) {
      return getMonthLabel(parsed.month, parsed.year);
    }
    if (parsedMonths > 0) {
      const d = new Date();
      d.setMonth(d.getMonth() + parsedMonths);
      return getMonthLabel(d.getMonth() + 1, d.getFullYear());
    }
    return '';
  }, [targetMonthYearStr, parsedMonths]);

  const handleSave = async () => {
    if (isSaving) return;
    let hasError = false;

    if (!title.trim()) {
      setTitleError('Informe o título da meta');
      hasError = true;
    } else {
      setTitleError('');
    }

    const target = parseFloat(targetAmountStr.replace(',', '.'));
    if (isNaN(target) || target <= 0) {
      setTargetError('Informe um valor de objetivo válido maior que zero');
      hasError = true;
    } else {
      setTargetError('');
    }

    let deadline: Date;
    if (deadlineMode === 'months') {
      const months = parseInt(monthsAhead, 10);
      if (isNaN(months) || months < 1) {
        setDateError('Informe uma quantidade válida de meses (mínimo 1)');
        hasError = true;
      } else {
        setDateError('');
        deadline = new Date();
        deadline.setMonth(deadline.getMonth() + months);
      }
    } else {
      const parsed = parseMonthYear(targetMonthYearStr);
      if (!parsed) {
        setDateError('Informe o mês e ano final no formato MM/AAAA');
        hasError = true;
      } else {
        const today = new Date();
        const currentTotalMonths = today.getFullYear() * 12 + today.getMonth();
        const targetTotalMonths = parsed.year * 12 + (parsed.month - 1);
        if (targetTotalMonths - currentTotalMonths < 1) {
          setDateError('O mês e ano final devem ser a partir do próximo mês');
          hasError = true;
        } else {
          setDateError('');
          // Dia 28 para evitar estouro em meses de 30/28 dias
          deadline = new Date(parsed.year, parsed.month - 1, 28, 23, 59, 59);
        }
      }
    }

    if (hasError) return;

    const initial = parseFloat(initialAmountStr.replace(',', '.')) || 0;

    setIsSaving(true);
    const ok = await runSafely(
      () =>
        onSubmit({
          title: title.trim(),
          targetAmount: target,
          initialAmount: initial,
          deadlineDate: deadline!.toISOString(),
          icon: GOAL_ICONS[selectedIconIndex].icon,
          color: GOAL_ICONS[selectedIconIndex].color,
          notes: notes.trim() ? notes.trim() : undefined,
        }),
      'Não foi possível salvar a meta. Tente novamente.'
    );
    setIsSaving(false);
    if (!ok) return;

    onClose();
  };

  return (
    <ModalContainer
      visible={visible}
      onClose={onClose}
      title={initialData ? `Editar Meta: ${initialData.title}` : 'Nova Meta Financeira'}
    >
      <Input
        label="Nome da Meta"
        placeholder="Ex: Reserva de Emergência, Comprar Carro"
        value={title}
        onChangeText={(val) => {
          setTitle(val);
          if (titleError) setTitleError('');
        }}
        error={titleError}
      />

      <View style={styles.row}>
        <View style={{ flex: 1, marginRight: 8 }}>
          <Input
            label="Objetivo (R$)"
            placeholder="0.00"
            keyboardType="decimal-pad"
            value={targetAmountStr}
            onChangeText={(val) => {
              setTargetAmountStr(val);
              if (targetError) setTargetError('');
            }}
            error={targetError}
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

      {/* Seletor de Modo de Prazo (Bidirecional) */}
      <Text style={[styles.sectionLabel, { color: theme.textMuted }]}>
        Definição do Prazo
      </Text>
      <View style={[styles.modeTabs, { backgroundColor: theme.surfaceVariant, borderColor: theme.border }]}>
        <TouchableOpacity
          style={[
            styles.modeTab,
            deadlineMode === 'months' && [styles.modeTabActive, { backgroundColor: theme.primary }],
          ]}
          onPress={() => setDeadlineMode('months')}
          activeOpacity={0.7}
        >
          <Ionicons
            name="hourglass-outline"
            size={15}
            color={deadlineMode === 'months' ? '#FFF' : theme.textMuted}
          />
          <Text
            style={[
              styles.modeTabText,
              { color: deadlineMode === 'months' ? '#FFF' : theme.text },
              deadlineMode === 'months' && styles.modeTabTextActive,
            ]}
          >
            Por Quantidade de Meses
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.modeTab,
            deadlineMode === 'date' && [styles.modeTabActive, { backgroundColor: theme.primary }],
          ]}
          onPress={() => setDeadlineMode('date')}
          activeOpacity={0.7}
        >
          <Ionicons
            name="calendar-outline"
            size={15}
            color={deadlineMode === 'date' ? '#FFF' : theme.textMuted}
          />
          <Text
            style={[
              styles.modeTabText,
              { color: deadlineMode === 'date' ? '#FFF' : theme.text },
              deadlineMode === 'date' && styles.modeTabTextActive,
            ]}
          >
            Por Mês e Ano Final
          </Text>
        </TouchableOpacity>
      </View>

      {/* Input de acordo com o modo selecionado */}
      {deadlineMode === 'months' ? (
        <Input
          label="Prazo estimado (em meses)"
          placeholder="Ex: 12"
          keyboardType="number-pad"
          value={monthsAhead}
          onChangeText={handleMonthsChange}
          error={dateError}
        />
      ) : (
        <Input
          label="Mês e Ano final de conclusão (MM/AAAA)"
          placeholder="Ex: 10/2027"
          keyboardType="number-pad"
          maxLength={7}
          value={targetMonthYearStr}
          onChangeText={handleMonthYearChange}
          error={dateError}
        />
      )}

      {/* Atalhos rápidos de prazos comuns */}
      <View style={styles.presetsRow}>
        {PRESET_MONTHS.map((p) => {
          const isSelected = parsedMonths === p.months;
          return (
            <TouchableOpacity
              key={p.months}
              style={[
                styles.presetChip,
                {
                  backgroundColor: isSelected ? `${theme.primary}25` : theme.surfaceVariant,
                  borderColor: isSelected ? theme.primary : theme.border,
                },
              ]}
              onPress={() => handleSelectPreset(p.months)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.presetChipText,
                  { color: isSelected ? theme.primary : theme.text },
                ]}
              >
                {p.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Card de Previsão em Tempo Real */}
      <View
        style={[
          styles.forecastCard,
          { backgroundColor: theme.surfaceVariant, borderColor: theme.border },
        ]}
      >
        <View style={styles.forecastHeader}>
          <Ionicons name="flag" size={16} color={theme.primary} />
          <Text style={[styles.forecastTitle, { color: theme.primary }]}>
            Previsão: {previewDateLabel || 'A definir'} ({parsedMonths} {parsedMonths === 1 ? 'mês' : 'meses'})
          </Text>
        </View>
        {targetAmount > 0 && (
          <Text style={[styles.forecastDesc, { color: theme.textMuted }]}>
            💡 Sugestão para alcançar: <Text style={{ color: theme.text, fontWeight: '700' }}>{formatCurrency(monthlySavings)}</Text> ao mês
          </Text>
        )}
      </View>

      {/* Ícone & Categoria */}
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

      <Input
        label="Observações / Estratégia (opcional)"
        placeholder="Ex: Guardar em CDB 100% ou Tesouro Selic"
        value={notes}
        onChangeText={setNotes}
      />

      <Button
        title={initialData ? 'Salvar Alterações' : 'Criar Meta Financeira'}
        onPress={handleSave}
        loading={isSaving}
        disabled={isSaving}
        style={{ marginTop: 8 }}
      />
    </ModalContainer>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
  },
  modeTabs: {
    flexDirection: 'row',
    borderRadius: 12,
    borderWidth: 1,
    padding: 3,
    marginBottom: 12,
  },
  modeTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 9,
    borderRadius: 9,
  },
  modeTabActive: {
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
  },
  modeTabText: {
    fontSize: 12,
    fontWeight: '600',
  },
  modeTabTextActive: {
    fontWeight: '700',
  },
  presetsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: -4,
    marginBottom: 12,
  },
  presetChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  presetChipText: {
    fontSize: 11,
    fontWeight: '600',
  },
  forecastCard: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
  },
  forecastHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  forecastTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  forecastDesc: {
    fontSize: 12,
    marginTop: 2,
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
