import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../core/theme/ThemeContext';
import { useBottomBarBadge } from '../../../core/theme/BottomBarBadgeContext';
import { useFinance } from '../../../modules/FinanceContext';
import { useSwipeAction } from '../../../core/theme/SwipeActionContext';
import { ModalContainer } from '../../../core/components/ModalContainer';
import { Badge } from '../../../core/components/Badge';

export type PreferenceModalType = 'badge' | 'balance' | 'swipe' | null;

interface PreferencesSelectorModalProps {
  visible: boolean;
  activeType: PreferenceModalType;
  onClose: () => void;
}

export const PreferencesSelectorModal: React.FC<PreferencesSelectorModalProps> = ({
  visible,
  activeType,
  onClose,
}) => {
  const { theme } = useTheme();
  const { badgeStyle, setBadgeStyle } = useBottomBarBadge();
  const { balanceMode, setBalanceMode } = useFinance();
  const { swipePayDirection, setSwipePayDirection } = useSwipeAction();

  const getTitle = () => {
    switch (activeType) {
      case 'badge':
        return 'Avisos na Barra Inferior';
      case 'balance':
        return 'Cálculo do Saldo Principal';
      case 'swipe':
        return 'Gesto ao Deslizar nas Contas';
      default:
        return 'Preferências';
    }
  };

  return (
    <ModalContainer visible={visible} onClose={onClose} title={getTitle()}>
      {/* 1. SELETOR DE AVISOS NA BARRA INFERIOR */}
      {activeType === 'badge' && (
        <View style={styles.container}>
          <Text style={[styles.descHint, { color: theme.textMuted }]}>
            Escolha como deseja visualizar os alertas no menu inferior:
          </Text>

          {/* Contador Numérico */}
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={async () => {
              await setBadgeStyle('number');
              onClose();
            }}
            style={[
              styles.prefOptionCard,
              {
                backgroundColor: badgeStyle === 'number' ? `${theme.primary}12` : theme.surfaceVariant,
                borderColor: badgeStyle === 'number' ? theme.primary : theme.border,
              },
            ]}
          >
            <View style={[styles.prefOptionIconWrap, { backgroundColor: '#EF444418' }]}>
              <View style={styles.badgeNumPreview}>
                <Text style={styles.badgeNumText}>3</Text>
              </View>
            </View>
            <View style={styles.textWrap}>
              <Text style={[styles.prefOptionTitle, { color: theme.text }]}>Contador Numérico</Text>
              <Text style={[styles.prefOptionDesc, { color: theme.textMuted }]}>
                Exibe a quantidade exata de pendências com um badge vermelho.
              </Text>
            </View>
            {badgeStyle === 'number' && <Ionicons name="checkmark-circle" size={22} color={theme.primary} />}
          </TouchableOpacity>

          {/* Bolinha Discreta */}
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={async () => {
              await setBadgeStyle('dot');
              onClose();
            }}
            style={[
              styles.prefOptionCard,
              {
                backgroundColor: badgeStyle === 'dot' ? `${theme.primary}12` : theme.surfaceVariant,
                borderColor: badgeStyle === 'dot' ? theme.primary : theme.border,
              },
            ]}
          >
            <View style={[styles.prefOptionIconWrap, { backgroundColor: '#EF444418' }]}>
              <View style={styles.badgeDotPreview} />
            </View>
            <View style={styles.textWrap}>
              <Text style={[styles.prefOptionTitle, { color: theme.text }]}>Indicador Discreto (Bolinha)</Text>
              <Text style={[styles.prefOptionDesc, { color: theme.textMuted }]}>
                Mostra um ponto vermelho sutil para avisar pendências.
              </Text>
            </View>
            {badgeStyle === 'dot' && <Ionicons name="checkmark-circle" size={22} color={theme.primary} />}
          </TouchableOpacity>

          {/* Ocultar */}
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={async () => {
              await setBadgeStyle('none');
              onClose();
            }}
            style={[
              styles.prefOptionCard,
              {
                backgroundColor: badgeStyle === 'none' ? `${theme.primary}12` : theme.surfaceVariant,
                borderColor: badgeStyle === 'none' ? theme.primary : theme.border,
              },
            ]}
          >
            <View style={[styles.prefOptionIconWrap, { backgroundColor: `${theme.textMuted}18` }]}>
              <Ionicons name="eye-off-outline" size={20} color={theme.textMuted} />
            </View>
            <View style={styles.textWrap}>
              <Text style={[styles.prefOptionTitle, { color: theme.text }]}>Ocultar Avisos</Text>
              <Text style={[styles.prefOptionDesc, { color: theme.textMuted }]}>
                Mantém a barra inferior completamente limpa, sem avisos.
              </Text>
            </View>
            {badgeStyle === 'none' && <Ionicons name="checkmark-circle" size={22} color={theme.primary} />}
          </TouchableOpacity>
        </View>
      )}

      {/* 2. SELETOR DE CÁLCULO DE SALDO */}
      {activeType === 'balance' && (
        <View style={styles.container}>
          <Text style={[styles.descHint, { color: theme.textMuted }]}>
            Defina como o card principal de saldo deve operar por padrão:
          </Text>

          {/* Previsto Total */}
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={async () => {
              await setBalanceMode('projected');
              onClose();
            }}
            style={[
              styles.prefOptionCard,
              {
                backgroundColor: balanceMode === 'projected' ? `${theme.primary}12` : theme.surfaceVariant,
                borderColor: balanceMode === 'projected' ? theme.primary : theme.border,
              },
            ]}
          >
            <View style={[styles.prefOptionIconWrap, { backgroundColor: `${theme.primary}20` }]}>
              <Ionicons name="calculator-outline" size={22} color={theme.primary} />
            </View>
            <View style={styles.textWrap}>
              <View style={styles.badgeLabelRow}>
                <Text style={[styles.prefOptionTitle, { color: theme.text, marginBottom: 0 }]}>Previsto Total</Text>
                <Badge label="Recomendado" variant="primary" size="sm" />
              </View>
              <Text style={[styles.prefOptionDesc, { color: theme.textMuted }]}>
                Já contempla todas as receitas e despesas fixas previstas do mês.
              </Text>
            </View>
            {balanceMode === 'projected' && <Ionicons name="checkmark-circle" size={22} color={theme.primary} />}
          </TouchableOpacity>

          {/* Real de Caixa */}
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={async () => {
              await setBalanceMode('realized');
              onClose();
            }}
            style={[
              styles.prefOptionCard,
              {
                backgroundColor: balanceMode === 'realized' ? `${theme.primary}12` : theme.surfaceVariant,
                borderColor: balanceMode === 'realized' ? theme.primary : theme.border,
              },
            ]}
          >
            <View style={[styles.prefOptionIconWrap, { backgroundColor: '#10B98120' }]}>
              <Ionicons name="cash-outline" size={22} color="#10B981" />
            </View>
            <View style={styles.textWrap}>
              <Text style={[styles.prefOptionTitle, { color: theme.text }]}>Real de Caixa</Text>
              <Text style={[styles.prefOptionDesc, { color: theme.textMuted }]}>
                Altera somente quando transações são registradas ou contas são quitadas.
              </Text>
            </View>
            {balanceMode === 'realized' && <Ionicons name="checkmark-circle" size={22} color={theme.primary} />}
          </TouchableOpacity>
        </View>
      )}

      {/* 3. SELETOR DE GESTO AO DESLIZAR (SWIPE) */}
      {activeType === 'swipe' && (
        <View style={styles.container}>
          <Text style={[styles.descHint, { color: theme.textMuted }]}>
            Escolha a direção do gesto ao deslizar os cards de contas:
          </Text>

          {/* Padrão */}
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={async () => {
              await setSwipePayDirection('right');
              onClose();
            }}
            style={[
              styles.prefOptionCard,
              {
                backgroundColor: swipePayDirection === 'right' ? `${theme.primary}12` : theme.surfaceVariant,
                borderColor: swipePayDirection === 'right' ? theme.primary : theme.border,
              },
            ]}
          >
            <View style={[styles.prefOptionIconWrap, { backgroundColor: '#10B98120' }]}>
              <Ionicons name="arrow-forward" size={20} color="#10B981" />
            </View>
            <View style={styles.textWrap}>
              <Text style={[styles.prefOptionTitle, { color: theme.text }]}>Padrão</Text>
              <Text style={[styles.prefOptionDesc, { color: theme.textMuted }]}>
                👉 Deslizar para Direita: Marcar Pago / Recebido{'\n'}
                👈 Deslizar para Esquerda: Excluir Conta
              </Text>
            </View>
            {swipePayDirection === 'right' && <Ionicons name="checkmark-circle" size={22} color={theme.primary} />}
          </TouchableOpacity>

          {/* Invertido */}
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={async () => {
              await setSwipePayDirection('left');
              onClose();
            }}
            style={[
              styles.prefOptionCard,
              {
                backgroundColor: swipePayDirection === 'left' ? `${theme.primary}12` : theme.surfaceVariant,
                borderColor: swipePayDirection === 'left' ? theme.primary : theme.border,
              },
            ]}
          >
            <View style={[styles.prefOptionIconWrap, { backgroundColor: '#3B82F620' }]}>
              <Ionicons name="arrow-back" size={20} color="#3B82F6" />
            </View>
            <View style={styles.textWrap}>
              <Text style={[styles.prefOptionTitle, { color: theme.text }]}>Invertido</Text>
              <Text style={[styles.prefOptionDesc, { color: theme.textMuted }]}>
                👈 Deslizar para Esquerda: Marcar Pago / Recebido{'\n'}
                👉 Deslizar para Direita: Excluir Conta
              </Text>
            </View>
            {swipePayDirection === 'left' && <Ionicons name="checkmark-circle" size={22} color={theme.primary} />}
          </TouchableOpacity>
        </View>
      )}
    </ModalContainer>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: 12,
  },
  descHint: {
    fontSize: 13,
    marginBottom: 4,
  },
  prefOptionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    gap: 12,
  },
  prefOptionIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textWrap: {
    flex: 1,
  },
  badgeLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  prefOptionTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 2,
  },
  prefOptionDesc: {
    fontSize: 12,
    lineHeight: 16,
  },
  badgeNumPreview: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeNumText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '800',
  },
  badgeDotPreview: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#EF4444',
  },
});
