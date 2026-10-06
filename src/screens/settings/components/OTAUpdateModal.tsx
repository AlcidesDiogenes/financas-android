import React from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../core/theme/ThemeContext';
import { Button } from '../../../core/components/Button';

interface OTAUpdateModalProps {
  visible: boolean;
  step: 'available' | 'downloading' | 'installing' | 'ready';
  stage: 'download' | 'install' | 'ready';
  downloadProgress: number;
  statusText: string;
  isReloadingApp: boolean;
  onStartUpdate: () => void;
  onRestartApp: () => void;
  onClose: () => void;
}

export const OTAUpdateModal: React.FC<OTAUpdateModalProps> = ({
  visible,
  step,
  stage,
  downloadProgress,
  statusText,
  isReloadingApp,
  onStartUpdate,
  onRestartApp,
  onClose,
}) => {
  const { theme, isDark } = useTheme();

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
                      step === 'ready'
                        ? '#E8F5E9'
                        : step === 'installing'
                        ? '#EDE7F6'
                        : step === 'downloading'
                        ? '#E3F2FD'
                        : '#EDE7F6',
                  },
                ]}
              >
                <Ionicons
                  name={
                    step === 'ready'
                      ? 'checkmark-circle'
                      : step === 'installing'
                      ? 'construct'
                      : step === 'downloading'
                      ? 'cloud-download'
                      : 'rocket'
                  }
                  size={36}
                  color={
                    step === 'ready'
                      ? '#2E7D32'
                      : step === 'installing'
                      ? '#673AB7'
                      : step === 'downloading'
                      ? theme.primary
                      : '#673AB7'
                  }
                />
              </View>
            </View>

            <Text style={[styles.updateModalTitle, { color: theme.text }]}>
              {step === 'ready'
                ? 'Atualização Pronta!'
                : step === 'installing'
                ? 'Instalando Atualização...'
                : step === 'downloading'
                ? 'Baixando Arquivos...'
                : 'Nova Versão Disponível! 🎉'}
            </Text>

            <Text style={[styles.updateModalSubtitle, { color: theme.textMuted }]}>
              {step === 'ready'
                ? 'Os novos arquivos foram instalados. Reinicie o aplicativo para ver as novidades imediatamente.'
                : step === 'installing' || step === 'downloading'
                ? statusText
                : 'Uma nova versão do Finanças com melhorias de velocidade, correções e novidades já está pronta para você.'}
            </Text>

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
                        backgroundColor: step === 'installing' ? '#673AB7' : theme.primary,
                      },
                    ]}
                  />
                </View>

                <View style={styles.progressTextRow}>
                  <Text
                    style={[
                      styles.progressPercent,
                      { color: step === 'installing' ? '#673AB7' : theme.primary },
                    ]}
                  >
                    {downloadProgress}%
                  </Text>
                  <ActivityIndicator
                    size="small"
                    color={step === 'installing' ? '#673AB7' : theme.primary}
                  />
                </View>

                {/* Dica amigável */}
                <View
                  style={[
                    styles.hintBox,
                    { backgroundColor: isDark ? '#262626' : '#F3F4F6' },
                  ]}
                >
                  <Ionicons
                    name="information-circle-outline"
                    size={15}
                    color={theme.textMuted}
                    style={{ marginRight: 6 }}
                  />
                  <Text style={{ fontSize: 11, color: theme.textMuted, flex: 1 }}>
                    Mantenha o app em primeiro plano para concluir mais rápido.
                  </Text>
                </View>
              </View>
            )}

            {/* AÇÕES DE BOTÕES */}
            <View style={styles.updateModalActions}>
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
                  title="Reiniciar Aplicativo Agora 🚀"
                  onPress={onRestartApp}
                  style={{ width: '100%' }}
                />
              )}
            </View>
          </View>
        </View>
      </Modal>

      {/* OVERLAY DE TRANSIÇÃO SUAVE DE REINÍCIO (SPLASH) */}
      {isReloadingApp && (
        <View style={[styles.relaunchSplashOverlay, { backgroundColor: theme.background }]}>
          <View style={[styles.relaunchLogoCircle, { backgroundColor: theme.primary }]}>
            <Ionicons name="wallet" size={44} color="#FFF" />
          </View>
          <Text style={[styles.relaunchTitle, { color: theme.text }]}>Finanças</Text>
          <Text style={[styles.relaunchSubtitle, { color: theme.textMuted }]}>
            Aplicando atualizações e reiniciando...
          </Text>
          <ActivityIndicator size="large" color={theme.primary} style={{ marginTop: 24 }} />
        </View>
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
    marginBottom: 20,
    paddingHorizontal: 8,
  },
  progressContainer: {
    width: '100%',
    marginBottom: 20,
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
  hintBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderRadius: 8,
    marginTop: 10,
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
