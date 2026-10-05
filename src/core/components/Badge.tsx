import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../theme/ThemeContext';

interface BadgeProps {
  label: string;
  variant?: 'primary' | 'success' | 'danger' | 'warning' | 'info' | 'neutral';
  size?: 'sm' | 'md';
}

export const Badge: React.FC<BadgeProps> = ({ label, variant = 'primary', size = 'sm' }) => {
  const { theme } = useTheme();

  const getColors = () => {
    switch (variant) {
      case 'success':
        return { bg: theme.successLight, text: theme.success };
      case 'danger':
        return { bg: theme.dangerLight, text: theme.danger };
      case 'warning':
        return { bg: theme.warningLight, text: theme.warning };
      case 'info':
        return { bg: theme.infoLight, text: theme.info };
      case 'neutral':
        return { bg: theme.surfaceVariant, text: theme.textMuted };
      case 'primary':
      default:
        return { bg: theme.primaryLight, text: theme.primary };
    }
  };

  const { bg, text } = getColors();

  return (
    <View
      style={[
        styles.badge,
        { backgroundColor: bg },
        size === 'sm' ? styles.badgeSm : styles.badgeMd,
      ]}
    >
      <Text
        style={[
          styles.text,
          { color: text },
          size === 'sm' ? styles.textSm : styles.textMd,
        ]}
      >
        {label}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    borderRadius: 8,
    alignSelf: 'flex-start',
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeSm: {
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  badgeMd: {
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  text: {
    fontWeight: '700',
  },
  textSm: {
    fontSize: 11,
  },
  textMd: {
    fontSize: 13,
  },
});
