import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useTheme } from '../core/theme/ThemeContext';
import { useWorkspace } from '../modules/workspaces/WorkspaceContext';
import { WorkspaceRole } from '../modules/workspaces/types';
import { Card } from '../core/components/Card';
import { Badge } from '../core/components/Badge';
import { Button } from '../core/components/Button';
import { Input } from '../core/components/Input';
import { ModalContainer } from '../core/components/ModalContainer';
import { Ionicons } from '@expo/vector-icons';

export const WorkspacesScreen: React.FC = () => {
  const { theme } = useTheme();
  const {
    workspaces,
    activeWorkspace,
    setActiveWorkspace,
    createWorkspace,
    addMember,
    updateMemberRole,
    removeMember,
    currentUserRole,
  } = useWorkspace();

  // Create Workspace Modal
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [newWsName, setNewWsName] = useState('');
  const [newWsDesc, setNewWsDesc] = useState('');
  const [newWsIsShared, setNewWsIsShared] = useState(true);

  // Add Member Modal
  const [memberModalVisible, setMemberModalVisible] = useState(false);
  const [memberName, setMemberName] = useState('');
  const [memberEmail, setMemberEmail] = useState('');
  const [memberRole, setMemberRole] = useState<WorkspaceRole>('editor');

  const handleCreateWorkspace = async () => {
    if (!newWsName.trim()) {
      return;
    }
    await createWorkspace(newWsName.trim(), newWsDesc.trim(), newWsIsShared);
    setNewWsName('');
    setNewWsDesc('');
    setCreateModalVisible(false);
  };

  const handleAddMember = async () => {
    if (!memberName.trim() || !memberEmail.trim()) {
      return;
    }
    await addMember(activeWorkspace.id, memberName.trim(), memberEmail.trim(), memberRole);
    setMemberName('');
    setMemberEmail('');
    setMemberRole('editor');
    setMemberModalVisible(false);
  };

  const handleToggleRole = async (memberId: string, currentRole: WorkspaceRole) => {
    const nextRole: WorkspaceRole = currentRole === 'editor' ? 'viewer' : 'editor';
    await updateMemberRole(activeWorkspace.id, memberId, nextRole);
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Banner Explanatory */}
        <Card variant="flat" style={styles.bannerCard}>
          <View style={styles.bannerRow}>
            <Ionicons name="shield-checkmark" size={24} color={theme.primary} />
            <View style={styles.bannerText}>
              <Text style={[styles.bannerTitle, { color: theme.text }]}>
                Modo Solo vs. Modo Compartilhado
              </Text>
              <Text style={[styles.bannerSub, { color: theme.textMuted }]}>
                Você pode alternar entre suas finanças estritamente privadas ou um espaço
                colaborativo com outra pessoa (com permissão de apenas ver ou também editar).
              </Text>
            </View>
          </View>
        </Card>

        {/* Workspaces List */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>
            Seus Espaços de Trabalho
          </Text>
        </View>

        {workspaces.map((ws) => {
          const isActive = ws.id === activeWorkspace.id;
          const isSolo = ws.type === 'solo';

          return (
            <TouchableOpacity
              key={ws.id}
              activeOpacity={0.8}
              onPress={() => setActiveWorkspace(ws.id)}
            >
              <Card
                variant={isActive ? 'outlined' : 'flat'}
                style={[
                  styles.workspaceCard,
                  isActive && { borderColor: theme.primary, borderWidth: 2 },
                ]}
              >
                <View style={styles.wsHeader}>
                  <View style={styles.wsTitleRow}>
                    <Ionicons
                      name={isSolo ? 'person-circle' : 'people-circle'}
                      size={24}
                      color={isActive ? theme.primary : theme.textMuted}
                    />
                    <Text style={[styles.wsName, { color: theme.text }]}>
                      {ws.name}
                    </Text>
                  </View>

                  <Badge
                    label={isActive ? 'Ativo Agora' : 'Alternar'}
                    variant={isActive ? 'primary' : 'neutral'}
                  />
                </View>

                <Text style={[styles.wsDesc, { color: theme.textMuted }]}>
                  {ws.description}
                </Text>

                <View style={[styles.wsFooter, { borderTopColor: theme.border }]}>
                  <Text style={[styles.wsMeta, { color: theme.textMuted }]}>
                    {isSolo
                      ? '🔒 Somente você'
                      : `👥 ${ws.members.length} membro(s) cadastrado(s)`}
                  </Text>

                  {!isSolo && (
                    <Text style={[styles.codeBadge, { color: theme.primary }]}>
                      Código: {ws.inviteCode}
                    </Text>
                  )}
                </View>
              </Card>
            </TouchableOpacity>
          );
        })}

        <Button
          title="Criar Novo Espaço"
          variant="outline"
          icon={<Ionicons name="add-circle-outline" size={18} color={theme.text} />}
          onPress={() => setCreateModalVisible(true)}
          style={{ marginBottom: 24 }}
        />

        {/* Active Workspace Collaborators & Permissions Management */}
        {activeWorkspace.type === 'shared' && (
          <>
            <View style={styles.sectionHeader}>
              <View>
                <Text style={[styles.sectionTitle, { color: theme.text }]}>
                  Membros & Permissões ({activeWorkspace.name})
                </Text>
                <Text style={[styles.sectionSubtitle, { color: theme.textMuted }]}>
                  Defina quem pode apenas visualizar ou também editar
                </Text>
              </View>
            </View>

            {activeWorkspace.members.map((member) => (
              <Card key={member.id} variant="elevated" style={styles.memberCard}>
                <View style={styles.memberRow}>
                  <View style={styles.memberLeft}>
                    <View
                      style={[
                        styles.avatar,
                        { backgroundColor: member.isCurrentUser ? theme.primaryLight : theme.surfaceVariant },
                      ]}
                    >
                      <Ionicons
                        name="person"
                        size={18}
                        color={member.isCurrentUser ? theme.primary : theme.textMuted}
                      />
                    </View>
                    <View>
                      <Text style={[styles.memberName, { color: theme.text }]}>
                        {member.name} {member.isCurrentUser ? '(Você)' : ''}
                      </Text>
                      <Text style={[styles.memberEmail, { color: theme.textMuted }]}>
                        {member.email}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.memberRight}>
                    {member.role === 'owner' ? (
                      <Badge label="Proprietário" variant="primary" />
                    ) : (
                      <TouchableOpacity
                        onPress={() => handleToggleRole(member.id, member.role)}
                      >
                        <Badge
                          label={member.role === 'editor' ? 'Pode Editar ✏️' : 'Só Vê 👁️'}
                          variant={member.role === 'editor' ? 'success' : 'neutral'}
                        />
                      </TouchableOpacity>
                    )}

                    {!member.isCurrentUser && member.role !== 'owner' && (
                      <TouchableOpacity
                        onPress={() => removeMember(activeWorkspace.id, member.id)}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        style={{ marginLeft: 8 }}
                      >
                        <Ionicons name="close-circle-outline" size={20} color={theme.danger} />
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              </Card>
            ))}

            <Button
              title="Convidar Nova Pessoa"
              icon={<Ionicons name="person-add-outline" size={18} color="#FFF" />}
              onPress={() => setMemberModalVisible(true)}
              style={{ marginTop: 8 }}
            />
          </>
        )}
      </ScrollView>

      {/* Create Workspace Modal */}
      <ModalContainer
        visible={createModalVisible}
        onClose={() => setCreateModalVisible(false)}
        title="Novo Espaço Financeiro"
      >
        <Input
          label="Nome do Espaço"
          placeholder="Ex: Finanças Casal, Empresa MEI"
          value={newWsName}
          onChangeText={setNewWsName}
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

      {/* Add Member Modal */}
      <ModalContainer
        visible={memberModalVisible}
        onClose={() => setMemberModalVisible(false)}
        title="Liberar Acesso para Outra Pessoa"
      >
        <Input
          label="Nome do Convidado"
          placeholder="Ex: Maria Clara, João Pedro"
          value={memberName}
          onChangeText={setMemberName}
        />

        <Input
          label="E-mail"
          placeholder="exemplo@email.com"
          keyboardType="email-address"
          value={memberEmail}
          onChangeText={setMemberEmail}
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
  bannerCard: {
    padding: 16,
    marginBottom: 16,
  },
  bannerRow: {
    flexDirection: 'row',
  },
  bannerText: {
    marginLeft: 12,
    flex: 1,
  },
  bannerTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 4,
  },
  bannerSub: {
    fontSize: 12,
    lineHeight: 18,
  },
  sectionHeader: {
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
  },
  sectionSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  workspaceCard: {
    marginBottom: 12,
    padding: 16,
  },
  wsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  wsTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  wsName: {
    fontSize: 16,
    fontWeight: '700',
    marginLeft: 8,
  },
  wsDesc: {
    fontSize: 13,
    marginBottom: 12,
  },
  wsFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    paddingTop: 10,
  },
  wsMeta: {
    fontSize: 12,
  },
  codeBadge: {
    fontSize: 12,
    fontWeight: '700',
  },
  memberCard: {
    padding: 14,
    marginBottom: 8,
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  memberLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  memberName: {
    fontSize: 14,
    fontWeight: '700',
  },
  memberEmail: {
    fontSize: 12,
    marginTop: 1,
  },
  memberRight: {
    flexDirection: 'row',
    alignItems: 'center',
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
