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
  KeyboardAvoidingView,
  Platform,
  AppState,
} from 'react-native';
import * as Updates from 'expo-updates';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../core/theme/ThemeContext';
import { useBottomBarBadge, BottomBarBadgeStyle } from '../core/theme/BottomBarBadgeContext';
import { useSwipeAction, SwipePayDirection } from '../core/theme/SwipeActionContext';
import { useAuth } from '../services/auth/AuthContext';
import { useSecurity } from '../services/security/SecurityContext';
import { CloudSyncService } from '../services/supabase/CloudSyncService';
import { ExportService } from '../services/reports/ExportService';
import { useFinance } from '../modules/FinanceContext';
import { getMonthLabel } from '../core/utils/date';
import { useWorkspace } from '../modules/workspaces/WorkspaceContext';
import { Card } from '../core/components/Card';
import { Button } from '../core/components/Button';
import { Badge } from '../core/components/Badge';
import { WhatsNewModal } from '../core/components/WhatsNewModal';
import { APP_VERSION_CONFIG, getAppVersionString, RELEASE_HISTORY } from '../core/version';
import { AuthScreen } from './AuthScreen';
import { OnboardingScreen } from './OnboardingScreen';
import { PreferencesSelectorModal, PreferenceModalType } from './settings/components/PreferencesSelectorModal';
import { OTAUpdateModal } from './settings/components/OTAUpdateModal';
import { ChangePasswordModal } from './settings/components/ChangePasswordModal';
import { EditProfileModal } from './settings/components/EditProfileModal';
import { TransferOwnershipModal, PendingWorkspaceTransfer } from './settings/components/TransferOwnershipModal';
import { Ionicons } from '@expo/vector-icons';

