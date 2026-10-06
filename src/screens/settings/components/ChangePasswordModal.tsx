import React, { useState } from 'react';
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

interface ChangePasswordModalProps {
  visible: boolean;
  onClose: () => void;
}

export const ChangePasswordModal: React.FC<ChangePasswordModalProps> = ({
  visible,
  onClose,
}) => {
  const { theme } = useTheme();
  const { updatePassword } = useAuth();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [currentPasswordError, setCurrentPasswordError] = useState('');
  const [newPasswordError, setNewPasswordError] = useState('');
  const [confirmPasswordError, setConfirmPasswordError] = useState('');
  const [generalError, setGeneralError] = useState('');

  const resetForm = () => {
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setCurrentPasswordError('');
    setNewPasswordError('');
    setConfirmPasswordError('');
    setGeneralError('');
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSubmit = async () => {
    let hasErr = false;
    if (!currentPassword) {
      setCurrentPasswordError('Informe sua senha atual');
      hasErr = true;
    } else {
      setCurrentPasswordError('');
    }

    if (!newPassword || newPassword.length < 6) {
      setNewPasswordError('Mínimo de 6 caracteres');
      hasErr = true;
    } else {
      setNewPasswordError('');
    }

    if (newPassword !== confirmPassword) {
      setConfirmPasswordError('As senhas não coincidem');
      hasErr = true;
    } else {
      setConfirmPasswordError('');
    }

    if (hasErr) return;

    try {
      setLoading(true);
      setGeneralError('');
      const res = await updatePassword(currentPassword, newPassword);
      if (res.success) {
        handleClose();
        Alert.alert('Sucesso 🎉', 'Sua senha foi alterada com sucesso!');
      } else {
        setGeneralError(res.error || 'Não foi possível alterar a senha.');
      }
    } catch {
      setGeneralError('Erro ao atualizar senha.');
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
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
        style={styles.modalOverlay}
      >
        <TouchableOpacity
          style={StyleSheet.absoluteFill}
          activeOpacity={1}
          onPress={handleClose}
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
                  Alterar Senha 🔒
                </Text>
                <Text style={[styles.modalSubtitle, { color: theme.textMuted }]}>
                  Cadastre sua nova senha de acesso
                </Text>
              </View>
              <TouchableOpacity
                onPress={handleClose}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="close" size={22} color={theme.textMuted} />
              </TouchableOpacity>
            </View>

            <Input
              label="Senha Atual"
              placeholder="Digite sua senha atual"
              secureTextEntry
              value={currentPassword}
              onChangeText={(val) => {
                setCurrentPassword(val);
                if (currentPasswordError) setCurrentPasswordError('');
                if (generalError) setGeneralError('');
              }}
              error={currentPasswordError}
            />

            <Input
              label="Nova Senha"
              placeholder="Mínimo 6 caracteres"
              secureTextEntry
              value={newPassword}
              onChangeText={(val) => {
                setNewPassword(val);
                if (newPasswordError) setNewPasswordError('');
                if (generalError) setGeneralError('');
              }}
              error={newPasswordError}
            />

            <Input
              label="Confirmar Nova Senha"
              placeholder="Repita a nova senha"
              secureTextEntry
              value={confirmPassword}
              onChangeText={(val) => {
                setConfirmPassword(val);
                if (confirmPasswordError) setConfirmPasswordError('');
                if (generalError) setGeneralError('');
              }}
              error={confirmPasswordError}
            />

            {generalError ? (
              <View style={[styles.errorBox, { backgroundColor: theme.dangerLight }]}>
                <Ionicons name="alert-circle" size={16} color={theme.danger} />
                <Text style={[styles.errorText, { color: theme.danger }]}>
                  {generalError}
                </Text>
              </View>
            ) : null}

            <View style={styles.modalActions}>
              <Button
                title="Cancelar"
                variant="outline"
                onPress={handleClose}
                style={{ flex: 1, marginRight: 8 }}
              />
              <Button
                title="Salvar Senha"
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
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 8,
    marginBottom: 12,
    gap: 6,
  },
  errorText: {
    fontSize: 12,
    fontWeight: '500',
    flex: 1,
  },
  modalActions: {
    flexDirection: 'row',
    marginTop: 8,
  },
});
