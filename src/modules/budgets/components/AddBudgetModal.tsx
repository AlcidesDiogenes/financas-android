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
import { runSafely } from '../../../core/utils/runSafely';
import { useTheme } from '../../../core/theme/ThemeContext';
import { TransactionCategory } from '../../transactions/types';
import { CATEGORIES_META } from '../../../core/utils/categories';
import { Budget } from '../types';
import { Ionicons } from '@expo/vector-icons';

interface AddBudgetModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (
    category: TransactionCategory,
    limitAmount: number,
    startDate?: string,
    endDate?: string,
    budgetId?: string
  ) => void | Promise<void>;
  initialData?: Budget | null;
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

const applyMonthYearMask = (val: string): string => {
  const digits = val.replace(/\D/g, '');
  if (digits.length <= 2) return digits;
  return `${digits.slice(0, 2)}/${digits.slice(2, 6)}`;
};

const parseMonthYearToISO = (val: string): string | undefined => {
  const clean = val.trim();
  if (!clean) return undefined;
  const parts = clean.split('/');
  if (parts.length === 2 && parts[0].length === 2 && parts[1].length === 4) {
    const month = parseInt(parts[0], 10);
    const year = parseInt(parts[1], 10);
    if (month >= 1 && month <= 12 && year >= 2000 && year <= 2100) {
      return `${year}-${String(month).padStart(2, '0')}`;
    }
  }
  return undefined;
};

export const AddBudgetModal: React.FC<AddBudgetModalProps> = ({
  visible,
  onClose,
  onSubmit,
  initialData,
}) => {
  const { theme } = useTheme();

  const [category, setCategory] = useState<TransactionCategory>('Alimentação');
  const [limitStr, setLimitStr] = useState('');
  const [startMonthYear, setStartMonthYear] = useState('');
  const [endMonthYear, setEndMonthYear] = useState('');
  const [limitError, setLimitError] = useState('');
  const [vigenciaError, setVigenciaError] = useState('');

  React.useEffect(() => {
    if (initialData) {
      setCategory(initialData.category);
      setLimitStr(initialData.limitAmount.toString());

      if (initialData.startDate) {
        const parts = initialData.startDate.split('-');
        if (parts.length >= 2) {
          setStartMonthYear(`${parts[1]}/${parts[0]}`);
        } else {
          setStartMonthYear('');
        }
      } else if (initialData.month && initialData.year) {
        setStartMonthYear(`${String(initialData.month).padStart(2, '0')}/${initialData.year}`);
      } else {
        setStartMonthYear('');
      }

      if (initialData.endDate) {
        const parts = initialData.endDate.split('-');
        if (parts.length >= 2) {
          setEndMonthYear(`${parts[1]}/${parts[0]}`);
        } else {
          setEndMonthYear('');
        }
      } else {
        setEndMonthYear('');
      }
    } else {
      setCategory('Alimentação');
      setLimitStr('');
      const now = new Date();
      setStartMonthYear(`${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`);
      setEndMonthYear('');
    }
    setLimitError('');
    setVigenciaError('');
  }, [initialData, visible]);

  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    if (isSaving) return;
    let hasError = false;

    const cleanAmount = parseFloat(limitStr.replace(',', '.'));
    if (isNaN(cleanAmount) || cleanAmount <= 0) {
      setLimitError('Informe um valor de teto válido maior que zero');
      hasError = true;
    } else {
      setLimitError('');
    }

    let startDateFormatted: string | undefined;
    let vigErr = '';
    if (startMonthYear.trim()) {
      startDateFormatted = parseMonthYearToISO(startMonthYear);
      if (!startDateFormatted) {
        vigErr = 'Início inválido. Use o formato MM/AAAA (ex: 01/2026)';
        hasError = true;
      }
    }

    let endDateFormatted: string | undefined;
    if (endMonthYear.trim()) {
      endDateFormatted = parseMonthYearToISO(endMonthYear);
      if (!endDateFormatted) {
        vigErr = 'Término inválido. Use o formato MM/AAAA (ex: 12/2026)';
        hasError = true;
      }
    }

    if (startDateFormatted && endDateFormatted) {
      const startParts = startDateFormatted.split('-').map(Number);
      const endParts = endDateFormatted.split('-').map(Number);
      const startComp = startParts[0] * 12 + startParts[1];
      const endComp = endParts[0] * 12 + endParts[1];
      if (startComp > endComp) {
        vigErr = 'O início da vigência não pode ser posterior ao término';
        hasError = true;
      }
    }

    setVigenciaError(vigErr);
    if (hasError) return;
    // Espera o salvamento: se falhar, mantém o formulário aberto
    setIsSaving(true);
    const ok = await runSafely(
      () => onSubmit(category, cleanAmount, startDateFormatted, endDateFormatted, initialData?.id),
      'Não foi possível salvar o orçamento. Tente novamente.'
    );
    setIsSaving(false);
    if (!ok) return;

    setLimitStr('');
    setCategory('Alimentação');
    onClose();
  };

  return (
    <ModalContainer
      visible={visible}
      onClose={onClose}
      title={initialData ? `Editar Teto: ${initialData.category}` : 'Definir Teto de Gastos (Budget)'}
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
        onChangeText={(val) => {
          setLimitStr(val);
          if (limitError) setLimitError('');
        }}
        error={limitError}
      />

      {/* Vigência (Início e Fim) */}
      <View style={{ marginBottom: 14 }}>
        <Text style={[styles.sectionLabel, { color: theme.textMuted }]}>
          Vigência (Duração / Período do Teto)
        </Text>
        <View style={styles.row}>
          <View style={{ flex: 1, marginRight: 12 }}>
            <Input
              label="Início (MM/AAAA)"
              placeholder="Ex: 01/2026"
              keyboardType="numeric"
              maxLength={7}
              value={startMonthYear}
              onChangeText={(val) => {
                setStartMonthYear(applyMonthYearMask(val));
                if (vigenciaError) setVigenciaError('');
              }}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Input
              label="Término (Opcional)"
              placeholder="Ex: 12/2026"
              keyboardType="numeric"
              maxLength={7}
              value={endMonthYear}
              onChangeText={(val) => {
                setEndMonthYear(applyMonthYearMask(val));
                if (vigenciaError) setVigenciaError('');
              }}
            />
          </View>
        </View>
        {vigenciaError ? (
          <Text style={{ fontSize: 12, color: theme.danger, marginTop: -8, marginBottom: 6, fontWeight: '500' }}>
            {vigenciaError}
          </Text>
        ) : null}
        <Text style={{ fontSize: 11, color: theme.textMuted, marginTop: 2, marginLeft: 2 }}>
          💡 Deixe o término em branco se este teto for contínuo para todos os próximos meses.
        </Text>
      </View>

      <Button
        title={initialData ? 'Salvar Alterações' : 'Salvar Orçamento'}
        onPress={handleSave}
        loading={isSaving}
        disabled={isSaving}
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
  row: {
    flexDirection: 'row',
  },
  error: {
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 10,
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
