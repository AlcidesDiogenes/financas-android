import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  ScrollView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../core/theme/ThemeContext';
import { Button } from '../../../core/components/Button';
import { AppSplashScreen } from '../../../core/components/AppSplashScreen';

export type OTAUpdateStep =
  | 'checking'
  | 'up_to_date'
  | 'available'
  | 'downloading'
  | 'installing'
  | 'ready'
  | 'error';

interface OTAUpdateModalProps {
  visible: boolean;
  step: OTAUpdateStep;
  stage?: 'download' | 'install' | 'ready';
  downloadProgress: number;
  statusText?: string;
  errorMessage?: string;
  errorDetails?: string;
  currentVersion?: string;
  isReloadingApp: boolean;
  onStartUpdate: () => void;
  onRestartApp: () => void;
  onRetryCheck?: () => void;
  onClose: () => void;
}

export const OTAUpdateModal: React.FC<OTAUpdateModalProps> = ({
  visible,
  step,
  stage,
  downloadProgress,
  statusText,
  errorMessage,
  errorDetails,
  currentVersion,
  isReloadingApp,
  onStartUpdate,
  onRestartApp,
  onRetryCheck,
  onClose,
}) => {
  const { theme, isDark } = useTheme();
  const [showTechnicalDetails, setShowTechnicalDetails] = useState(false);

  useEffect(() => {
    if (!visible || step !== 'error') {
      setShowTechnicalDetails(false);
    }
  }, [visible, step]);

  // Separa mensagem amigável para o usuário dos detalhes técnicos brutos
  let friendlyErrorMessage = errorMessage;
  let technicalDetails = errorDetails;

  if (errorMessage && errorMessage.includes('Detalhes:')) {
    const parts = errorMessage.split(/Detalhes:\s*/i);
    friendlyErrorMessage = parts[0]?.trim();
    if (!technicalDetails && parts[1]) {
      technicalDetails = parts[1].trim();
    }
  }

  if (step === 'error' && (!friendlyErrorMessage || friendlyErrorMessage.trim() === '')) {
    friendlyErrorMessage = 'Não foi possível checar atualizações no momento. Verifique sua conexão com a internet e tente novamente.';
  }

  return (
    <>
      <Modal
        visible={visible}
        transparent
        animationType="fade"
        onRequestClose={() => {
          if (step !== 'downloading' && step !== 'installing') {
            onClose();
          }
        }}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.updateModalCard,
              { backgroundColor: theme.card, borderColor: theme.border },
            ]}
          >
            {/* Ícone e Cabeçalho */}
            <View style={styles.updateIconWrapper}>
              <View
                style={[
                  styles.updateIconCircle,
                  {
                    backgroundColor:
                      step === 'checking'
                        ? (isDark ? '#1E293B' : '#E0F2FE')
                        : step === 'up_to_date' || step === 'ready'
                        ? (isDark ? '#064E3B' : '#E8F5E9')
                        : step === 'installing' || step === 'available'
                        ? (isDark ? '#2E1065' : '#EDE7F6')
                        : step === 'downloading'
                        ? (isDark ? '#1E3A8A' : '#E3F2FD')
                        : (isDark ? '#450A0A' : '#FEE2E2'), // error
                  },
                ]}
              >
                {step === 'checking' ? (
                  <ActivityIndicator size="large" color={theme.primary} />
                ) : (
                  <Ionicons
                    name={
                      step === 'up_to_date' || step === 'ready'
                        ? 'checkmark-circle'
                        : step === 'installing'
                        ? 'construct'
                        : step === 'downloading'
                        ? 'cloud-download'
                        : step === 'available'
                        ? 'rocket'
                        : 'alert-circle'
                    }
                    size={38}
                    color={
                      step === 'up_to_date' || step === 'ready'
                        ? '#10B981'
                        : step === 'installing'
                        ? '#8B5CF6'
                        : step === 'downloading'
                        ? theme.primary
                        : step === 'available'
                        ? '#8B5CF6'
                        : '#EF4444'
                    }
                  />
                )}
              </View>
            </View>

            {/* Título do Modal */}
            <Text style={[styles.updateModalTitle, { color: theme.text }]}>
              {step === 'checking'
                ? 'Buscando Atualizações...'
                : step === 'up_to_date'
                ? 'Aplicativo em Dia! ✨'
                : step === 'available'
                ? 'Nova Versão Disponível! 🎉'
                : step === 'downloading'
                ? 'Baixando Arquivos...'
                : step === 'installing'
                ? 'Instalando Atualização...'
                : step === 'ready'
                ? 'Atualização Pronta!'
                : 'Não Foi Possível Atualizar'}
            </Text>

            {/* Subtítulo / Descrição */}
            <Text style={[styles.updateModalSubtitle, { color: theme.textMuted }]}>
              {step === 'checking'
                ? 'Consultando os servidores para verificar se há novidades e melhorias para o seu aplicativo...'
                : step === 'up_to_date'
                ? (currentVersion
                    ? `Você já está utilizando a versão mais recente (${currentVersion}). Nenhuma atualização pendente.`
                    : 'Você já está utilizando a versão mais recente. Nenhuma atualização pendente.')
                : step === 'available'
                ? 'Uma nova versão do Finduo com melhorias de velocidade, correções e novidades já está pronta para você.'
                : step === 'downloading' || step === 'installing'
                ? (statusText || 'Processando atualização...')
                : step === 'ready'
                ? 'Os novos arquivos foram instalados. Reinicie o aplicativo para ver as novidades imediatamente.'
                : friendlyErrorMessage}
            </Text>

            {/* BOTÃO E CONTAINER DE DETALHES TÉCNICOS ("VER MAIS") */}
            {step === 'error' && !!technicalDetails && (
              <View style={styles.technicalDetailsSection}>
                <TouchableOpacity
                  style={[
                    styles.detailsToggleBtn,
                    { backgroundColor: isDark ? '#1E293B' : '#F1F5F9' },
                  ]}
                  onPress={() => setShowTechnicalDetails((prev) => !prev)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.detailsToggleText, { color: theme.textMuted }]}>
                    {showTechnicalDetails ? 'Ocultar detalhes' : 'Ver mais'}
                  </Text>
                  <Ionicons
                    name={showTechnicalDetails ? 'chevron-up' : 'chevron-down'}
                    size={14}
                    color={theme.textMuted}
                    style={{ marginLeft: 5 }}
                  />
                </TouchableOpacity>

                {showTechnicalDetails && (
                  <View
                    style={[
                      styles.technicalDetailsBox,
                      {
                        backgroundColor: isDark ? '#0F172A' : '#F8FAFC',
                        borderColor: isDark ? '#334155' : '#E2E8F0',
                      },
                    ]}
                  >
                    <ScrollView
                      style={styles.technicalDetailsScroll}
                      nestedScrollEnabled
                      showsVerticalScrollIndicator={true}
                    >
                      <Text
                        style={[
                          styles.technicalDetailsContent,
                          { color: isDark ? '#94A3B8' : '#64748B' },
                        ]}
                        selectable
                      >
                        {technicalDetails}
                      </Text>
                    </ScrollView>
                  </View>
                )}
              </View>
            )}

            {/* AVISO DE MANTER TELA LIGADA (EM DISPONÍVEL, BAIXANDO E INSTALANDO) */}
            {(step === 'available' || step === 'downloading' || step === 'installing') && (
              <View
                style={[
                  styles.screenOnAlertBox,
                  {
                    backgroundColor: isDark ? '#422006' : '#FEF3C7',
                    borderColor: isDark ? '#78350F' : '#FDE68A',
                  },
                ]}
              >
                <Ionicons
                  name="sunny"
                  size={18}
                  color={isDark ? '#FBBF24' : '#D97706'}
                  style={{ marginRight: 8, marginTop: 1 }}
                />
                <Text
                  style={[
                    styles.screenOnAlertText,
                    { color: isDark ? '#FDE68A' : '#92400E' },
                  ]}
                >
                  {step === 'available'
                    ? 'Mantenha a tela ligada e o app aberto durante o processo para não interromper a atualização.'
                    : 'Deixe a tela ligada e não feche o app até concluir a instalação.'}
                </Text>
              </View>
            )}

            {/* BARRA DE PROGRESSO VISUAL */}
            {(step === 'downloading' || step === 'installing') && (
              <View style={styles.progressContainer}>
                <View
                  style={[
                    styles.progressBarBg,
                    { backgroundColor: isDark ? '#333' : '#E0E0E0' },
                  ]}
                >
                  <View
                    style={[
                      styles.progressBarFill,
                      {
                        width: `${downloadProgress}%`,
                        backgroundColor: step === 'installing' ? '#8B5CF6' : theme.primary,
                      },
                    ]}
                  />
                </View>

                <View style={styles.progressTextRow}>
                  <Text
                    style={[
                      styles.progressPercent,
                      { color: step === 'installing' ? '#8B5CF6' : theme.primary },
                    ]}
                  >
                    {downloadProgress}%
                  </Text>
                  <ActivityIndicator
                    size="small"
                    color={step === 'installing' ? '#8B5CF6' : theme.primary}
                  />
                </View>
              </View>
            )}

            {/* AÇÕES DE BOTÕES */}
            <View style={styles.updateModalActions}>
              {step === 'checking' && (
                <Button
                  title="Cancelar"
                  variant="outline"
                  onPress={onClose}
                  style={{ width: '100%' }}
                />
              )}

              {step === 'up_to_date' && (
                <Button
                  title="Entendido"
                  onPress={onClose}
                  style={{ width: '100%' }}
                />
              )}

              {step === 'available' && (
                <>
                  <Button
                    title="Atualizar Agora"
                    onPress={onStartUpdate}
                    style={{ flex: 1, marginRight: 8 }}
                  />
                  <Button
                    title="Mais Tarde"
                    variant="outline"
                    onPress={onClose}
                    style={{ flex: 1 }}
                  />
                </>
              )}

              {step === 'ready' && (
                <Button
                  title="Reiniciar Aplicativo Agora"
                  icon={<Ionicons name="rocket-outline" size={18} color="#FFF" />}
                  onPress={onRestartApp}
                  style={{ width: '100%' }}
                />
              )}

              {step === 'error' && (
                <>
                  {onRetryCheck && (
                    <Button
                      title="Tentar Novamente"
                      onPress={onRetryCheck}
                      style={{ flex: 1, marginRight: 8 }}
                    />
                  )}
                  <Button
                    title="Fechar"
                    variant="outline"
                    onPress={onClose}
                    style={{ flex: onRetryCheck ? 1 : undefined, width: onRetryCheck ? undefined : '100%' }}
                  />
                </>
              )}
            </View>
          </View>
        </View>
      </Modal>

      {/* OVERLAY DE TRANSIÇÃO SUAVE DE REINÍCIO (SPLASH OFICIAL FINDUO) */}
      {isReloadingApp && (
        <AppSplashScreen
          visible={true}
          statusText="Aplicando atualizações e reiniciando o Finduo..."
        />
      )}
    </>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  updateModalCard: {
    width: '100%',
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 8,
  },
  updateIconWrapper: {
    marginBottom: 16,
  },
  updateIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  updateModalTitle: {
    fontSize: 20,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 8,
  },
  updateModalSubtitle: {
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
    marginBottom: 16,
    paddingHorizontal: 8,
  },
  technicalDetailsSection: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 16,
  },
  detailsToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 16,
  },
  detailsToggleText: {
    fontSize: 12,
    fontWeight: '600',
  },
  technicalDetailsBox: {
    width: '100%',
    marginTop: 10,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    maxHeight: 130,
  },
  technicalDetailsScroll: {
    maxHeight: 106,
  },
  technicalDetailsContent: {
    fontSize: 11,
    lineHeight: 16,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  screenOnAlertBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
    width: '100%',
  },
  screenOnAlertText: {
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 17,
    flex: 1,
  },
  progressContainer: {
    width: '100%',
    marginBottom: 16,
  },
  progressBarBg: {
    height: 10,
    borderRadius: 5,
    overflow: 'hidden',
    width: '100%',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 5,
  },
  progressTextRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  progressPercent: {
    fontSize: 14,
    fontWeight: '700',
  },
  updateModalActions: {
    flexDirection: 'row',
    width: '100%',
    marginTop: 4,
  },
  relaunchSplashOverlay: {
    ...StyleSheet.absoluteFill,
    zIndex: 9999,
    justifyContent: 'center',
    alignItems: 'center',
  },
  relaunchLogoCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 6,
  },
  relaunchTitle: {
    fontSize: 28,
    fontWeight: '800',
    marginBottom: 6,
  },
  relaunchSubtitle: {
    fontSize: 14,
  },
});
