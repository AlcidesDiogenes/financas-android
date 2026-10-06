import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Share,
  Modal,
} from 'react-native';
import { useTheme } from '../core/theme/ThemeContext';
import { useAuth } from '../services/auth/AuthContext';
import { useWorkspace } from '../modules/workspaces/WorkspaceContext';
import { WorkspaceRole } from '../modules/workspaces/types';
import { Card } from '../core/components/Card';
import { Badge } from '../core/components/Badge';
import { Button } from '../core/components/Button';
import { Input } from '../core/components/Input';
import { ModalContainer } from '../core/components/ModalContainer';
import { AuthScreen } from './AuthScreen';
import { Ionicons } from '@expo/vector-icons';

export const WorkspacesScreen: React.FC = () => {
  const { theme } = useTheme();
  const { user } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const {
    workspaces,
    activeWorkspace,
    defaultWorkspaceId,
    setActiveWorkspace,
    setDefaultWorkspace,
    createWorkspace,
    addMember,
    updateMemberRole,
    removeMember,
    renameWorkspace,
    transferOwnership,
    deleteWorkspace,
    leaveWorkspace,
    joinWorkspaceByCode,
    currentUserRole,
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
          onPress: async () => {
            const res = await deleteWorkspace(activeWorkspace.id);
            if (res.success) {
              Alert.alert('Sucesso', res.message);
            } else {
              Alert.alert('Aviso', res.message);
            }
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
    await createWorkspace(newWsName.trim(), newWsDesc.trim(), newWsIsShared);
    setNewWsName('');
    setNewWsDesc('');
    setCreateModalVisible(false);
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

    await addMember(activeWorkspace.id, memberName.trim(), memberEmail.trim(), memberRole);
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
          onPress: async () => {
            const res = await leaveWorkspace(activeWorkspace.id);
            if (res.success) {
              Alert.alert('Sucesso', res.message);
            } else {
              Alert.alert('Aviso', res.message);
            }
          },
        },
      ]
    );
  };

  const handleManageMemberRole = (member: { id: string; name: string; email: string; role: WorkspaceRole }) => {
    if (currentUserRole !== 'owner') return;

    Alert.alert(
      `Permissões de ${member.name}`,
      `Escolha o nível de acesso ou transfira a titularidade do espaço:`,
      [
        {
          text: member.role === 'editor' ? 'Mudar para: Apenas Ver 👁️' : 'Mudar para: Pode Editar ✏️',
          onPress: async () => {
            const nextRole: WorkspaceRole = member.role === 'editor' ? 'viewer' : 'editor';
            await updateMemberRole(activeWorkspace.id, member.id, nextRole);
          },
        },
        {
          text: '👑 Transferir Propriedade',
          onPress: () => {
            Alert.alert(
              'Transferir Propriedade do Espaço?',
              `Deseja transferir a titularidade de "${activeWorkspace.name}" para ${member.name} (${member.email})?\n\nVocê deixará de ser o proprietário e passará a ser um membro editor. Apenas o novo proprietário poderá gerenciar o espaço ou excluí-lo.`,
              [
                { text: 'Cancelar', style: 'cancel' },
                {
                  text: 'Confirmar Transferência',
                  style: 'destructive',
                  onPress: async () => {
                    const res = await transferOwnership(activeWorkspace.id, member.email);
                    if (res.success) {
                      Alert.alert('Sucesso 🎉', res.message);
                    } else {
                      Alert.alert('Aviso', res.message);
                    }
                  },
                },
              ]
            );
          },
        },
        { text: 'Cancelar', style: 'cancel' },
      ]
    );
  };

  const handleConfirmRemoveMember = (memberId: string, memberName: string) => {
    Alert.alert(
      'Remover Membro',
      `Deseja remover o acesso de ${memberName} deste espaço?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Remover',
          style: 'destructive',
          onPress: () => removeMember(activeWorkspace.id, memberId),
        },
      ]
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
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

              return (
                <TouchableOpacity
                  key={ws.id}
                  activeOpacity={0.7}
                  onPress={() => setActiveWorkspace(ws.id)}
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
                  onPress={() => {
                    setDefaultWorkspace(activeWorkspace.id);
                    Alert.alert('Espaço Padrão Definido! ⭐', `"${activeWorkspace.name}" agora é o seu espaço padrão. Ele será aberto automaticamente ao entrar no app.`);
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

              <TouchableOpacity
                style={[styles.shareBtn, { backgroundColor: theme.primary }]}
                onPress={handleShareCode}
                activeOpacity={0.8}
              >
                <Ionicons name="share-social-outline" size={15} color="#FFF" style={{ marginRight: 6 }} />
                <Text style={styles.shareBtnText}>Compartilhar</Text>
              </TouchableOpacity>
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
        {!isSolo && (
          <View style={styles.membersSection}>
            <View style={styles.sectionHeaderRow}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>
                Pessoas com Acesso ({activeWorkspace.members.length})
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

            {activeWorkspace.members.map((member) => {
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
                          onPress={() => handleConfirmRemoveMember(member.id, member.name)}
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
        )}

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
          placeholder="Ex: FIN-7842"
          autoCapitalize="characters"
          value={joinCode}
          onChangeText={(val) => {
            setJoinCode(val);
            if (joinCodeError) setJoinCodeError('');
          }}
          error={joinCodeError}
        />
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
            await renameWorkspace(activeWorkspace.id, renameValue.trim());
            setRenameModalVisible(false);
          }}
          style={{ marginTop: 8 }}
        />
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
});
