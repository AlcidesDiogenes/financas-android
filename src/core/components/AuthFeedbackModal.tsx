import React from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import { Button } from './Button';

interface AuthFeedbackModalProps {
  visible: boolean;
  type?: 'reset_password' | 'email_confirmation';
  title?: string;
  email?: string;
  subtitle?: string;
  hintText?: string;
  buttonText?: string;
  onConfirm: () => void;
}

export const AuthFeedbackModal: React.FC<AuthFeedbackModalProps> = ({
  visible,
  type = 'reset_password',
  title,
  email,
  subtitle,
  hintText,
  buttonText,
  onConfirm,
}) => {
  const { theme, isDark } = useTheme();

  if (!visible) return null;

  const defaultTitle =
    type === 'reset_password'
      ? 'E-mail Enviado! 📬'
      : 'Quase lá! Confirme seu E-mail 📬';

  const defaultSubtitle =
    type === 'reset_password'
      ? 'Enviamos um link seguro de redefinição de senha para:'
      : 'Enviamos um link de ativação da sua conta para:';

  const defaultHint =
    type === 'reset_password'
      ? 'Verifique sua caixa de entrada (e a pasta de spam). Ao tocar no link, o app abrirá automaticamente para você cadastrar sua nova senha.'
      : 'Abra seu e-mail e clique no link de confirmação para ativar sua conta antes de realizar o login.';

  const defaultBtnText =
    type === 'reset_password' ? 'Ir para Entrar' : 'Entendi, ir para Login';

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onConfirm}
    >
      <View style={styles.modalOverlay}>
        <TouchableOpacity
          style={StyleSheet.absoluteFill}
          activeOpacity={1}
          onPress={onConfirm}
        />
        <View
          style={[
            styles.modalCard,
            { backgroundColor: theme.card, borderColor: theme.border },
          ]}
        >
          {/* Ícone no Topo */}
          <View style={styles.iconWrapper}>
            <View
              style={[
                styles.iconCircle,
                {
                  backgroundColor: isDark ? '#1E293B' : '#E0F2FE',
                },
              ]}
            >
              <Ionicons
                name={type === 'reset_password' ? 'mail-open' : 'paper-plane'}
                size={34}
                color={theme.primary}
              />
            </View>
          </View>

          {/* Título */}
          <Text style={[styles.title, { color: theme.text }]}>
            {title || defaultTitle}
          </Text>

          {/* Subtítulo */}
          <Text style={[styles.subtitle, { color: theme.textMuted }]}>
            {subtitle || defaultSubtitle}
          </Text>

          {/* Destinatário / Badge de E-mail */}
          {email ? (
            <View
              style={[
                styles.emailBadge,
                {
                  backgroundColor: theme.surfaceVariant,
                  borderColor: theme.border,
                },
              ]}
            >
              <Ionicons
                name="mail-outline"
                size={17}
                color={theme.primary}
                style={{ marginRight: 8 }}
              />
              <Text
                style={[styles.emailText, { color: theme.text }]}
                numberOfLines={1}
                ellipsizeMode="middle"
              >
                {email}
              </Text>
            </View>
          ) : null}

          {/* Caixa de Orientação e Dica */}
          <View
            style={[
              styles.hintBox,
              {
                backgroundColor: isDark ? '#1F2937' : '#F8FAFC',
                borderColor: isDark ? '#374151' : '#E2E8F0',
              },
            ]}
          >
            <Ionicons
              name="information-circle-outline"
              size={18}
              color={theme.primary}
              style={{ marginRight: 8, marginTop: 1 }}
            />
            <Text style={[styles.hintText, { color: theme.textMuted }]}>
              {hintText || defaultHint}
            </Text>
          </View>

          {/* Botão de Ação */}
          <Button
            title={buttonText || defaultBtnText}
            onPress={onConfirm}
            style={styles.actionBtn}
          />
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalCard: {
    width: '100%',
    maxWidth: 380,
    borderRadius: 24,
    borderWidth: 1,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 8,
  },
  iconWrapper: {
    marginBottom: 16,
  },
  iconCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
    marginBottom: 14,
    paddingHorizontal: 8,
  },
  emailBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 14,
  },
  emailText: {
    fontSize: 14,
    fontWeight: '700',
    flexShrink: 1,
  },
  hintBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    width: '100%',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 20,
  },
  hintText: {
    fontSize: 12,
    lineHeight: 17,
    flex: 1,
  },
  actionBtn: {
    width: '100%',
  },
});
