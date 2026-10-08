import React, { useState, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Share,
  Modal,
  RefreshControl,
} from 'react-native';
import { useTheme } from '../core/theme/ThemeContext';
import { useAuth } from '../services/auth/AuthContext';
import { useWorkspace } from '../modules/workspaces/WorkspaceContext';
import { WorkspaceRole, WorkspaceMember } from '../modules/workspaces/types';
import { Card } from '../core/components/Card';
import { Badge } from '../core/components/Badge';
import { Button } from '../core/components/Button';
import { Input } from '../core/components/Input';
import { ModalContainer } from '../core/components/ModalContainer';
import { AuthScreen } from './AuthScreen';
import { Ionicons } from '@expo/vector-icons';
import { runSafely } from '../core/utils/runSafely';

export const WorkspacesScreen: React.FC = () => {
  const { theme } = useTheme();
  const { user } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const {
    workspaces,
    activeWorkspace,
    defaultWorkspaceId,
    setActiveWorkspace,
    setDefaultWorkspace,
    createWorkspace,
    addMember,
    updateMemberRole,
    approveMember,
    rejectMember,
    removeMember,
    renameWorkspace,
    transferOwnership,
    deleteWorkspace,
    leaveWorkspace,
    joinWorkspaceByCode,
    regenerateWorkspaceInviteCode,
    currentUserRole,
    pendingRequestsCount,
    refreshWorkspaces,
  } = useWorkspace();

  // Rename Workspace Modal
  const [renameModalVisible, setRenameModalVisible] = useState(false);
  const [renameValue, setRenameValue] = useState('');
  const [renameError, setRenameError] = useState('');

  // Create Workspace Modal
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [newWsName, setNewWsName] = useState('');
  const [newWsDesc, setNewWsDesc] = useState('');
  const [newWsIsShared, setNewWsIsShared] = useState(true);
  const [newWsNameError, setNewWsNameError] = useState('');

  // Join Workspace Modal
  const [joinModalVisible, setJoinModalVisible] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [joinCodeError, setJoinCodeError] = useState('');

  // Add Member Modal
  const [memberModalVisible, setMemberModalVisible] = useState(false);
  const [memberName, setMemberName] = useState('');
  const [memberEmail, setMemberEmail] = useState('');
  const [memberRole, setMemberRole] = useState<WorkspaceRole>('editor');
  const [memberNameError, setMemberNameError] = useState('');
  const [memberEmailError, setMemberEmailError] = useState('');

  // Manage Member Modal
  const [selectedMemberToManage, setSelectedMemberToManage] = useState<{
    id: string;
    name: string;
    email: string;
    role: WorkspaceRole;
  } | null>(null);
  const [manageStep, setManageStep] = useState<'options' | 'transfer' | 'remove'>('options');
  const [isManagingLoading, setIsManagingLoading] = useState(false);
  // Evita envio duplicado (toque duplo) enquanto uma criação/convite está em andamento
  const isSubmittingRef = useRef(false);

  const isSolo = activeWorkspace.type === 'solo';

  const handleShareCode = async () => {
    try {
      await Share.share({
        message: `Entre no meu espaço compartilhado "${activeWorkspace.name}" no App de Finanças usando o código de convite: ${activeWorkspace.inviteCode}`,
      });
    } catch {
      Alert.alert('Código de Convite', `Código: ${activeWorkspace.inviteCode}`);
    }
  };

  const handleRegenerateCode = () => {
    if (activeWorkspace.id === 'ws-solo' || activeWorkspace.type === 'solo') return;
    if (currentUserRole !== 'owner') {
      Alert.alert('Permissão', 'Apenas o proprietário pode gerar um novo código de convite.');
      return;
    }

    Alert.alert(
      'Gerar Novo Código de Convite?',
      'O código atual deixará de funcionar para novas pessoas entrarem. Os membros que já fazem parte deste espaço continuarão com acesso normal.\n\nDeseja continuar?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Gerar Novo Código',
          style: 'default',
          onPress: () => {
            runSafely(async () => {
              const res = await regenerateWorkspaceInviteCode(activeWorkspace.id);
              if (res.success) {
                Alert.alert('Sucesso 🎉', `Novo código gerado:\n\n${res.newCode}`);
              } else {
                Alert.alert('Aviso', res.message);
              }
            }, 'Não foi possível gerar um novo código de convite.');
          },
        },
      ]
    );
  };

  const handleDeleteWorkspace = () => {
    if (activeWorkspace.id === 'ws-solo' || activeWorkspace.type === 'solo') {
      Alert.alert('Aviso', 'O espaço pessoal não pode ser excluído.');
      return;
    }

    Alert.alert(
      'Excluir Espaço Financeiro?',
      `Atenção: Ao excluir o espaço "${activeWorkspace.name}", todos os lançamentos e configurações deste espaço deixarão de estar disponíveis.\n\nEsta ação é definitiva e não poderá ser desfeita. Tem certeza que deseja excluir?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir Definitivamente',
          style: 'destructive',
          onPress: () => {
            runSafely(async () => {
              const res = await deleteWorkspace(activeWorkspace.id);
              if (res.success) {
                Alert.alert('Sucesso', res.message);
              } else {
                Alert.alert('Aviso', res.message);
              }
            }, 'Não foi possível excluir o espaço.');
          },
        },
      ]
    );
  };

  const handleCreateWorkspace = async () => {
    if (!newWsName.trim()) {
      setNewWsNameError('Informe o nome do espaço');
      return;
    }
    setNewWsNameError('');
    if (isSubmittingRef.current) return; // evita criar em dobro com toque duplo
    isSubmittingRef.current = true;
    try {
      const ok = await runSafely(
        () => createWorkspace(newWsName.trim(), newWsDesc.trim(), newWsIsShared),
        'Não foi possível criar o espaço.'
      );
      if (!ok) return;
      setNewWsName('');
      setNewWsDesc('');
      setCreateModalVisible(false);
    } finally {
      isSubmittingRef.current = false;
    }
  };

  const handleJoinWorkspace = async () => {
    if (!joinCode.trim()) {
      setJoinCodeError('Informe o código do convite');
      return;
    }
    setJoinCodeError('');
    const res = await joinWorkspaceByCode(joinCode.trim());
    if (res.success) {
      Alert.alert('Sucesso!', res.message);
      setJoinCode('');
      setJoinModalVisible(false);
    } else {
      setJoinCodeError(res.message);
    }
  };

  const handleAddMember = async () => {
    let hasErr = false;
    if (!memberName.trim()) {
      setMemberNameError('Informe o nome do convidado');
      hasErr = true;
    } else {
      setMemberNameError('');
    }

    if (!memberEmail.trim()) {
      setMemberEmailError('Informe o e-mail');
      hasErr = true;
    } else if (!memberEmail.includes('@') || !memberEmail.includes('.')) {
      setMemberEmailError('Informe um e-mail válido');
      hasErr = true;
    } else {
      setMemberEmailError('');
    }

    if (hasErr) return;

    if (isSubmittingRef.current) return;
    isSubmittingRef.current = true;
    try {
      const ok = await runSafely(
        () => addMember(activeWorkspace.id, memberName.trim(), memberEmail.trim(), memberRole),
        'Não foi possível adicionar o membro.'
      );
      if (!ok) return;
    } finally {
      isSubmittingRef.current = false;
    }
    setMemberName('');
    setMemberEmail('');
    setMemberRole('editor');
    setMemberModalVisible(false);
  };

  const handleLeaveWorkspace = () => {
    Alert.alert(
      'Sair do Espaço?',
      `Tem certeza que deseja sair do espaço "${activeWorkspace.name}"?\n\nVocê deixará de ter acesso aos lançamentos deste espaço. Se precisar voltar no futuro, o proprietário precisará lhe fornecer um novo convite.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Sair do Espaço',
          style: 'destructive',
          onPress: () => {
            runSafely(async () => {
              const res = await leaveWorkspace(activeWorkspace.id);
              if (res.success) {
                Alert.alert('Sucesso', res.message);
              } else {
                Alert.alert('Aviso', res.message);
              }
            }, 'Não foi possível sair do espaço.');
          },
        },
      ]
    );
  };

  const handleManageMemberRole = (member: { id: string; name: string; email: string; role: WorkspaceRole }) => {
    if (currentUserRole !== 'owner') return;
    setSelectedMemberToManage(member);
    setManageStep('options');
  };

  const handleConfirmRemoveMember = (member: { id: string; name: string; email: string; role: WorkspaceRole }) => {
    if (currentUserRole !== 'owner') return;
    setSelectedMemberToManage(member);
    setManageStep('remove');
  };

  const handleCloseManageMember = () => {
    setSelectedMemberToManage(null);
    setManageStep('options');
    setIsManagingLoading(false);
  };

  const handleToggleMemberRole = async () => {
    if (!selectedMemberToManage) return;
    setIsManagingLoading(true);
    const nextRole: WorkspaceRole = selectedMemberToManage.role === 'editor' ? 'viewer' : 'editor';
    try {
      await runSafely(
        () => updateMemberRole(activeWorkspace.id, selectedMemberToManage.id, nextRole),
        'Não foi possível alterar a permissão do membro.'
      );
    } finally {
      setIsManagingLoading(false);
      handleCloseManageMember();
    }
  };

  const handleConfirmTransfer = async () => {
    if (!selectedMemberToManage) return;
    setIsManagingLoading(true);
    const targetEmail = selectedMemberToManage.email;
    try {
      await runSafely(async () => {
        const res = await transferOwnership(activeWorkspace.id, targetEmail);
        if (res.success) {
          Alert.alert('Sucesso 🎉', res.message);
        } else {
          Alert.alert('Aviso', res.message);
        }
      }, 'Não foi possível transferir a propriedade do espaço.');
    } finally {
      setIsManagingLoading(false);
      handleCloseManageMember();
    }
  };

  const handleConfirmRemove = async () => {
    if (!selectedMemberToManage) return;
    setIsManagingLoading(true);
    const memberId = selectedMemberToManage.id;
    try {
      await runSafely(
        () => removeMember(activeWorkspace.id, memberId),
        'Não foi possível remover o membro.'
      );
    } finally {
      setIsManagingLoading(false);
      handleCloseManageMember();
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refreshWorkspaces();
    } finally {
      setIsRefreshing(false);
    }
  };

  const allPendingRequests = useMemo(() => {
    const list: Array<{
      workspaceId: string;
      workspaceName: string;
      member: WorkspaceMember;
    }> = [];

    workspaces.forEach((w) => {
      const isOwner = w.members.some(
        (m) =>
          m.role === 'owner' &&
          (m.isCurrentUser || (user?.email && m.email.toLowerCase().trim() === user.email.toLowerCase().trim()))
      );
      if (isOwner) {
        w.members
          .filter((m) => m.role === 'pending')
          .forEach((m) => {
            list.push({
              workspaceId: w.id,
              workspaceName: w.name,
              member: m,
            });
          });
      }
    });

    return list;
  }, [workspaces, user?.email]);

  const handleApproveRequest = (
    req: { id: string; name: string; email: string },
    role: 'editor' | 'viewer',
    wsId: string = activeWorkspace.id
  ) => {
    const roleLabel = role === 'editor' ? 'Pode Editar ✏️' : 'Apenas Ver 👁️';
    Alert.alert(
      'Aprovar Entrada',
      `Deseja autorizar "${req.name}" (${req.email}) com a permissão: ${roleLabel}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Confirmar Aprovação',
          onPress: async () => {
            const ok = await runSafely(() => approveMember(wsId, req.id, role), 'Não foi possível aprovar o membro.');
            if (ok) {
              Alert.alert('Membro Aprovado! 🎉', `"${req.name}" agora tem acesso a este espaço.`);
            }
          },
        },
      ]
    );
  };

  const handleRejectRequest = (
    req: { id: string; name: string; email: string },
    wsId: string = activeWorkspace.id
  ) => {
    Alert.alert(
      'Recusar Solicitação',
      `Tem certeza que deseja recusar a solicitação de "${req.name}" (${req.email})?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Recusar',
          style: 'destructive',
          onPress: async () => {
            const ok = await runSafely(() => rejectMember(wsId, req.id), 'Não foi possível recusar a solicitação.');
            if (ok) {
              Alert.alert('Solicitação Recusada', `A solicitação foi recusada e o usuário não terá acesso.`);
            }
          },
        },
      ]
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={theme.primary}
            colors={[theme.primary]}
          />
        }
      >
        {/* Seletor Compacto de Espaços (Pills no Topo) */}
        <View style={styles.selectorSection}>
          <Text style={[styles.selectorLabel, { color: theme.textMuted }]}>
            Alternar Espaço:
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.tabsScroll}
          >
            {workspaces.map((ws) => {
              const isSelected = ws.id === activeWorkspace.id;
              const isItemSolo = ws.type === 'solo';
              const wsPendingCount = ws.members.filter((m) => m.role === 'pending').length;

              return (
                <TouchableOpacity
                  key={ws.id}
                  activeOpacity={0.7}
                  onPress={() => runSafely(() => setActiveWorkspace(ws.id), 'Não foi possível trocar de espaço.')}
                  style={[
                    styles.tabChip,
                    {
                      backgroundColor: isSelected ? theme.primary : theme.surfaceVariant,
                      borderColor: isSelected ? theme.primary : theme.border,
                    },
                  ]}
                >
                  <Ionicons
                    name={isItemSolo ? 'person' : 'people'}
                    size={15}
                    color={isSelected ? '#FFF' : theme.textMuted}
                    style={{ marginRight: 6 }}
                  />
                  <Text
                    style={[
                      styles.tabChipText,
                      {
                        color: isSelected ? '#FFF' : theme.text,
                        fontWeight: isSelected ? '700' : '600',
                      },
                    ]}
                  >
                    {ws.name}
                  </Text>
                  {wsPendingCount > 0 && (
                    <View style={styles.chipPendingBadge}>
                      <Text style={styles.chipPendingBadgeText}>{wsPendingCount}</Text>
                    </View>
                  )}
                  {defaultWorkspaceId === ws.id && (
                    <Ionicons
                      name="star"
                      size={12}
                      color={isSelected ? '#FDE047' : '#EAB308'}
                      style={{ marginLeft: 4 }}
                    />
                  )}
                  {isSelected && (
                    <View style={styles.activeDot} />
                  )}
                </TouchableOpacity>
              );
            })}

            {user ? (
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => setCreateModalVisible(true)}
                style={[
                  styles.addTabChip,
                  {
                    backgroundColor: theme.surfaceVariant,
                    borderColor: theme.border,
                  },
                ]}
              >
                <Ionicons name="add" size={16} color={theme.primary} />
                <Text style={[styles.addTabChipText, { color: theme.primary }]}>
                  Novo
                </Text>
              </TouchableOpacity>
            ) : null}
          </ScrollView>
        </View>

        {/* Bloco Geral de Solicitações Pendentes (visível independente de qual espaço está aberto) */}
        {allPendingRequests.length > 0 && (
          <View
            style={[
              styles.pendingContainer,
              { backgroundColor: '#F59E0B14', borderColor: '#F59E0B44', marginBottom: 16 },
            ]}
          >
            <View style={styles.pendingHeaderRow}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Ionicons name="notifications" size={18} color="#F59E0B" style={{ marginRight: 6 }} />
                <Text style={[styles.pendingSectionTitle, { color: theme.text }]}>
                  Solicitações de Entrada ({allPendingRequests.length})
                </Text>
              </View>
              <Badge label="Aguardando Aprovação" variant="warning" />
            </View>

            <Text style={[styles.pendingDescription, { color: theme.textMuted }]}>
              Pessoas que usaram seu código de convite e aguardam sua aprovação para acessar:
            </Text>

            {allPendingRequests.map((item) => (
              <Card key={item.member.id} variant="flat" style={styles.pendingReqCard}>
                <View style={styles.pendingReqInfo}>
                  <View
                    style={[
                      styles.memberAvatar,
                      { backgroundColor: '#F59E0B22' },
                    ]}
                  >
                    <Text style={[styles.memberAvatarText, { color: '#F59E0B' }]}>
                      {(item.member.name.charAt(0) || 'U').toUpperCase()}
                    </Text>
                  </View>
                  <View style={styles.memberDetails}>
                    <Text style={[styles.memberName, { color: theme.text }]}>
                      {item.member.name}
                    </Text>
                    <Text style={[styles.memberEmail, { color: theme.textMuted }]}>
                      {item.member.email}
                    </Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 3 }}>
                      <Ionicons name="folder-outline" size={12} color="#8B5CF6" style={{ marginRight: 4 }} />
                      <Text style={{ fontSize: 11, fontWeight: '700', color: '#8B5CF6' }}>
                        Espaço: {item.workspaceName}
                      </Text>
                    </View>
                  </View>
                </View>

                <View style={styles.approvalButtonsRow}>
                  <TouchableOpacity
                    style={[styles.approveActionBtn, { backgroundColor: '#10B981' }]}
                    onPress={() => handleApproveRequest(item.member, 'editor', item.workspaceId)}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="create-outline" size={14} color="#FFF" style={{ marginRight: 4 }} />
                    <Text style={styles.approveActionBtnText}>Pode Editar ✏️</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.approveActionBtn, { backgroundColor: '#3B82F6' }]}
                    onPress={() => handleApproveRequest(item.member, 'viewer', item.workspaceId)}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="eye-outline" size={14} color="#FFF" style={{ marginRight: 4 }} />
                    <Text style={styles.approveActionBtnText}>Apenas Ver 👁️</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.rejectActionBtn, { borderColor: '#EF444466' }]}
                    onPress={() => handleRejectRequest(item.member, item.workspaceId)}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="close" size={15} color="#EF4444" style={{ marginRight: 3 }} />
                    <Text style={[styles.rejectActionBtnText, { color: '#EF4444' }]}>Recusar</Text>
                  </TouchableOpacity>
                </View>
              </Card>
            ))}
          </View>
        )}

        {/* Hero Card do Espaço Selecionado */}
        <Card variant="elevated" style={styles.heroCard}>
          <View style={styles.heroHeader}>
            <View
              style={[
                styles.heroIconBox,
                {
                  backgroundColor: isSolo ? `${theme.primary}18` : '#8B5CF618',
                },
              ]}
            >
              <Ionicons
                name={isSolo ? 'person' : 'people'}
                size={24}
                color={isSolo ? theme.primary : '#8B5CF6'}
              />
            </View>

            <View style={styles.heroTitleWrap}>
              <View style={styles.heroNameRow}>
                <Text style={[styles.heroName, { color: theme.text }]} numberOfLines={1}>
                  {activeWorkspace.name}
                </Text>
                <TouchableOpacity
                  onPress={() => {
                    setRenameValue(activeWorkspace.name);
                    setRenameModalVisible(true);
                  }}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  style={[styles.inlineRenameBtn, { backgroundColor: theme.surfaceVariant }]}
                >
                  <Ionicons name="pencil" size={13} color={theme.textMuted} />
                </TouchableOpacity>
              </View>

              <Text style={[styles.heroSub, { color: theme.textMuted }]}>
                {isSolo
                  ? 'Espaço Individual • Somente você'
                  : `Espaço Colaborativo • ${activeWorkspace.members.length} membro(s)`}
              </Text>
            </View>

            <View style={{ alignItems: 'flex-end', gap: 6 }}>
              <Badge label="Em Uso" variant="primary" />
              {defaultWorkspaceId === activeWorkspace.id ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#10B98118', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 }}>
                  <Ionicons name="star" size={11} color="#10B981" style={{ marginRight: 3 }} />
                  <Text style={{ fontSize: 10, fontWeight: '700', color: '#10B981' }}>Padrão</Text>
                </View>
              ) : (
                <TouchableOpacity
                  onPress={async () => {
                    const ok = await runSafely(
                      () => setDefaultWorkspace(activeWorkspace.id),
                      'Não foi possível definir o espaço padrão.'
                    );
                    if (ok) {
                      Alert.alert('Espaço Padrão Definido! ⭐', `"${activeWorkspace.name}" agora é o seu espaço padrão. Ele será aberto automaticamente ao entrar no app.`);
                    }
                  }}
                  activeOpacity={0.7}
                  hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                  style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: theme.surfaceVariant, paddingHorizontal: 6, paddingVertical: 3, borderRadius: 6 }}
                >
                  <Ionicons name="star-outline" size={12} color={theme.textMuted} style={{ marginRight: 3 }} />
                  <Text style={{ fontSize: 10, fontWeight: '600', color: theme.textMuted }}>Tornar Padrão</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Bloco de Código de Convite com Compartilhamento Rápido */}
          {!isSolo && (
            <View
              style={[
                styles.inviteBox,
                { backgroundColor: theme.surfaceVariant, borderColor: theme.border },
              ]}
            >
              <View style={styles.inviteInfo}>
                <Text style={[styles.inviteLabel, { color: theme.textMuted }]}>
                  Código de Convite
                </Text>
                <Text style={[styles.inviteCodeText, { color: theme.primary }]}>
                  {activeWorkspace.inviteCode}
                </Text>
              </View>

              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                {currentUserRole === 'owner' && (
                  <TouchableOpacity
                    style={[styles.regenBtn, { borderColor: theme.border, backgroundColor: theme.card, marginRight: 8 }]}
                    onPress={handleRegenerateCode}
                    activeOpacity={0.7}
                    accessibilityLabel="Gerar novo código de convite"
                  >
                    <Ionicons name="refresh-outline" size={16} color={theme.text} />
                  </TouchableOpacity>
                )}

                <TouchableOpacity
                  style={[styles.shareBtn, { backgroundColor: theme.primary }]}
                  onPress={handleShareCode}
                  activeOpacity={0.8}
                >
                  <Ionicons name="share-social-outline" size={15} color="#FFF" style={{ marginRight: 6 }} />
                  <Text style={styles.shareBtnText}>Compartilhar</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Ações de Espaço Compartilhado: Excluir (somente Proprietário) ou Sair (Membros convidados) */}
          {!isSolo && activeWorkspace.id !== 'ws-solo' && (
            <View style={[styles.dangerArea, { borderTopColor: theme.border }]}>
              {currentUserRole === 'owner' ? (
                <TouchableOpacity
                  onPress={handleDeleteWorkspace}
                  style={styles.deleteWsBtn}
                  activeOpacity={0.7}
                >
                  <Ionicons name="trash-outline" size={15} color={theme.danger} style={{ marginRight: 6 }} />
                  <Text style={[styles.deleteWsText, { color: theme.danger }]}>
                    Excluir este Espaço (Apenas Proprietário)
                  </Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  onPress={handleLeaveWorkspace}
                  style={styles.deleteWsBtn}
                  activeOpacity={0.7}
                >
                  <Ionicons name="log-out-outline" size={15} color={theme.danger} style={{ marginRight: 6 }} />
                  <Text style={[styles.deleteWsText, { color: theme.danger }]}>
                    Sair deste Espaço Compartilhado
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </Card>

        {/* Detalhes de Membros (Se Compartilhado) */}
        {!isSolo && (() => {
          const activeMembers = activeWorkspace.members.filter((m) => m.role !== 'pending');
          const pendingRequests = activeWorkspace.members.filter((m) => m.role === 'pending');

          return (
            <View style={styles.membersSection}>
              {/* Bloco de Solicitações Pendentes (visível apenas para o Proprietário) */}
              {currentUserRole === 'owner' && pendingRequests.length > 0 && (
                <View
                  style={[
                    styles.pendingContainer,
                    { backgroundColor: '#F59E0B12', borderColor: '#F59E0B40' },
                  ]}
                >
                  <View style={styles.pendingHeaderRow}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Ionicons name="time" size={17} color="#F59E0B" style={{ marginRight: 6 }} />
                      <Text style={[styles.pendingSectionTitle, { color: theme.text }]}>
                        Solicitações de Entrada ({pendingRequests.length})
                      </Text>
                    </View>
                    <Badge label="Aguardando" variant="warning" />
                  </View>

                  <Text style={[styles.pendingDescription, { color: theme.textMuted }]}>
                    Pessoas que usaram o código de convite e aguardam sua aprovação para acessar este espaço:
                  </Text>

                  {pendingRequests.map((req) => (
                    <Card key={req.id} variant="flat" style={styles.pendingReqCard}>
                      <View style={styles.pendingReqInfo}>
                        <View
                          style={[
                            styles.memberAvatar,
                            { backgroundColor: '#F59E0B20' },
                          ]}
                        >
                          <Text style={[styles.memberAvatarText, { color: '#F59E0B' }]}>
                            {(req.name.charAt(0) || 'U').toUpperCase()}
                          </Text>
                        </View>
                        <View style={styles.memberDetails}>
                          <Text style={[styles.memberName, { color: theme.text }]}>
                            {req.name}
                          </Text>
                          <Text style={[styles.memberEmail, { color: theme.textMuted }]}>
                            {req.email}
                          </Text>
                        </View>
                      </View>

                      <View style={styles.approvalButtonsRow}>
                        <TouchableOpacity
                          style={[styles.approveActionBtn, { backgroundColor: '#10B981' }]}
                          onPress={() => handleApproveRequest(req, 'editor')}
                          activeOpacity={0.8}
                        >
                          <Ionicons name="create-outline" size={14} color="#FFF" style={{ marginRight: 4 }} />
                          <Text style={styles.approveActionBtnText}>Pode Editar ✏️</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={[styles.approveActionBtn, { backgroundColor: '#3B82F6' }]}
                          onPress={() => handleApproveRequest(req, 'viewer')}
                          activeOpacity={0.8}
                        >
                          <Ionicons name="eye-outline" size={14} color="#FFF" style={{ marginRight: 4 }} />
                          <Text style={styles.approveActionBtnText}>Apenas Ver 👁️</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={[styles.rejectActionBtn, { borderColor: theme.danger }]}
                          onPress={() => handleRejectRequest(req)}
                          activeOpacity={0.8}
                        >
                          <Ionicons name="close" size={15} color={theme.danger} style={{ marginRight: 2 }} />
                          <Text style={[styles.rejectActionBtnText, { color: theme.danger }]}>Recusar</Text>
                        </TouchableOpacity>
                      </View>
                    </Card>
                  ))}
                </View>
              )}

              <View style={styles.sectionHeaderRow}>
                <Text style={[styles.sectionTitle, { color: theme.text }]}>
                  Pessoas com Acesso ({activeMembers.length})
                </Text>

                <TouchableOpacity
                  onPress={() => setMemberModalVisible(true)}
                  style={[styles.inviteSmallBtn, { backgroundColor: theme.surfaceVariant }]}
                  activeOpacity={0.7}
                >
                  <Ionicons name="person-add" size={13} color={theme.primary} style={{ marginRight: 4 }} />
                  <Text style={[styles.inviteSmallBtnText, { color: theme.primary }]}>
                    Convidar
                  </Text>
                </TouchableOpacity>
              </View>

              {activeMembers.map((member) => {
                const isYou = member.isCurrentUser;
                const displayName = isYou
                  ? member.name === 'Você'
                    ? 'Você'
                    : `${member.name} (Você)`
                  : member.name;
                const initial = (displayName.charAt(0) || 'U').toUpperCase();

                return (
                  <Card key={member.id} variant="flat" style={styles.memberCard}>
                    <View style={styles.memberRow}>
                      <View
                        style={[
                          styles.memberAvatar,
                          {
                            backgroundColor: isYou ? `${theme.primary}20` : '#8B5CF620',
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.memberAvatarText,
                            { color: isYou ? theme.primary : '#8B5CF6' },
                          ]}
                        >
                          {initial}
                        </Text>
                      </View>

                      <View style={styles.memberDetails}>
                        <Text style={[styles.memberName, { color: theme.text }]}>
                          {displayName}
                        </Text>
                        <Text style={[styles.memberEmail, { color: theme.textMuted }]}>
                          {member.email}
                        </Text>
                      </View>

                      <View style={styles.memberActions}>
                        {member.role === 'owner' ? (
                          <Badge label="Proprietário" variant="primary" />
                        ) : currentUserRole === 'owner' ? (
                          <TouchableOpacity
                            onPress={() => handleManageMemberRole(member)}
                            activeOpacity={0.7}
                          >
                            <Badge
                              label={member.role === 'editor' ? 'Pode Editar ✏️' : 'Apenas Ver 👁️'}
                              variant={member.role === 'editor' ? 'success' : 'neutral'}
                            />
                          </TouchableOpacity>
                        ) : (
                          <Badge
                            label={member.role === 'editor' ? 'Pode Editar ✏️' : 'Apenas Ver 👁️'}
                            variant={member.role === 'editor' ? 'success' : 'neutral'}
                          />
                        )}

                        {currentUserRole === 'owner' && !isYou && member.role !== 'owner' && (
                          <TouchableOpacity
                            onPress={() => handleConfirmRemoveMember(member)}
                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                            style={{ marginLeft: 8 }}
                          >
                            <Ionicons name="close-circle-outline" size={20} color={theme.danger} />
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>
                  </Card>
                );
              })}
            </View>
          );
        })()}

        {/* Visão do Espaço Solo (Privacidade & Sugestão) */}
        {isSolo && !user && (
          <Card
            variant="flat"
            style={[
              styles.privacyCard,
              { borderColor: `${theme.primary}40`, borderWidth: 1, backgroundColor: `${theme.primary}06` },
            ]}
          >
            <View style={[styles.privacyIconWrap, { backgroundColor: `${theme.primary}18` }]}>
              <Ionicons name="cloud-offline-outline" size={32} color={theme.primary} />
            </View>
            <Text style={[styles.privacyTitle, { color: theme.text }]}>
              Modo Offline (Sem Compartilhamento)
            </Text>
            <Text style={[styles.privacySub, { color: theme.textMuted }]}>
              Suas finanças estão salvas exclusivamente neste celular. Para criar espaços colaborativos com seu parceiro(a) ou sincronizar dados em tempo real, faça login ou crie uma conta gratuita.
            </Text>
            <Button
              title="Fazer Login ou Criar Conta"
              variant="primary"
              icon={<Ionicons name="log-in-outline" size={18} color="#FFF" />}
              onPress={() => setShowAuthModal(true)}
              style={{ marginTop: 8, width: '100%' }}
            />
          </Card>
        )}

        {isSolo && user && (
          <Card variant="flat" style={styles.privacyCard}>
            <View style={[styles.privacyIconWrap, { backgroundColor: `${theme.primary}15` }]}>
              <Ionicons name="shield-checkmark" size={32} color={theme.primary} />
            </View>
            <Text style={[styles.privacyTitle, { color: theme.text }]}>
              Finanças 100% Pessoais e Privadas
            </Text>
            <Text style={[styles.privacySub, { color: theme.textMuted }]}>
              Neste espaço, todos os seus dados ficam restritos a você. Ninguém mais tem acesso aos seus lançamentos, saldos ou contas.
            </Text>
            <Text style={[styles.privacyHint, { color: theme.textMuted }]}>
              Quer dividir gastos da casa ou de uma viagem? Crie um espaço compartilhado ou entre com um código abaixo.
            </Text>
          </Card>
        )}

        {/* Ações Rápidas no Rodapé (Disponíveis apenas online) */}
        {user ? (
          <View style={styles.bottomActions}>
            <Button
              title="Criar Novo Espaço"
              variant="outline"
              icon={<Ionicons name="add-circle-outline" size={18} color={theme.text} />}
              onPress={() => setCreateModalVisible(true)}
              style={{ flex: 1, marginRight: 8 }}
            />
            <Button
              title="Entrar com Código"
              variant="secondary"
              icon={<Ionicons name="key-outline" size={18} color={theme.text} />}
              onPress={() => setJoinModalVisible(true)}
              style={{ flex: 1 }}
            />
          </View>
        ) : null}
      </ScrollView>

      {/* Modal Criar Espaço */}
      <ModalContainer
        visible={createModalVisible}
        onClose={() => {
          setCreateModalVisible(false);
          setNewWsNameError('');
        }}
        title="Novo Espaço Financeiro"
      >
        <Input
          label="Nome do Espaço"
          placeholder="Ex: Finanças Casal, Empresa MEI"
          value={newWsName}
          onChangeText={(val) => {
            setNewWsName(val);
            if (newWsNameError) setNewWsNameError('');
          }}
          error={newWsNameError}
        />

        <Input
          label="Descrição"
          placeholder="Ex: Contas compartilhadas da casa"
          value={newWsDesc}
          onChangeText={setNewWsDesc}
        />

        <Text style={[styles.sectionLabel, { color: theme.textMuted }]}>
          Tipo de Compartilhamento
        </Text>
        <View style={styles.typeSelector}>
          <TouchableOpacity
            style={[
              styles.typeOption,
              !newWsIsShared && { backgroundColor: theme.primary },
            ]}
            onPress={() => setNewWsIsShared(false)}
          >
            <Ionicons
              name="person"
              size={18}
              color={!newWsIsShared ? '#FFF' : theme.text}
            />
            <Text
              style={[
                styles.typeOptionText,
                { color: !newWsIsShared ? '#FFF' : theme.text },
              ]}
            >
              Solo (Privado)
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.typeOption,
              newWsIsShared && { backgroundColor: theme.primary },
            ]}
            onPress={() => setNewWsIsShared(true)}
          >
            <Ionicons
              name="people"
              size={18}
              color={newWsIsShared ? '#FFF' : theme.text}
            />
            <Text
              style={[
                styles.typeOptionText,
                { color: newWsIsShared ? '#FFF' : theme.text },
              ]}
            >
              Compartilhado
            </Text>
          </TouchableOpacity>
        </View>

        <Button
          title="Criar Espaço"
          onPress={handleCreateWorkspace}
          style={{ marginTop: 12 }}
        />
      </ModalContainer>

      {/* Modal Convidar Membro */}
      <ModalContainer
        visible={memberModalVisible}
        onClose={() => {
          setMemberModalVisible(false);
          setMemberNameError('');
          setMemberEmailError('');
        }}
        title="Liberar Acesso para Outra Pessoa"
      >
        <Input
          label="Nome do Convidado"
          placeholder="Ex: Maria Clara, João Pedro"
          value={memberName}
          onChangeText={(val) => {
            setMemberName(val);
            if (memberNameError) setMemberNameError('');
          }}
          error={memberNameError}
        />

        <Input
          label="E-mail"
          placeholder="exemplo@email.com"
          keyboardType="email-address"
          value={memberEmail}
          onChangeText={(val) => {
            setMemberEmail(val);
            if (memberEmailError) setMemberEmailError('');
          }}
          error={memberEmailError}
        />

        <Text style={[styles.sectionLabel, { color: theme.textMuted }]}>
          Nível de Permissão
        </Text>
        <View style={styles.typeSelector}>
          <TouchableOpacity
            style={[
              styles.typeOption,
              memberRole === 'viewer' && { backgroundColor: theme.primary },
            ]}
            onPress={() => setMemberRole('viewer')}
          >
            <Ionicons
              name="eye-outline"
              size={18}
              color={memberRole === 'viewer' ? '#FFF' : theme.text}
            />
            <Text
              style={[
                styles.typeOptionText,
                { color: memberRole === 'viewer' ? '#FFF' : theme.text },
              ]}
            >
              Apenas Ver
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.typeOption,
              memberRole === 'editor' && { backgroundColor: theme.primary },
            ]}
            onPress={() => setMemberRole('editor')}
          >
            <Ionicons
              name="create-outline"
              size={18}
              color={memberRole === 'editor' ? '#FFF' : theme.text}
            />
            <Text
              style={[
                styles.typeOptionText,
                { color: memberRole === 'editor' ? '#FFF' : theme.text },
              ]}
            >
              Ver e Editar
            </Text>
          </TouchableOpacity>
        </View>

        <Button
          title="Conceder Acesso"
          onPress={handleAddMember}
          style={{ marginTop: 12 }}
        />
      </ModalContainer>

      {/* Modal Entrar com Código */}
      <ModalContainer
        visible={joinModalVisible}
        onClose={() => {
          setJoinModalVisible(false);
          setJoinCodeError('');
        }}
        title="Entrar em um Espaço"
      >
        <Input
          label="Código do Convite"
          placeholder="Ex: FIN-7K8M-9P2W"
          autoCapitalize="characters"
          value={joinCode}
          onChangeText={(val) => {
            setJoinCode(val);
            if (joinCodeError) setJoinCodeError('');
          }}
          error={joinCodeError}
        />
        <Text style={{ fontSize: 12, color: theme.textMuted, marginTop: -4, marginBottom: 12 }}>
          💡 Você pode digitar o código com ou sem o prefixo &quot;FIN-&quot;.
        </Text>
        <Button
          title="Vincular Espaço"
          onPress={handleJoinWorkspace}
          style={{ marginTop: 8 }}
        />
      </ModalContainer>

      {/* Modal Renomear Espaço */}
      <ModalContainer
        visible={renameModalVisible}
        onClose={() => {
          setRenameModalVisible(false);
          setRenameError('');
        }}
        title="Renomear Espaço"
      >
        <Input
          label="Novo Nome do Espaço"
          placeholder="Ex: Finanças Casal"
          value={renameValue}
          onChangeText={(val) => {
            setRenameValue(val);
            if (renameError) setRenameError('');
          }}
          error={renameError}
        />
        <Button
          title="Salvar Novo Nome"
          onPress={async () => {
            if (!renameValue.trim()) {
              setRenameError('Informe o novo nome');
              return;
            }
            const ok = await runSafely(
              () => renameWorkspace(activeWorkspace.id, renameValue.trim()),
              'Não foi possível renomear o espaço.'
            );
            if (ok) setRenameModalVisible(false);
          }}
          style={{ marginTop: 8 }}
        />
      </ModalContainer>

      {/* Modal Gerenciar Membro / Permissões (Substitui o Alert nativo do Android) */}
      <ModalContainer
        visible={!!selectedMemberToManage}
        onClose={handleCloseManageMember}
        title={
          manageStep === 'transfer'
            ? 'Transferir Titularidade'
            : manageStep === 'remove'
            ? 'Remover Membro'
            : selectedMemberToManage
            ? `Permissões: ${selectedMemberToManage.name}`
            : 'Gerenciar Membro'
        }
      >
        {selectedMemberToManage && (
          <View style={{ gap: 14 }}>
            {/* Card de Identificação do Membro */}
            <View
              style={[
                styles.manageMemberProfileCard,
                { backgroundColor: theme.surfaceVariant, borderColor: theme.border },
              ]}
            >
              <View
                style={[
                  styles.manageMemberAvatar,
                  { backgroundColor: `${theme.primary}20` },
                ]}
              >
                <Text style={[styles.manageMemberAvatarText, { color: theme.primary }]}>
                  {(selectedMemberToManage.name.charAt(0) || 'U').toUpperCase()}
                </Text>
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={[styles.manageMemberName, { color: theme.text }]} numberOfLines={1}>
                  {selectedMemberToManage.name}
                </Text>
                <Text style={[styles.manageMemberEmail, { color: theme.textMuted }]} numberOfLines={1}>
                  {selectedMemberToManage.email}
                </Text>
              </View>
              <Badge
                label={selectedMemberToManage.role === 'editor' ? 'Pode Editar ✏️' : 'Apenas Ver 👁️'}
                variant={selectedMemberToManage.role === 'editor' ? 'success' : 'neutral'}
              />
            </View>

            {manageStep === 'options' && (
              <>
                <Text style={[styles.manageSectionTitle, { color: theme.textMuted }]}>
                  Escolha o nível de acesso ou função:
                </Text>

                {/* Opção 1: Alternar Permissão */}
                <TouchableOpacity
                  activeOpacity={0.7}
                  disabled={isManagingLoading}
                  onPress={handleToggleMemberRole}
                  style={[
                    styles.manageActionCard,
                    {
                      backgroundColor: theme.surface,
                      borderColor: theme.border,
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.manageActionIconWrap,
                      {
                        backgroundColor:
                          selectedMemberToManage.role === 'editor'
                            ? '#3B82F618'
                            : '#10B98118',
                      },
                    ]}
                  >
                    <Ionicons
                      name={
                        selectedMemberToManage.role === 'editor'
                          ? 'eye-outline'
                          : 'create-outline'
                      }
                      size={22}
                      color={
                        selectedMemberToManage.role === 'editor'
                          ? '#3B82F6'
                          : '#10B981'
                      }
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.manageActionTitle, { color: theme.text }]}>
                      {selectedMemberToManage.role === 'editor'
                        ? 'Mudar para: Apenas Ver 👁️'
                        : 'Mudar para: Pode Editar ✏️'}
                    </Text>
                    <Text style={[styles.manageActionDesc, { color: theme.textMuted }]}>
                      {selectedMemberToManage.role === 'editor'
                        ? 'O participante só poderá ver extratos e gráficos, sem fazer lançamentos.'
                        : 'O participante terá permissão total para criar e editar transações.'}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={theme.textMuted} />
                </TouchableOpacity>

                {/* Opção 2: Transferir Propriedade */}
                <TouchableOpacity
                  activeOpacity={0.7}
                  disabled={isManagingLoading}
                  onPress={() => setManageStep('transfer')}
                  style={[
                    styles.manageActionCard,
                    {
                      backgroundColor: '#F59E0B0D',
                      borderColor: '#F59E0B40',
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.manageActionIconWrap,
                      { backgroundColor: '#F59E0B20' },
                    ]}
                  >
                    <Ionicons name="ribbon-outline" size={22} color="#D97706" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.manageActionTitle, { color: '#B45309' }]}>
                      👑 Transferir Propriedade
                    </Text>
                    <Text style={[styles.manageActionDesc, { color: theme.textMuted }]}>
                      Passar a titularidade oficial do espaço para {selectedMemberToManage.name}.
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color="#D97706" />
                </TouchableOpacity>

                {/* Opção 3: Remover Membro */}
                <TouchableOpacity
                  activeOpacity={0.7}
                  disabled={isManagingLoading}
                  onPress={() => setManageStep('remove')}
                  style={[
                    styles.manageActionCard,
                    {
                      backgroundColor: `${theme.danger}0A`,
                      borderColor: `${theme.danger}30`,
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.manageActionIconWrap,
                      { backgroundColor: `${theme.danger}18` },
                    ]}
                  >
                    <Ionicons name="person-remove-outline" size={22} color={theme.danger} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.manageActionTitle, { color: theme.danger }]}>
                      Remover do Espaço
                    </Text>
                    <Text style={[styles.manageActionDesc, { color: theme.textMuted }]}>
                      Revogar o acesso deste participante a este espaço compartilhado.
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={theme.danger} />
                </TouchableOpacity>

                <Button
                  title="Cancelar"
                  variant="outline"
                  onPress={handleCloseManageMember}
                  style={{ marginTop: 4 }}
                />
              </>
            )}

            {manageStep === 'transfer' && (
              <View style={{ gap: 12 }}>
                <View
                  style={[
                    styles.warningBox,
                    {
                      backgroundColor: '#F59E0B12',
                      borderColor: '#F59E0B40',
                    },
                  ]}
                >
                  <Ionicons name="warning-outline" size={24} color="#D97706" />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.warningBoxTitle, { color: '#B45309' }]}>
                      Atenção à mudança de dono!
                    </Text>
                    <Text style={[styles.warningBoxDesc, { color: theme.text }]}>
                      Você deixará de ser o proprietário do espaço "{activeWorkspace.name}" e passará a ser um membro editor.
                      {'\n\n'}
                      Apenas <Text style={{ fontWeight: '700' }}>{selectedMemberToManage.name}</Text> poderá gerenciar novos membros ou excluir este espaço.
                    </Text>
                  </View>
                </View>

                <Button
                  title={isManagingLoading ? 'Transferindo...' : 'Confirmar Transferência 👑'}
                  variant="primary"
                  onPress={handleConfirmTransfer}
                  disabled={isManagingLoading}
                  style={{ backgroundColor: '#D97706', borderColor: '#D97706' }}
                />

                <Button
                  title="Voltar"
                  variant="outline"
                  onPress={() => setManageStep('options')}
                  disabled={isManagingLoading}
                />
              </View>
            )}

            {manageStep === 'remove' && (
              <View style={{ gap: 12 }}>
                <View
                  style={[
                    styles.warningBox,
                    {
                      backgroundColor: `${theme.danger}10`,
                      borderColor: `${theme.danger}30`,
                    },
                  ]}
                >
                  <Ionicons name="alert-circle-outline" size={24} color={theme.danger} />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.warningBoxTitle, { color: theme.danger }]}>
                      Remover Participante
                    </Text>
                    <Text style={[styles.warningBoxDesc, { color: theme.text }]}>
                      Tem certeza que deseja remover o acesso de <Text style={{ fontWeight: '700' }}>{selectedMemberToManage.name}</Text> deste espaço?
                      {'\n\n'}
                      A pessoa perderá o acesso aos lançamentos imediatamente.
                    </Text>
                  </View>
                </View>

                <Button
                  title={isManagingLoading ? 'Removendo...' : 'Sim, Remover Acesso'}
                  variant="danger"
                  onPress={handleConfirmRemove}
                  disabled={isManagingLoading}
                />

                <Button
                  title="Voltar"
                  variant="outline"
                  onPress={() => setManageStep('options')}
                  disabled={isManagingLoading}
                />
              </View>
            )}
          </View>
        )}
      </ModalContainer>

      {/* Modal de Login / Cadastro para usuário Offline */}
      <Modal
        visible={showAuthModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowAuthModal(false)}
      >
        <AuthScreen onClose={() => setShowAuthModal(false)} />
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
    paddingBottom: 40,
  },
  selectorSection: {
    marginBottom: 16,
  },
  selectorLabel: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  tabsScroll: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 2,
  },
  tabChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 8,
  },
  tabChipText: {
    fontSize: 13,
  },
  activeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FFF',
    marginLeft: 6,
  },
  addTabChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 20,
    borderWidth: 1,
    borderStyle: 'dashed',
  },
  addTabChipText: {
    fontSize: 13,
    fontWeight: '700',
    marginLeft: 4,
  },
  heroCard: {
    padding: 18,
    marginBottom: 18,
    borderRadius: 16,
  },
  heroHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  heroIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  heroTitleWrap: {
    flex: 1,
  },
  heroNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  heroName: {
    fontSize: 17,
    fontWeight: '700',
    flexShrink: 1,
  },
  inlineRenameBtn: {
    marginLeft: 8,
    padding: 5,
    borderRadius: 6,
  },
  heroSub: {
    fontSize: 12,
    marginTop: 2,
  },
  inviteBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 14,
  },
  inviteInfo: {
    flex: 1,
  },
  inviteLabel: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  inviteCodeText: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 1,
    marginTop: 2,
  },
  shareBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  regenBtn: {
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  shareBtnText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '700',
  },
  dangerArea: {
    borderTopWidth: 1,
    paddingTop: 12,
    marginTop: 14,
    alignItems: 'flex-end',
  },
  deleteWsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 6,
  },
  deleteWsText: {
    fontSize: 13,
    fontWeight: '600',
  },
  membersSection: {
    marginBottom: 20,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  inviteSmallBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
  },
  inviteSmallBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  memberCard: {
    padding: 12,
    marginBottom: 8,
    borderRadius: 12,
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  memberAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  memberAvatarText: {
    fontSize: 16,
    fontWeight: '800',
  },
  memberDetails: {
    flex: 1,
  },
  memberName: {
    fontSize: 14,
    fontWeight: '700',
  },
  memberEmail: {
    fontSize: 12,
    marginTop: 1,
  },
  memberActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  privacyCard: {
    padding: 20,
    alignItems: 'center',
    textAlign: 'center',
    marginBottom: 20,
    borderRadius: 16,
  },
  privacyIconWrap: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  privacyTitle: {
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 6,
  },
  privacySub: {
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
    marginBottom: 8,
  },
  privacyHint: {
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  bottomActions: {
    flexDirection: 'row',
    marginTop: 8,
    marginBottom: 16,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
  },
  typeSelector: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  typeOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  typeOptionText: {
    fontSize: 13,
    fontWeight: '700',
    marginLeft: 6,
  },
  manageMemberProfileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    gap: 12,
  },
  manageMemberAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  manageMemberAvatarText: {
    fontSize: 18,
    fontWeight: '800',
  },
  manageMemberName: {
    fontSize: 15,
    fontWeight: '700',
  },
  manageMemberEmail: {
    fontSize: 12,
    marginTop: 2,
  },
  manageSectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 4,
  },
  manageActionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    gap: 12,
  },
  manageActionIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  manageActionTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 2,
  },
  manageActionDesc: {
    fontSize: 12,
    lineHeight: 16,
  },
  warningBox: {
    flexDirection: 'row',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    gap: 12,
    alignItems: 'flex-start',
  },
  warningBoxTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 4,
  },
  warningBoxDesc: {
    fontSize: 12,
    lineHeight: 18,
  },
  pendingContainer: {
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 16,
  },
  pendingHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  pendingSectionTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  pendingDescription: {
    fontSize: 12,
    marginBottom: 12,
  },
  pendingReqCard: {
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
  },
  pendingReqInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  approvalButtonsRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  approveActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 7,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  approveActionBtnText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '700',
  },
  rejectActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  rejectActionBtnText: {
    fontSize: 11,
    fontWeight: '600',
  },
  chipPendingBadge: {
    backgroundColor: '#F59E0B',
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    marginLeft: 6,
  },
  chipPendingBadgeText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '800',
  },
});
