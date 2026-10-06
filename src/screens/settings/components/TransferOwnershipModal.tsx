import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../core/theme/ThemeContext';
import { Button } from '../../../core/components/Button';

export interface PendingWorkspaceTransfer {
  workspaceId: string;
  workspaceName: string;
  members: { name: string; email: string }[];
}

interface TransferOwnershipModalProps {
  visible: boolean;
  pendingWorkspace: PendingWorkspaceTransfer | null;
  onConfirmTransfer: (newOwnerEmail: string) => Promise<void>;
  onDeleteWorkspace: () => Promise<void>;
  onClose: () => void;
}

export const TransferOwnershipModal: React.FC<TransferOwnershipModalProps> = ({
  visible,
  pendingWorkspace,
  onConfirmTransfer,
  onDeleteWorkspace,
  onClose,
}) => {
  const { theme } = useTheme();
  const [selectedEmail, setSelectedEmail] = useState('');

  const handleTransfer = async () => {
    if (!selectedEmail) {
      Alert.alert('Selecione um Membro', 'Por favor, toque em um membro da lista para transferir a liderança.');
      return;
    }
    await onConfirmTransfer(selectedEmail);
  };

  const handleDelete = () => {
    Alert.alert(
      'Excluir Espaço e Dados',
      `Tem certeza que deseja apagar o espaço "${pendingWorkspace?.workspaceName}" e todos os seus lançamentos? Os outros membros perderão o acesso.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Sim, Excluir Tudo',
          style: 'destructive',
          onPress: onDeleteWorkspace,
        },
      ]
    );
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={styles.modalOverlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <View
          style={[
            styles.modalCard,
            { backgroundColor: theme.surface, borderColor: theme.border },
          ]}
          onStartShouldSetResponder={() => true}
        >
          <View style={styles.modalHeader}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>
                Transferir Propriedade 👑
              </Text>
              <Text style={[styles.modalSubtitle, { color: theme.textMuted }]}>
                Você é o proprietário do espaço "{pendingWorkspace?.workspaceName}".
                Escolha o novo dono antes de excluir sua conta:
              </Text>
            </View>
            <TouchableOpacity
              onPress={onClose}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="close" size={22} color={theme.textMuted} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.membersList} bounces={false}>
            {pendingWorkspace?.members.map((m) => {
              const isSelected = selectedEmail === m.email;
              return (
                <TouchableOpacity
                  key={m.email}
                  style={[
                    styles.memberRow,
                    {
                      borderColor: isSelected ? theme.primary : theme.border,
                      backgroundColor: isSelected ? `${theme.primary}15` : theme.surfaceVariant,
                    },
                  ]}
                  onPress={() => setSelectedEmail(m.email)}
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
              onPress={handleTransfer}
            />
            <Button
              title="Excluir Espaço Junto"
              variant="danger"
              onPress={handleDelete}
            />
            <Button
              title="Cancelar"
              variant="outline"
              onPress={onClose}
            />
          </View>
        </View>
      </TouchableOpacity>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    maxHeight: '80%',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  modalSubtitle: {
    fontSize: 13,
    marginTop: 4,
    lineHeight: 18,
  },
  membersList: {
    maxHeight: 200,
    marginBottom: 16,
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 8,
  },
});
