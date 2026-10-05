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
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../core/theme/ThemeContext';
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
  const { activeWorkspace } = useWorkspace();
  const { isBiometricsEnabled, isHardwareSupported, toggleBiometrics } = useSecurity();
  const { transactions, selectedMonth, selectedYear, reloadAll } = useFinance();

  const [isSyncing, setIsSyncing] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showTutorialModal, setShowTutorialModal] = useState(false);

  // Alterar Senha Modal
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordError, setPasswordError] = useState('');

  const handleUpdatePassword = async () => {
    if (!newPassword.trim()) {
      setPasswordError('Digite sua nova senha.');
      return;
    }
    if (newPassword.length < 6) {
      setPasswordError('A senha deve ter pelo menos 6 caracteres.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('As senhas digitadas não coincidem.');
      return;
    }
    setPasswordError('');
    setPasswordLoading(true);
    const res = await updatePassword(newPassword);
    setPasswordLoading(false);
    if (!res.success) {
      setPasswordError(res.error || 'Erro ao atualizar senha.');
    } else {
      setShowPasswordModal(false);
      Alert.alert('Senha Atualizada! 🔒', 'Sua nova senha foi cadastrada com sucesso.');
    }
  };

  const handleManualSync = async () => {
    setIsSyncing(true);
    setStatusMessage('Sincronizando com a nuvem...');
    
    // First push local changes up, then pull latest changes down
    const pushRes = await CloudSyncService.syncLocalToCloud();
    const pullRes = await CloudSyncService.syncCloudToLocal();
    await reloadAll();

    setIsSyncing(false);
    if (pushRes.success && pullRes.success) {
      setStatusMessage('✅ Sincronização concluída com sucesso!');
    } else {
      setStatusMessage('⚠️ ' + (pushRes.message || pullRes.message));
    }
  };

  const handleExportCSV = async () => {
    const monthLabel = getMonthLabel(selectedMonth, selectedYear);
    const ok = await ExportService.exportTransactionsToCSV(transactions, monthLabel);
    if (!ok) {
      Alert.alert('Exportação', 'Não foi possível gerar ou compartilhar o arquivo.');
    }
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Excluir Minha Conta?',
      'ATENÇÃO: Ao excluir sua conta:\n\n• Todos os seus dados na nuvem serão apagados.\n• Seus acessos aos espaços compartilhados serão revogados.\n• O aplicativo será desconectado e limpo.\n\nEsta ação NÃO pode ser desfeita. Tem certeza que deseja excluir sua conta definitivamente?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir Definitivamente',
          style: 'destructive',
          onPress: async () => {
            const res = await deleteAccount();
            if (res.success) {
              Alert.alert('Conta Excluída', 'Sua conta e seus dados foram removidos com sucesso.');
            } else {
              Alert.alert('Aviso', res.error || 'Não foi possível excluir a conta.');
            }
          },
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

          {/* App Version */}
          <View style={styles.cell}>
            <View style={[styles.cellIconWrap, { backgroundColor: theme.surfaceVariant }]}>
              <Ionicons name="phone-portrait-outline" size={20} color={theme.textMuted} />
            </View>
            <View style={styles.cellTextWrap}>
              <Text style={[styles.cellTitle, { color: theme.text }]}>
                Finanças Pessoais
              </Text>
              <Text style={[styles.cellSubtitle, { color: theme.textMuted }]}>
                Versão 1.2.0 • Android
              </Text>
            </View>
            <Badge label="Atualizado" variant="neutral" />
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
});
