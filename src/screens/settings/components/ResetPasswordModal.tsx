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

interface ResetPasswordModalProps {
  visible: boolean;
  onClose: () => void;
}

export const ResetPasswordModal: React.FC<ResetPasswordModalProps> = ({
  visible,
  onClose,
}) => {
  const { theme } = useTheme();
  const { setNewPassword } = useAuth();

  const [newPassword, setNewPasswordVal] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [newPasswordError, setNewPasswordError] = useState('');
  const [confirmPasswordError, setConfirmPasswordError] = useState('');
  const [generalError, setGeneralError] = useState('');

  const resetForm = () => {
    setNewPasswordVal('');
    setConfirmPassword('');
    setShowPassword(false);
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

    if (!newPassword) {
      setNewPasswordError('Informe a nova senha');
      hasErr = true;
    } else if (newPassword.length < 6) {
      setNewPasswordError('A nova senha deve ter no mínimo 6 caracteres');
      hasErr = true;
    } else {
      setNewPasswordError('');
    }

    if (!confirmPassword) {
      setConfirmPasswordError('Confirme sua nova senha');
      hasErr = true;
    } else if (newPassword !== confirmPassword) {
      setConfirmPasswordError('As senhas não coincidem');
      hasErr = true;
    } else {
      setConfirmPasswordError('');
    }

    if (hasErr) return;

    setLoading(true);
    setGeneralError('');

    try {
      const res = await setNewPassword(newPassword);
      setLoading(false);

      if (res.success) {
        Alert.alert(
          'Senha Redefinida! 🎉',
          'Sua nova senha foi cadastrada com sucesso. Você já está conectado ao Finanças!',
          [{ text: 'Continuar', onPress: handleClose }]
        );
      } else {
        setGeneralError(res.error || 'Não foi possível redefinir a senha.');
      }
    } catch {
      setLoading(false);
      setGeneralError('Erro ao salvar nova senha. Tente novamente.');
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
            {/* Ícone e Cabeçalho */}
            <View style={styles.headerRow}>
              <View
                style={[
                  styles.iconCircle,
                  { backgroundColor: `${theme.primary}18` },
                ]}
              >
                <Ionicons name="key-outline" size={28} color={theme.primary} />
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={[styles.modalTitle, { color: theme.text }]}>
                  Cadastrar Nova Senha 🔑
                </Text>
                <Text style={[styles.modalSubtitle, { color: theme.textMuted }]}>
                  Informe sua nova senha para restaurar seu acesso
                </Text>
              </View>
              <TouchableOpacity
                onPress={handleClose}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="close" size={22} color={theme.textMuted} />
              </TouchableOpacity>
            </View>

            {/* Input Nova Senha */}
            <View style={{ position: 'relative' }}>
              <Input
                label="Nova Senha"
                placeholder="Mínimo 6 caracteres"
                secureTextEntry={!showPassword}
                value={newPassword}
                onChangeText={(val) => {
                  setNewPasswordVal(val);
                  if (newPasswordError) setNewPasswordError('');
                  if (generalError) setGeneralError('');
                }}
                error={newPasswordError}
              />
              <TouchableOpacity
                style={styles.eyeBtn}
                onPress={() => setShowPassword((prev) => !prev)}
              >
                <Ionicons
                  name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={20}
                  color={theme.textMuted}
                />
              </TouchableOpacity>
            </View>

            {/* Input Confirmar Nova Senha */}
            <Input
              label="Confirmar Nova Senha"
              placeholder="Digite a mesma senha"
              secureTextEntry={!showPassword}
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
                disabled={loading}
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
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    padding: 16,
  },
  scrollModalContent: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  modalCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 6,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 18,
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  modalSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  eyeBtn: {
    position: 'absolute',
    right: 12,
    top: 36,
    padding: 4,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 10,
    marginBottom: 14,
    gap: 8,
  },
  errorText: {
    fontSize: 13,
    fontWeight: '500',
    flex: 1,
  },
  modalActions: {
    flexDirection: 'row',
    marginTop: 10,
  },
});