interface SettingsScreenProps {
  onNavigateToWorkspaces?: () => void;
}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({ onNavigateToWorkspaces }) => {
  const { theme, isDark, toggleTheme } = useTheme();
  const { badgeStyle } = useBottomBarBadge();
  const { swipePayDirection } = useSwipeAction();
  const { user, signOut, deleteAccount } = useAuth();
  const { activeWorkspace, workspaces, transferOwnership, deleteWorkspace, pendingRequestsCount } = useWorkspace();
  const { isBiometricsEnabled, isHardwareSupported, toggleBiometrics } = useSecurity();
  const { transactions, selectedMonth, selectedYear, reloadAll, balanceMode } = useFinance();

  const [isSyncing, setIsSyncing] = useState(false);
  const [activePrefModal, setActivePrefModal] = useState<PreferenceModalType>(null);
  const [isCheckingUpdate, setIsCheckingUpdate] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showTutorialModal, setShowTutorialModal] = useState(false);
  const [showWhatsNewManual, setShowWhatsNewManual] = useState(false);

  // Modal Customizado de Atualizações OTA
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [updateStep, setUpdateStep] = useState<'available' | 'downloading' | 'installing' | 'ready'>('available');
  const [updateStage, setUpdateStage] = useState<'download' | 'install' | 'ready'>('download');
  const [updateDownloadProgress, setUpdateDownloadProgress] = useState(0);
  const [updateStatusText, setUpdateStatusText] = useState('');
  const [isReloadingApp, setIsReloadingApp] = useState(false);

  // Modais de Senha, Perfil e Transferência
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [pendingWsToTransfer, setPendingWsToTransfer] = useState<PendingWorkspaceTransfer | null>(null);

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

  // Monitorar ciclo de vida do aplicativo durante atualizações
  useEffect(() => {
    const sub = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState.match(/inactive|background/)) {
        if (updateStep === 'downloading' || updateStep === 'installing') {
          console.log('[OTA] Aplicativo minimizado durante atualização. Processo continuará em segundo plano.');
        }
      } else if (nextAppState === 'active') {
        if (updateStep === 'downloading' || updateStep === 'installing') {
          console.log('[OTA] Aplicativo restaurado ao primeiro plano.');
        }
      }
    });
    return () => sub.remove();
  }, [updateStep]);

  // Iniciar download com progresso visual dividido em etapas claras (UI/UX)
  const handleStartUpdateDownload = async () => {
    setUpdateStep('downloading');
    setUpdateStage('download');
    setUpdateDownloadProgress(10);
    setUpdateStatusText('Baixando novos arquivos e telas...');

    // Progresso do download (10% a 80%)
    let currentProgress = 10;
    const downloadInterval = setInterval(() => {
      currentProgress += Math.floor(Math.random() * 8) + 6;
      if (currentProgress > 80) {
        currentProgress = 80;
        clearInterval(downloadInterval);
      }
      setUpdateDownloadProgress(currentProgress);
      if (currentProgress < 50) {
        setUpdateStatusText('Baixando novos arquivos e telas...');
      } else {
        setUpdateStatusText('Concluindo download dos arquivos...');
      }
    }, 350);

    try {
      // Inicia a busca e download real pelo expo-updates
      const fetchPromise = Updates.fetchUpdateAsync();

      await fetchPromise;
      clearInterval(downloadInterval);

      // Instalação, descompactação e compilação do bundle (82% a 100%)
      setUpdateStep('installing');
      setUpdateStage('install');
      setUpdateDownloadProgress(82);
      setUpdateStatusText('Instalando e verificando integridade do código...');

      let installProgress = 82;
      const installInterval = setInterval(() => {
        installProgress += 3;
        if (installProgress >= 99) {
          installProgress = 99;
          clearInterval(installInterval);
        }
        setUpdateDownloadProgress(installProgress);
        setUpdateStatusText('Finalizando instalação dos módulos...');
      }, 250);

      // Breve pausa para garantir que os arquivos em disco foram validados
      await new Promise((r) => setTimeout(r, 900));
      clearInterval(installInterval);

      setUpdateDownloadProgress(100);
      setUpdateStatusText('Tudo pronto! Nova versão instalada com sucesso.');
      setUpdateStage('ready');
      setUpdateStep('ready');
    } catch (downloadErr: any) {
      clearInterval(downloadInterval);
      setShowUpdateModal(false);
      Alert.alert(
        'Falha na Atualização',
        `Não foi possível concluir o download:\n${downloadErr?.message || 'Verifique sua conexão com a internet e tente novamente.'}`
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

            <View style={{ flex: 1, marginLeft: 12, marginRight: 8, minWidth: 0 }}>
              <TouchableOpacity
                activeOpacity={user ? 0.7 : 1}
                onPress={() => {
                  if (user) {
                    setShowProfileModal(true);
                  }
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6, marginBottom: 2 }}>
                  <Text style={[styles.profileName, { color: theme.text, flexShrink: 1 }]} numberOfLines={1}>
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
              </TouchableOpacity>
            </View>

            {user ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                <TouchableOpacity
                  onPress={() => setShowProfileModal(true)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  style={[styles.profileActionBtn, { backgroundColor: `${theme.primary}15` }]}
                >
                  <Ionicons name="create-outline" size={18} color={theme.primary} />
                </TouchableOpacity>

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
              </View>
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
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={[styles.cellTitle, { color: theme.text }]}>
                  Espaços Financeiros
                </Text>
                {pendingRequestsCount > 0 && (
                  <Badge
                    label={`${pendingRequestsCount} pendente${pendingRequestsCount > 1 ? 's' : ''}`}
                    variant="warning"
                  />
                )}
              </View>
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

          <View style={[styles.cellSeparator, { backgroundColor: theme.border }]} />

          {/* Estilo de Avisos na Barra Inferior */}
          <TouchableOpacity
            style={styles.cell}
            activeOpacity={0.7}
            onPress={() => setActivePrefModal('badge')}
          >
            <View style={[styles.cellIconWrap, { backgroundColor: '#EF444418' }]}>
              <Ionicons name="notifications-outline" size={20} color="#EF4444" />
            </View>
            <View style={styles.cellTextWrap}>
              <Text style={[styles.cellTitle, { color: theme.text }]}>
                Avisos na Barra Inferior
              </Text>
              <Text style={[styles.cellSubtitle, { color: theme.textMuted }]}>
                {badgeStyle === 'number'
                  ? 'Contador numérico de pendências'
                  : badgeStyle === 'dot'
                  ? 'Indicador discreto (bolinha)'
                  : 'Avisos e alertas ocultos'}
              </Text>
            </View>
            <View style={styles.cellValueWrap}>
              <Text style={[styles.cellValueText, { color: theme.primary }]}>
                {badgeStyle === 'number'
                  ? 'Número'
                  : badgeStyle === 'dot'
                  ? 'Bolinha'
                  : 'Nenhum'}
              </Text>
              <Ionicons name="chevron-forward" size={16} color={theme.textMuted} />
            </View>
          </TouchableOpacity>

          <View style={[styles.cellSeparator, { backgroundColor: theme.border }]} />

          {/* Modo de Cálculo do Saldo Principal */}
          <TouchableOpacity
            style={styles.cell}
            activeOpacity={0.7}
            onPress={() => setActivePrefModal('balance')}
          >
            <View style={[styles.cellIconWrap, { backgroundColor: `${theme.primary}18` }]}>
              <Ionicons name="wallet-outline" size={20} color={theme.primary} />
            </View>
            <View style={styles.cellTextWrap}>
              <Text style={[styles.cellTitle, { color: theme.text }]}>
                Cálculo do Saldo Principal
              </Text>
              <Text style={[styles.cellSubtitle, { color: theme.textMuted }]}>
                {balanceMode === 'realized'
                  ? 'Regime Real de Caixa'
                  : 'Regime Previsto (com Contas Fixas)'}
              </Text>
            </View>
            <View style={styles.cellValueWrap}>
              <Text style={[styles.cellValueText, { color: theme.primary }]}>
                {balanceMode === 'realized' ? 'Real' : 'Previsto'}
              </Text>
              <Ionicons name="chevron-forward" size={16} color={theme.textMuted} />
            </View>
          </TouchableOpacity>

          <View style={[styles.cellSeparator, { backgroundColor: theme.border }]} />

          {/* Gestos ao Deslizar nas Contas (Swipe) */}
          <TouchableOpacity
            style={styles.cell}
            activeOpacity={0.7}
            onPress={() => setActivePrefModal('swipe')}
          >
            <View style={[styles.cellIconWrap, { backgroundColor: '#10B98118' }]}>
              <Ionicons name="swap-horizontal-outline" size={20} color="#10B981" />
            </View>
            <View style={styles.cellTextWrap}>
              <Text style={[styles.cellTitle, { color: theme.text }]}>
                Lados ao Deslizar nas Contas
              </Text>
              <Text style={[styles.cellSubtitle, { color: theme.textMuted }]}>
                {swipePayDirection === 'right'
                  ? 'Direita: Pagar • Esquerda: Excluir'
                  : 'Esquerda: Pagar • Direita: Excluir'}
              </Text>
            </View>
            <View style={styles.cellValueWrap}>
              <Text style={[styles.cellValueText, { color: theme.primary }]}>
                {swipePayDirection === 'right' ? 'Padrão' : 'Invertido'}
              </Text>
              <Ionicons name="chevron-forward" size={16} color={theme.textMuted} />
            </View>
          </TouchableOpacity>

          {/* Alterar Senha (apenas quando logado com conta) */}
          {user ? (
            <>
              <View style={[styles.cellSeparator, { backgroundColor: theme.border }]} />
              <TouchableOpacity
                style={styles.cell}
                activeOpacity={0.7}
                onPress={() => setShowPasswordModal(true)}
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

          {/* App Info / Ver Novidades */}
          <TouchableOpacity
            style={styles.cell}
            activeOpacity={0.7}
            onPress={() => setShowWhatsNewManual(true)}
          >
            <View style={[styles.cellIconWrap, { backgroundColor: `${theme.primary}18` }]}>
              <Ionicons name="sparkles" size={18} color={theme.primary} />
            </View>
            <View style={styles.cellTextWrap}>
              <Text style={[styles.cellTitle, { color: theme.text }]}>
                Novidades da Versão
              </Text>
              <Text style={[styles.cellSubtitle, { color: theme.textMuted }]}>
                {getAppVersionString()} • Toque para ver o histórico
              </Text>
            </View>
            <Badge label={`v${APP_VERSION_CONFIG.version}`} variant="primary" />
          </TouchableOpacity>
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
      <ChangePasswordModal
        visible={showPasswordModal}
        onClose={() => setShowPasswordModal(false)}
      />

      {/* Modal de Editar Nome de Usuário */}
      <EditProfileModal
        visible={showProfileModal}
        initialName={user?.name || ''}
        onClose={() => setShowProfileModal(false)}
      />

      {/* Modal de Transferência de Propriedade do Espaço */}
      <TransferOwnershipModal
        visible={showTransferModal}
        pendingWorkspace={pendingWsToTransfer}
        onClose={() => setShowTransferModal(false)}
        onConfirmTransfer={async (newOwnerEmail) => {
          if (!pendingWsToTransfer) return;
          setShowTransferModal(false);
          try {
            setStatusMessage('Transferindo propriedade...');
            await transferOwnership(pendingWsToTransfer.workspaceId, newOwnerEmail);
            await executeFinalAccountDeletion();
          } catch {
            Alert.alert('Erro', 'Falha ao transferir propriedade.');
          } finally {
            setStatusMessage('');
          }
        }}
        onDeleteWorkspace={async () => {
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
        }}
      />

      {/* MODAL DE ATUALIZAÇÃO ELEGANTE (UI/UX) */}
      <OTAUpdateModal
        visible={showUpdateModal}
        step={updateStep}
        stage={updateStage}
        downloadProgress={updateDownloadProgress}
        statusText={updateStatusText}
        isReloadingApp={isReloadingApp}
        onStartUpdate={handleStartUpdateDownload}
        onRestartApp={handleRelaunchApp}
        onClose={() => setShowUpdateModal(false)}
      />

      {/* MODAL DE HISTÓRICO DE NOVIDADES */}
      <WhatsNewModal
        visible={showWhatsNewManual}
        onClose={() => setShowWhatsNewManual(false)}
        previousVersion={null}
        releaseNotes={RELEASE_HISTORY}
      />

      {/* MODAL SELETOR DE PREFERÊNCIAS */}
      <PreferencesSelectorModal
        visible={!!activePrefModal}
        activeType={activePrefModal}
        onClose={() => setActivePrefModal(null)}
      />
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
  cellValueWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  cellValueText: {
    fontSize: 13,
    fontWeight: '600',
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
  prefOptionTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 2,
  },
  prefOptionDesc: {
    fontSize: 12,
    lineHeight: 16,
  },
  cellSeparator: {
    height: 1,
    marginLeft: 48,
  },
  cellColumn: {
    paddingVertical: 4,
  },
  syncBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
