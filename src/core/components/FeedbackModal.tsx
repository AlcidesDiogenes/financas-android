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

export interface FeedbackModalProps {
  visible: boolean;
  type?: 'success' | 'info' | 'warning' | 'error';
  iconName?: keyof typeof Ionicons.glyphMap;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel?: () => void;
}

export const FeedbackModal: React.FC<FeedbackModalProps> = ({
  visible,
  type = 'success',
  iconName,
  title,
  message,
  confirmText = 'Entendido',
  cancelText,
  onConfirm,
  onCancel,
}) => {
  const { theme, isDark } = useTheme();

  if (!visible) return null;

  const getIconConfig = () => {
    switch (type) {
      case 'success':
        return {
          defaultIcon: 'checkmark-circle' as keyof typeof Ionicons.glyphMap,
          color: theme.success || '#10B981',
          bg: isDark ? '#064E3B' : '#ECFDF5',
        };
      case 'info':
        return {
          defaultIcon: 'information-circle' as keyof typeof Ionicons.glyphMap,
          color: theme.primary || '#2563EB',
          bg: isDark ? '#1E293B' : '#EFF6FF',
        };
      case 'warning':
        return {
          defaultIcon: 'alert-circle' as keyof typeof Ionicons.glyphMap,
          color: theme.warning || '#F59E0B',
          bg: isDark ? '#451A03' : '#FEF3C7',
        };
      case 'error':
        return {
          defaultIcon: 'close-circle' as keyof typeof Ionicons.glyphMap,
          color: theme.danger || '#EF4444',
          bg: isDark ? '#450A0A' : '#FEF2F2',
        };
    }
  };

  const iconConfig = getIconConfig();
  const selectedIcon = iconName || iconConfig.defaultIcon;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onCancel || onConfirm}
    >
      <View style={styles.modalOverlay}>
        <TouchableOpacity
          style={StyleSheet.absoluteFill}
          activeOpacity={1}
          onPress={onCancel || onConfirm}
        />
        <View
          style={[
            styles.modalCard,
            { backgroundColor: theme.card, borderColor: theme.border },
          ]}
        >
          {/* Círculo com Ícone no Topo */}
          <View style={styles.iconWrapper}>
            <View
              style={[
                styles.iconCircle,
                { backgroundColor: iconConfig.bg },
              ]}
            >
              <Ionicons
                name={selectedIcon}
                size={38}
                color={iconConfig.color}
              />
            </View>
          </View>

          {/* Título */}
          <Text style={[styles.title, { color: theme.text }]}>
            {title}
          </Text>

          {/* Mensagem Explicativa */}
          <Text style={[styles.message, { color: theme.textMuted }]}>
            {message}
          </Text>

          {/* Botões de Ação */}
          <View style={styles.actionsRow}>
            {cancelText && onCancel ? (
              <>
                <Button
                  title={cancelText}
                  variant="outline"
                  onPress={onCancel}
                  style={styles.cancelBtn}
                />
                <Button
                  title={confirmText}
                  onPress={onConfirm}
                  style={styles.confirmBtn}
                />
              </>
            ) : (
              <Button
                title={confirmText}
                onPress={onConfirm}
                style={styles.fullBtn}
              />
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalCard: {
    width: '100%',
    maxWidth: 380,
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  iconWrapper: {
    marginBottom: 16,
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
    letterSpacing: 0.2,
  },
  message: {
    fontSize: 14,
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: 24,
    paddingHorizontal: 8,
  },
  actionsRow: {
    flexDirection: 'row',
    width: '100%',
    alignItems: 'center',
    gap: 12,
  },
  fullBtn: {
    width: '100%',
  },
  cancelBtn: {
    flex: 1,
  },
  confirmBtn: {
    flex: 1,
  },
});
