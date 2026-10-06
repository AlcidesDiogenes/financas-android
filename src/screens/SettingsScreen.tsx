import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Switch,
  Alert,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
} from 'react-native';
import * as Updates from 'expo-updates';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../core/theme/ThemeContext';
import { useAuth } from '../services/auth/AuthContext';
import { useSecurity } from '../services/security/SecurityContext';
import { CloudSyncService } from '../services/supabase/CloudSyncService';
import { ExportService } from '../services/reports/ExportService';
import { useFinance } from '../modules/FinanceContext';
import { getMonthLabel } from '../core/utils/date';
import { useWorkspace } from '../modules/workspaces/WorkspaceContext';
import { APP_VERSION_CONFIG, getAppVersionString } from '../core/version';
import { Card } from '../core/components/Card';
import { Button } from '../core/components/Button';
import { Badge } from '../core/components/Badge';
import { Input } from '../core/components/Input';
import { AuthScreen } from './AuthScreen';
import { OnboardingScreen } from './OnboardingScreen';
import { Ionicons } from '@expo/vector-icons';

interface SettingsScreenProps {
  onNavigateToWorkspaces?: () => void;
}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({ onNavigateToWorkspaces }) => {
  const { theme, isDark, toggleTheme } = useTheme();
  const { user, signOut, deleteAccount, updatePassword } = useAuth();
  const { activeWorkspace, workspaces, transferOwnership, deleteWorkspace } = useWorkspace();
  const { isBiometricsEnabled, isHardwareSupported, toggleBiometrics } = useSecurity();
  const { transactions, selectedMonth, selectedYear, reloadAll } = useFinance();

  const [isSyncing, setIsSyncing] = useState(false);
  const [isCheckingUpdate, setIsCheckingUpdate] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showTutorialModal, setShowTutorialModal] = useState(false);

  // Modal Customizado de Atualizações OTA
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [updateStep, setUpdateStep] = useState<'available' | 'downloading' | 'ready'>('available');
  const [updateDownloadProgress, setUpdateDownloadProgress] = useState(0);
  const [updateStatusText, setUpdateStatusText] = useState('');
  const [isReloadingApp, setIsReloadingApp] = useState(false);

  // Modal para Alterar Senha
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordError, setPasswordError] = useState('');

  // Modal para Transferência de Propriedade de Espaço ao Excluir Conta
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [pendingWsToTransfer, setPendingWsToTransfer] = useState<{
    workspaceId: string;
    workspaceName: string;
    members: { name: string; email: string }[];
  } | null>(null);
  const [selectedNewOwnerEmail, setSelectedNewOwnerEmail] = useState('');

  const handleUpdatePassword = async () => {
    if (!newPassword || newPassword.length < 6) {
      setPasswordError('A nova senha deve ter no mínimo 6 caracteres.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('As senhas não coincidem.');
      return;
    }

    try {
      setPasswordLoading(true);
      setPasswordError('');
      const res = await updatePassword(newPassword);
      if (res.success) {
        setShowPasswordModal(false);
        setNewPassword('');
        setConfirmPassword('');
        Alert.alert('Sucesso', 'Sua senha foi alterada com sucesso!');
      } else {
        setPasswordError(res.error || 'Não foi possível alterar a senha.');
      }
    } catch {
      setPasswordError('Erro ao atualizar senha.');
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleManualSync = async () => {
    if (!user) {
      Alert.alert('Modo Offline', 'Faça login para sincronizar seus dados com a nuvem.');
      return;
    }
    try {
      setIsSyncing(true);
      setStatusMessage('Sincronizando com a nuvem...');
      await reloadAll();
      Alert.alert('Sincronização', 'Dados sincronizados com sucesso!');
    } catch {
      Alert.alert('Erro', 'Falha ao sincronizar dados.');
    } finally {
      setIsSyncing(false);
      setStatusMessage('');
    }
  };

  const handleExportCSV = async () => {
    try {
      setStatusMessage('Exportando arquivo CSV...');
      const monthLabel = getMonthLabel(selectedMonth, selectedYear);
      const success = await ExportService.exportTransactionsToCSV(transactions, monthLabel);
      if (success) {
        Alert.alert('Sucesso', 'Relatório CSV exportado e compartilhado com sucesso!');
      } else {
        Alert.alert('Aviso', 'Não foi possível compartilhar o arquivo no momento.');
      }
    } catch {
      Alert.alert('Erro', 'Não foi possível exportar os dados.');
    } finally {
      setStatusMessage('');
    }
  };

  // Verificação e Download de Atualizações Online (OTA Updates)
  const handleCheckForUpdates = async () => {
    try {
      setIsCheckingUpdate(true);
      setStatusMessage('Buscando atualizações...');

      // Verifica se o expo-updates está habilitado no ambiente (build nativo/APK)
      if (!Updates.isEnabled) {
        Alert.alert(
          'Modo de Desenvolvimento',
          'O serviço de atualizações online (OTA) só funciona no APK instalado no aparelho.'
        );
        return;
      }

      console.log('Updates info:', {
        channel: Updates.channel,
        runtimeVersion: Updates.runtimeVersion,
        updateId: Updates.updateId,
      });

      // Garante que o cabeçalho do canal seja enviado para o servidor EAS
      try {
        if (typeof Updates.setUpdateRequestHeadersOverride === 'function') {
          Updates.setUpdateRequestHeadersOverride({
            'expo-channel-name': 'production',
          });
        }
      } catch (headerErr) {
        console.warn('Erro ao definir cabeçalhos de atualização:', headerErr);
      }

      const update = await Updates.checkForUpdateAsync();

      if (update.isAvailable) {
        setUpdateStep('available');
        setUpdateDownloadProgress(0);
        setUpdateStatusText('Nova versão pronta para download');
        setShowUpdateModal(true);
      } else {
        Alert.alert(
          'Aplicativo em Dia! ✨',
          `Você já está utilizando a versão mais recente (${getAppVersionString()}). Nenhuma atualização pendente.`
        );
      }
    } catch (err: any) {
      const msg = err?.message || '';
      if (msg.includes('network') || msg.includes('Failed to fetch') || msg.includes('connection')) {
        Alert.alert(
          'Sem Conexão',
          'Não foi possível conectar ao servidor de atualizações. Verifique se o seu celular está conectado à internet (Wi-Fi ou 4G/5G).'
        );
      } else {
        Alert.alert(
          'Falha na Verificação',
          `Não foi possível checar atualizações no momento.\n\nDetalhes:\nCanal do App: "${Updates.channel || 'nenhum'}"\nRuntime: "${Updates.runtimeVersion || 'padrão'}"\nErro: ${msg}`
        );
      }
    } finally {
      setIsCheckingUpdate(false);
      setStatusMessage('');
    }
  };

  // Iniciar download com progresso visual animado
  const handleStartUpdateDownload = async () => {
    setUpdateStep('downloading');
    setUpdateDownloadProgress(15);
    setUpdateStatusText('Conectando ao servidor seguro da nuvem...');

    // Progresso simulado fluido enquanto o download real ocorre
    const interval = setInterval(() => {
      setUpdateDownloadProgress((prev) => {
        if (prev < 40) {
          setUpdateStatusText('Baixando novos arquivos e telas...');
          return prev + 12;
        }
        if (prev < 80) {
          setUpdateStatusText('Otimizando recursos e preparando código...');
          return prev + 10;
        }
        if (prev < 92) {
          setUpdateStatusText('Finalizando verificação de integridade...');
          return prev + 3;
        }
        return prev;
      });
    }, 400);

    try {
      await Updates.fetchUpdateAsync();
      clearInterval(interval);
      setUpdateDownloadProgress(100);
      setUpdateStatusText('Instalação concluída com sucesso!');
      setUpdateStep('ready');
    } catch (downloadErr: any) {
      clearInterval(interval);
      setShowUpdateModal(false);
      Alert.alert(
        'Falha no Download',
        `Não foi possível baixar os arquivos da nova versão:\n${downloadErr?.message || 'Verifique sua conexão com a internet.'}`
      );
    }
  };

  // Reinicialização com tela de transição suave
  const handleRelaunchApp = async () => {
    setShowUpdateModal(false);
    setIsReloadingApp(true);
    // Aguarda 1.2 segundos mostrando a splash de transição para o usuário perceber claramente o reinício
    setTimeout(async () => {
      try {
        await Updates.reloadAsync();
      } catch (e) {
        console.warn('Erro ao recarregar via Updates:', e);
        setIsReloadingApp(false);
      }
    }, 1200);
  };

  // Execução final da exclusão de conta
  const executeFinalAccountDeletion = async () => {
    try {
      setStatusMessage('Excluindo conta e dados...');
      const res = await deleteAccount();
      if (res.success) {
        Alert.alert('Conta Excluída', 'Sua conta e seus dados foram removidos com sucesso.');
      } else {
        Alert.alert('Aviso', res.error || 'Não foi possível excluir a conta.');
      }
    } catch {
      Alert.alert('Erro', 'Ocorreu um erro ao excluir a conta.');
    }
  };

  const handleDeleteAccount = () => {
    if (!user) return;

    // 1. Identifica espaços compartilhados onde o usuário atual é o PROPRIETÁRIO (owner)
    const userEmail = user.email?.toLowerCase().trim();
    const ownedSharedWorkspaces = workspaces.filter((ws) => {
      if (ws.id === 'ws-solo' || ws.type === 'solo') return false;
      const myMembership = ws.members.find(
        (m) => m.isCurrentUser || m.email?.toLowerCase().trim() === userEmail
      );
      return myMembership?.role === 'owner';
    });

    // 2. Verifica se algum desses espaços possui OUTROS membros além do usuário
    const wsWithOtherMembers = ownedSharedWorkspaces.find((ws) => {
      const otherMembers = ws.members.filter(
        (m) => !m.isCurrentUser && m.email?.toLowerCase().trim() !== userEmail
      );
      return otherMembers.length > 0;
    });

    // CENÁRIO A: É dono de um espaço compartilhado e TEM outros participantes
    if (wsWithOtherMembers) {
      const otherMembers = wsWithOtherMembers.members.filter(
        (m) => !m.isCurrentUser && m.email?.toLowerCase().trim() !== userEmail
      );

      setPendingWsToTransfer({
        workspaceId: wsWithOtherMembers.id,
        workspaceName: wsWithOtherMembers.name,
        members: otherMembers.map((m) => ({ name: m.name, email: m.email })),
      });
      setSelectedNewOwnerEmail(otherMembers[0].email);
      setShowTransferModal(true);
      return;
    }

    // CENÁRIO B: Não tem outros participantes em espaços compartilhados (está sozinho)
    // Nenhuma pergunta desnecessária sobre transferência: apaga direto!
    Alert.alert(
      'Excluir Minha Conta?',
      'ATENÇÃO: Ao excluir sua conta:\n\n• Todos os seus dados, lançamentos e espaços na nuvem serão apagados definitivamente.\n• O aplicativo será desconectado e limpo.\n\nEsta ação NÃO pode ser desfeita. Tem certeza que deseja excluir sua conta definitivamente?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir Definitivamente',
          style: 'destructive',
          onPress: executeFinalAccountDeletion,
        },
      ]
    );
  };

  const getUserInitials = (name?: string) => {
    if (!name) return 'OF';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return name.slice(0, 2).toUpperCase();
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.headerTitle, { color: theme.text }]}>
          Ajustes
        </Text>
        <Text style={[styles.headerSubtitle, { color: theme.textMuted }]}>
          Preferências, segurança e sincronização
        </Text>

        {/* Profile / Account Card */}
        <Card variant="elevated" style={styles.profileCard}>
          <View style={styles.profileRow}>
            <View
              style={[
                styles.avatarCircle,
                { backgroundColor: user ? theme.primary : theme.surfaceVariant },
              ]}
            >
              <Text
                style={[
                  styles.avatarText,
                  { color: user ? '#FFF' : theme.textMuted },
                ]}
              >
                {getUserInitials(user?.name)}
              </Text>
            </View>

            <View style={{ flex: 1, marginLeft: 14 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={[styles.profileName, { color: theme.text }]} numberOfLines={1}>
                  {user ? user.name : 'Modo Offline'}
                </Text>
                <Badge
                  label={user ? 'Nuvem Ativa' : 'Offline'}
                  variant={user ? 'success' : 'neutral'}
                />
              </View>
              <Text style={[styles.profileEmail, { color: theme.textMuted }]} numberOfLines={1}>
                {user ? user.email : 'Toque abaixo para conectar sua conta'}
              </Text>
            </View>

            {user ? (
              <TouchableOpacity
                onPress={() => {
                  Alert.alert(
                    'Sair da Conta',
                    'Seus lançamentos serão salvos na nuvem antes de desconectar para que você não perca nenhum dado.',
                    [
                      { text: 'Cancelar', style: 'cancel' },
                      {
                        text: 'Salvar e Sair',
                        style: 'destructive',
                        onPress: async () => {
                          setStatusMessage('Salvando alterações e desconectando...');
                          await signOut();
                        },
                      },
                    ]
                  );
                }}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                style={[styles.profileActionBtn, { backgroundColor: `${theme.danger}15` }]}
              >
                <Ionicons name="log-out-outline" size={20} color={theme.danger} />
              </TouchableOpacity>
            ) : null}
          </View>

          {!user && (
            <Button
              title="Fazer Login ou Criar Conta"
              variant="primary"
              size="sm"
              icon={<Ionicons name="log-in-outline" size={17} color="#FFF" />}
              onPress={() => setShowAuthModal(true)}
              style={{ marginTop: 12 }}
            />
          )}
        </Card>

        {/* SECTION 1: Espaços & Colaboração */}
        <Text style={[styles.sectionHeading, { color: theme.textMuted }]}>
          GESTÃO & ESPAÇOS
        </Text>
        <Card variant="elevated" style={styles.groupCard}>
          <TouchableOpacity
            style={styles.cell}
            activeOpacity={0.7}
            onPress={onNavigateToWorkspaces}
          >
            <View style={[styles.cellIconWrap, { backgroundColor: '#8B5CF620' }]}>
              <Ionicons name="people" size={20} color="#8B5CF6" />
            </View>
            <View style={styles.cellTextWrap}>
              <Text style={[styles.cellTitle, { color: theme.text }]}>
                Espaços Financeiros
              </Text>
              <Text style={[styles.cellSubtitle, { color: theme.textMuted }]}>
                Atual: {activeWorkspace.name} ({activeWorkspace.type === 'solo' ? 'Individual' : 'Compartilhado'})
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={theme.textMuted} />
          </TouchableOpacity>
        </Card>

        {/* SECTION 2: Sincronização & Exportação */}
        <Text style={[styles.sectionHeading, { color: theme.textMuted }]}>
          DADOS & NUVEM
        </Text>
        <Card variant="elevated" style={styles.groupCard}>
          {/* Sync Cell */}
          <View style={styles.cell}>
            <View style={[styles.cellIconWrap, { backgroundColor: `${theme.success}20` }]}>
              <Ionicons name="cloud-done-outline" size={20} color={theme.success} />
            </View>
            <View style={styles.cellTextWrap}>
              <Text style={[styles.cellTitle, { color: theme.text }]}>
                Sincronização em Tempo Real
              </Text>
              <Text style={[styles.cellSubtitle, { color: theme.textMuted }]}>
                {statusMessage || (user ? 'Conectado e atualizado' : 'Modo local (armazenado no aparelho)')}
              </Text>
            </View>
            <TouchableOpacity
              onPress={handleManualSync}
              disabled={isSyncing}
              style={[styles.syncBtn, { backgroundColor: theme.surfaceVariant }]}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons
                name="sync"
                size={18}
                color={isSyncing ? theme.primary : theme.text}
              />
            </TouchableOpacity>
          </View>

          <View style={[styles.cellSeparator, { backgroundColor: theme.border }]} />

          {/* Export Cell */}
          <TouchableOpacity
            style={styles.cell}
            activeOpacity={0.7}
            onPress={handleExportCSV}
          >
            <View style={[styles.cellIconWrap, { backgroundColor: `${theme.warning}20` }]}>
              <Ionicons name="document-text-outline" size={20} color={theme.warning} />
            </View>
            <View style={styles.cellTextWrap}>
              <Text style={[styles.cellTitle, { color: theme.text }]}>
                Exportar Extrato Mensal (CSV)
              </Text>
              <Text style={[styles.cellSubtitle, { color: theme.textMuted }]}>
                Planilha de {getMonthLabel(selectedMonth, selectedYear)} para Excel / WhatsApp
              </Text>
            </View>
            <Ionicons name="share-social-outline" size={18} color={theme.textMuted} />
          </TouchableOpacity>
        </Card>

        {/* SECTION 3: Preferências & Segurança */}
        <Text style={[styles.sectionHeading, { color: theme.textMuted }]}>
          PREFERÊNCIAS & SEGURANÇA
        </Text>
        <Card variant="elevated" style={styles.groupCard}>
          {/* Biometrics */}
          <View style={styles.cell}>
            <View style={[styles.cellIconWrap, { backgroundColor: `${theme.primary}20` }]}>
              <Ionicons name="finger-print-outline" size={20} color={theme.primary} />
            </View>
            <View style={styles.cellTextWrap}>
              <Text style={[styles.cellTitle, { color: theme.text }]}>
                Bloqueio por Biometria
              </Text>
              <Text style={[styles.cellSubtitle, { color: theme.textMuted }]}>
                {isHardwareSupported
                  ? 'Exigir digital ao abrir o app'
                  : 'Não compatível com este aparelho'}
              </Text>
            </View>
            <Switch
              disabled={!isHardwareSupported}
              value={isBiometricsEnabled}
              onValueChange={() => {
                toggleBiometrics();
              }}
              thumbColor={isBiometricsEnabled ? theme.primary : '#ccc'}
            />
          </View>

          <View style={[styles.cellSeparator, { backgroundColor: theme.border }]} />

          {/* Dark Mode */}
          <View style={styles.cell}>
            <View style={[styles.cellIconWrap, { backgroundColor: `${theme.info}20` }]}>
              <Ionicons name="moon-outline" size={20} color={theme.info} />
            </View>
            <View style={styles.cellTextWrap}>
              <Text style={[styles.cellTitle, { color: theme.text }]}>
                Tema Escuro (Dark Mode)
              </Text>
              <Text style={[styles.cellSubtitle, { color: theme.textMuted }]}>
                {isDark ? 'Ativado' : 'Desativado'}
              </Text>
            </View>
            <Switch
              value={isDark}
              onValueChange={toggleTheme}
              thumbColor={isDark ? theme.primary : '#ccc'}
            />
          </View>

          {/* Alterar Senha (apenas quando logado com conta) */}
          {user ? (
            <>
              <View style={[styles.cellSeparator, { backgroundColor: theme.border }]} />
              <TouchableOpacity
                style={styles.cell}
                activeOpacity={0.7}
                onPress={() => {
                  setNewPassword('');
                  setConfirmPassword('');
                  setPasswordError('');
                  setShowPasswordModal(true);
                }}
              >
                <View style={[styles.cellIconWrap, { backgroundColor: `${theme.primary}20` }]}>
                  <Ionicons name="key-outline" size={20} color={theme.primary} />
                </View>
                <View style={styles.cellTextWrap}>
                  <Text style={[styles.cellTitle, { color: theme.text }]}>
                    Alterar Senha
                  </Text>
                  <Text style={[styles.cellSubtitle, { color: theme.textMuted }]}>
                    Cadastrar uma nova senha de acesso
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={theme.textMuted} />
              </TouchableOpacity>
            </>
          ) : null}
        </Card>

        {/* SECTION 4: Ajuda & Sobre */}
        <Text style={[styles.sectionHeading, { color: theme.textMuted }]}>
          AJUDA & INFORMAÇÕES
        </Text>
        <Card variant="elevated" style={styles.groupCard}>
          {/* Tutorial */}
          <TouchableOpacity
            style={styles.cell}
            activeOpacity={0.7}
            onPress={() => setShowTutorialModal(true)}
          >
            <View style={[styles.cellIconWrap, { backgroundColor: '#3B82F620' }]}>
              <Ionicons name="bulb-outline" size={20} color="#3B82F6" />
            </View>
            <View style={styles.cellTextWrap}>
              <Text style={[styles.cellTitle, { color: theme.text }]}>
                Apresentação & Tutorial
              </Text>
              <Text style={[styles.cellSubtitle, { color: theme.textMuted }]}>
                Guia interativo das funcionalidades
              </Text>
            </View>
            <Ionicons name="play-circle-outline" size={20} color={theme.textMuted} />
          </TouchableOpacity>

          <View style={[styles.cellSeparator, { backgroundColor: theme.border }]} />

          {/* App Version & Atualizações */}
          <TouchableOpacity
            style={styles.cell}
            activeOpacity={0.7}
            onPress={handleCheckForUpdates}
            disabled={isCheckingUpdate}
          >
            <View style={[styles.cellIconWrap, { backgroundColor: `${theme.primary}20` }]}>
              {isCheckingUpdate ? (
                <ActivityIndicator size="small" color={theme.primary} />
              ) : (
                <Ionicons name="cloud-download-outline" size={20} color={theme.primary} />
              )}
            </View>
            <View style={styles.cellTextWrap}>
              <Text style={[styles.cellTitle, { color: theme.text }]}>
                Verificar Atualizações
              </Text>
              <Text style={[styles.cellSubtitle, { color: theme.textMuted }]}>
                {isCheckingUpdate ? 'Consultando versão online...' : 'Buscar novidades na nuvem'}
              </Text>
            </View>
            <Ionicons name="refresh" size={18} color={theme.textMuted} />
          </TouchableOpacity>

          <View style={[styles.cellSeparator, { backgroundColor: theme.border }]} />

          {/* App Info */}
          <View style={styles.cell}>
            <View style={[styles.cellIconWrap, { backgroundColor: theme.surfaceVariant }]}>
              <Ionicons name="phone-portrait-outline" size={20} color={theme.textMuted} />
            </View>
            <View style={styles.cellTextWrap}>
              <Text style={[styles.cellTitle, { color: theme.text }]}>
                Finanças Pessoais
              </Text>
              <Text style={[styles.cellSubtitle, { color: theme.textMuted }]}>
                {getAppVersionString()} • {APP_VERSION_CONFIG.platform}
              </Text>
            </View>
            <Badge label={`v${APP_VERSION_CONFIG.version}`} variant="primary" />
          </View>
        </Card>

        {/* SECTION 5: Zona de Perigo */}
        {user ? (
          <>
            <Text style={[styles.sectionHeading, { color: theme.danger, marginTop: 24 }]}>
              CONTA & SEGURANÇA
            </Text>
            <Card
              variant="flat"
              style={[
                styles.groupCard,
                { borderColor: `${theme.danger}40`, borderWidth: 1, backgroundColor: `${theme.danger}06` },
              ]}
            >
              <TouchableOpacity
                style={styles.cell}
                activeOpacity={0.7}
                onPress={handleDeleteAccount}
              >
                <View style={[styles.cellIconWrap, { backgroundColor: `${theme.danger}20` }]}>
                  <Ionicons name="trash-outline" size={20} color={theme.danger} />
                </View>
                <View style={styles.cellTextWrap}>
                  <Text style={[styles.cellTitle, { color: theme.danger, fontWeight: '700' }]}>
                    Excluir Minha Conta
                  </Text>
                  <Text style={[styles.cellSubtitle, { color: theme.textMuted }]}>
                    Apagar permanentemente seus dados e acessos
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={theme.danger} />
              </TouchableOpacity>
            </Card>
          </>
        ) : null}
      </ScrollView>

      {/* Modal de Login / Cadastro para usuário Offline */}
      <Modal
        visible={showAuthModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowAuthModal(false)}
      >
        <AuthScreen onClose={() => setShowAuthModal(false)} />
      </Modal>

      {/* Modal de Apresentação / Tutorial */}
      <Modal
        visible={showTutorialModal}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={() => setShowTutorialModal(false)}
      >
        <OnboardingScreen onFinish={() => setShowTutorialModal(false)} />
      </Modal>

      {/* Modal de Alterar Senha */}
      <Modal
        visible={showPasswordModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowPasswordModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowPasswordModal(false)}
        >
          <View
            style={[
              styles.passwordModalCard,
              { backgroundColor: theme.surface, borderColor: theme.border },
            ]}
          >
            <View style={styles.passwordModalHeader}>
              <View>
                <Text style={[styles.passwordModalTitle, { color: theme.text }]}>
                  Alterar Senha 🔒
                </Text>
                <Text style={[styles.passwordModalSubtitle, { color: theme.textMuted }]}>
                  Cadastre sua nova senha de acesso
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setShowPasswordModal(false)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="close" size={22} color={theme.textMuted} />
              </TouchableOpacity>
            </View>

            <Input
              label="Nova Senha"
              placeholder="Mínimo 6 caracteres"
              secureTextEntry
              value={newPassword}
              onChangeText={setNewPassword}
            />

            <Input
              label="Confirmar Nova Senha"
              placeholder="Repita a nova senha"
              secureTextEntry
              value={confirmPassword}
              onChangeText={setConfirmPassword}
            />

            {passwordError ? (
              <View style={[styles.errorBox, { backgroundColor: theme.dangerLight }]}>
                <Ionicons name="alert-circle" size={16} color={theme.danger} />
                <Text style={[styles.errorText, { color: theme.danger }]}>
                  {passwordError}
                </Text>
              </View>
            ) : null}

            <View style={styles.passwordModalActions}>
              <Button
                title="Cancelar"
                variant="outline"
                onPress={() => setShowPasswordModal(false)}
                style={{ flex: 1, marginRight: 8 }}
              />
              <Button
                title="Salvar Senha"
                loading={passwordLoading}
                onPress={handleUpdatePassword}
                style={{ flex: 1 }}
              />
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Modal de Transferência de Propriedade do Espaço */}
      <Modal
        visible={showTransferModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowTransferModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowTransferModal(false)}
        >
          <View
            style={[
              styles.passwordModalCard,
              { backgroundColor: theme.surface, borderColor: theme.border },
            ]}
          >
            <View style={styles.passwordModalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.passwordModalTitle, { color: theme.text }]}>
                  Transferir Espaço 👥
                </Text>
                <Text style={[styles.passwordModalSubtitle, { color: theme.textMuted }]}>
                  Você é proprietário de "{pendingWsToTransfer?.workspaceName}". Deseja transferir a posse para outro membro antes de sair?
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setShowTransferModal(false)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="close" size={22} color={theme.textMuted} />
              </TouchableOpacity>
            </View>

            <Text style={{ fontSize: 13, fontWeight: '700', color: theme.text, marginBottom: 8 }}>
              Escolha o novo proprietário:
            </Text>

            <ScrollView style={{ maxHeight: 180, marginBottom: 14 }}>
              {pendingWsToTransfer?.members.map((m) => {
                const isSelected = selectedNewOwnerEmail === m.email;
                return (
                  <TouchableOpacity
                    key={m.email}
                    onPress={() => setSelectedNewOwnerEmail(m.email)}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      padding: 12,
                      borderRadius: 10,
                      borderWidth: 1,
                      borderColor: isSelected ? theme.primary : theme.border,
                      backgroundColor: isSelected ? `${theme.primary}15` : theme.background,
                      marginBottom: 8,
                    }}
                  >
                    <Ionicons
                      name={isSelected ? 'radio-button-on' : 'radio-button-off'}
                      size={20}
                      color={isSelected ? theme.primary : theme.textMuted}
                      style={{ marginRight: 10 }}
                    />
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 14, fontWeight: '600', color: theme.text }}>
                        {m.name || m.email}
                      </Text>
                      <Text style={{ fontSize: 12, color: theme.textMuted }}>
                        {m.email}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <View style={{ gap: 8 }}>
              <Button
                title="Transferir e Excluir Minha Conta"
                variant="primary"
                onPress={async () => {
                  if (!pendingWsToTransfer || !selectedNewOwnerEmail) return;
                  setShowTransferModal(false);
                  try {
                    setStatusMessage('Transferindo propriedade...');
                    await transferOwnership(pendingWsToTransfer.workspaceId, selectedNewOwnerEmail);
                    await executeFinalAccountDeletion();
                  } catch {
                    Alert.alert('Erro', 'Falha ao transferir propriedade.');
                  } finally {
                    setStatusMessage('');
                  }
                }}
              />

              <Button
                title="Excluir Espaço Junto"
                variant="danger"
                onPress={() => {
                  Alert.alert(
                    'Excluir Espaço e Dados',
                    `Tem certeza que deseja apagar o espaço "${pendingWsToTransfer?.workspaceName}" e todos os seus lançamentos? Os outros membros perderão o acesso.`,
                    [
                      { text: 'Cancelar', style: 'cancel' },
                      {
                        text: 'Sim, Excluir Tudo',
                        style: 'destructive',
                        onPress: async () => {
                          if (!pendingWsToTransfer) return;
                          setShowTransferModal(false);
                          try {
                            setStatusMessage('Excluindo espaço...');
                            await deleteWorkspace(pendingWsToTransfer.workspaceId);
                            await executeFinalAccountDeletion();
                          } catch {
                            Alert.alert('Erro', 'Falha ao excluir espaço.');
                          } finally {
                            setStatusMessage('');
                          }
                        },
                      },
                    ]
                  );
                }}
              />

              <Button
                title="Cancelar"
                variant="outline"
                onPress={() => setShowTransferModal(false)}
              />
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* MODAL DE ATUALIZAÇÃO ELEGANTE (UI/UX) */}
      <Modal
        visible={showUpdateModal}
        transparent
        animationType="fade"
        onRequestClose={() => {
          if (updateStep !== 'downloading') {
            setShowUpdateModal(false);
          }
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.updateModalCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
            {/* Ícone e Cabeçalho */}
            <View style={styles.updateIconWrapper}>
              <View
                style={[
                  styles.updateIconCircle,
                  {
                    backgroundColor:
                      updateStep === 'ready'
                        ? '#E8F5E9'
                        : updateStep === 'downloading'
                        ? '#E3F2FD'
                        : '#EDE7F6',
                  },
                ]}
              >
                <Ionicons
                  name={
                    updateStep === 'ready'
                      ? 'checkmark-circle'
                      : updateStep === 'downloading'
                      ? 'cloud-download'
                      : 'rocket'
                  }
                  size={36}
                  color={
                    updateStep === 'ready'
                      ? '#2E7D32'
                      : updateStep === 'downloading'
                      ? theme.primary
                      : '#673AB7'
                  }
                />
              </View>
            </View>

            <Text style={[styles.updateModalTitle, { color: theme.text }]}>
              {updateStep === 'ready'
                ? 'Atualização Pronta!'
                : updateStep === 'downloading'
                ? 'Baixando Atualização...'
                : 'Nova Versão Disponível! 🎉'}
            </Text>

            <Text style={[styles.updateModalSubtitle, { color: theme.textMuted }]}>
              {updateStep === 'ready'
                ? 'Os novos arquivos foram instalados. Reinicie o aplicativo para ver as novidades imediatamente.'
                : updateStep === 'downloading'
                ? updateStatusText
                : 'Uma nova versão do Finanças com melhorias de velocidade, correções e novidades já está pronta para você.'}
            </Text>

            {/* BARRA DE PROGRESSO VISUAL */}
            {updateStep === 'downloading' && (
              <View style={styles.progressContainer}>
                <View style={[styles.progressBarBg, { backgroundColor: isDark ? '#333' : '#E0E0E0' }]}>
                  <View
                    style={[
                      styles.progressBarFill,
                      {
                        width: `${updateDownloadProgress}%`,
                        backgroundColor: theme.primary,
                      },
                    ]}
                  />
                </View>
                <View style={styles.progressTextRow}>
                  <Text style={[styles.progressPercent, { color: theme.primary }]}>
                    {updateDownloadProgress}%
                  </Text>
                  <ActivityIndicator size="small" color={theme.primary} />
                </View>
              </View>
            )}

            {/* AÇÕES DE BOTÕES */}
            <View style={styles.updateModalActions}>
              {updateStep === 'available' && (
                <>
                  <Button
                    title="Atualizar Agora"
                    onPress={handleStartUpdateDownload}
                    style={{ flex: 1, marginRight: 8 }}
                  />
                  <Button
                    title="Mais Tarde"
                    variant="outline"
                    onPress={() => setShowUpdateModal(false)}
                    style={{ flex: 1 }}
                  />
                </>
              )}

              {updateStep === 'ready' && (
                <Button
                  title="Reiniciar Aplicativo Agora 🚀"
                  onPress={handleRelaunchApp}
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
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 90,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '800',
    marginBottom: 2,
  },
  headerSubtitle: {
    fontSize: 13,
    marginBottom: 18,
  },
  profileCard: {
    padding: 16,
    marginBottom: 20,
    borderRadius: 16,
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '800',
  },
  profileName: {
    fontSize: 16,
    fontWeight: '700',
  },
  profileEmail: {
    fontSize: 12,
    marginTop: 2,
  },
  profileActionBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionHeading: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginBottom: 8,
    marginLeft: 4,
    textTransform: 'uppercase',
  },
  groupCard: {
    borderRadius: 16,
    paddingVertical: 4,
    paddingHorizontal: 14,
    marginBottom: 20,
  },
  cell: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  cellIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cellTextWrap: {
    flex: 1,
    marginLeft: 12,
    marginRight: 8,
  },
  cellTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  cellSubtitle: {
    fontSize: 11,
    marginTop: 2,
  },
  cellSeparator: {
    height: 1,
    marginLeft: 48,
  },
  syncBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  passwordModalCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 20,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
  },
  passwordModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  passwordModalTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  passwordModalSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  passwordModalActions: {
    flexDirection: 'row',
    marginTop: 18,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 8,
    marginTop: 8,
  },
  errorText: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 6,
    flex: 1,
  },
  // ESTILOS DO MODAL DE ATUALIZAÇÃO (UI/UX)
  updateModalCard: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 24,
    elevation: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    alignItems: 'center',
  },
  updateIconWrapper: {
    marginBottom: 14,
  },
  updateIconCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
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
    width: '100%',
    height: 10,
    borderRadius: 5,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 5,
  },
  progressTextRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 2,
  },
  progressPercent: {
    fontSize: 13,
    fontWeight: '700',
  },
  updateModalActions: {
    flexDirection: 'row',
    width: '100%',
    marginTop: 6,
  },
  // ESTILOS DA TRANSIÇÃO DE REINÍCIO (SPLASH OVERLAY)
  relaunchSplashOverlay: {
    ...StyleSheet.absoluteFill,
    zIndex: 9999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  relaunchLogoCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  relaunchTitle: {
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  relaunchSubtitle: {
    fontSize: 13,
    marginTop: 6,
  },
});
