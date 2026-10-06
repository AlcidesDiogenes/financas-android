import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../core/theme/ThemeContext';
import { useAuth } from '../../../services/auth/AuthContext';
import { Input } from '../../../core/components/Input';
import { Button } from '../../../core/components/Button';

interface EditProfileModalProps {
  visible: boolean;
  initialName: string;
  onClose: () => void;
}

export const EditProfileModal: React.FC<EditProfileModalProps> = ({
  visible,
  initialName,
  onClose,
}) => {
  const { theme } = useTheme();
  const { updateProfile } = useAuth();

  const [name, setName] = useState(initialName);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (visible) {
      setName(initialName);
      setError('');
    }
  }, [visible, initialName]);

  const handleSubmit = async () => {
    if (!name.trim()) {
      setError('Informe seu nome ou apelido');
      return;
    }

    try {
      setLoading(true);
      setError('');
      const res = await updateProfile(name.trim());
      if (res.success) {
        onClose();
        Alert.alert('Sucesso ✨', 'Seu nome de usuário foi atualizado com sucesso!');
      } else {
        setError(res.error || 'Não foi possível atualizar o nome.');
      }
    } catch {
      setError('Erro ao atualizar nome.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
        style={styles.modalOverlay}
      >
        <TouchableOpacity
          style={StyleSheet.absoluteFill}
          activeOpacity={1}
          onPress={onClose}
        />
        <ScrollView
          contentContainerStyle={styles.scrollModalContent}
          keyboardShouldPersistTaps="handled"
          bounces={false}
        >
          <View
            style={[
              styles.modalCard,
              { backgroundColor: theme.surface, borderColor: theme.border },
            ]}
          >
            <View style={styles.modalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.modalTitle, { color: theme.text }]}>
                  Editar Perfil 👤
                </Text>
                <Text style={[styles.modalSubtitle, { color: theme.textMuted }]}>
                  Altere o nome exibido nos seus espaços e relatórios
                </Text>
              </View>
              <TouchableOpacity
                onPress={onClose}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="close" size={22} color={theme.textMuted} />
              </TouchableOpacity>
            </View>

            <Input
              label="Nome de Usuário"
              placeholder="Digite seu nome completo ou apelido"
              value={name}
              onChangeText={(val) => {
                setName(val);
                if (error) setError('');
              }}
              autoCapitalize="words"
              error={error}
            />

            <View style={styles.modalActions}>
              <Button
                title="Cancelar"
                variant="outline"
                onPress={onClose}
                style={{ flex: 1, marginRight: 8 }}
              />
              <Button
                title="Salvar Nome"
                loading={loading}
                onPress={handleSubmit}
                style={{ flex: 1 }}
              />
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
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
  scrollModalContent: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  modalCard: {
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  modalSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  modalActions: {
    flexDirection: 'row',
    marginTop: 12,
  },
});
