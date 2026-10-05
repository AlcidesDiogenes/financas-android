import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
  StyleProp,
} from 'react-native';
import { useTheme } from '../theme/ThemeContext';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'danger' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  disabled?: boolean;
  icon?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

export const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  icon,
  style,
}) => {
  const { theme } = useTheme();

  const getContainerStyle = (): ViewStyle => {
    let bg = theme.primary;
    let border = 'transparent';

    if (variant === 'secondary') {
      bg = theme.surfaceVariant;
    } else if (variant === 'danger') {
      bg = theme.danger;
    } else if (variant === 'outline') {
      bg = 'transparent';
      border = theme.border;
    } else if (variant === 'ghost') {
      bg = 'transparent';
    }

    const paddingVertical = size === 'sm' ? 8 : size === 'lg' ? 16 : 12;
    const paddingHorizontal = size === 'sm' ? 12 : size === 'lg' ? 24 : 16;

    return {
      backgroundColor: bg,
      borderColor: border,
      borderWidth: variant === 'outline' ? 1 : 0,
      paddingVertical,
      paddingHorizontal,
      opacity: disabled || loading ? 0.6 : 1,
    };
  };

  const getTextStyle = (): TextStyle => {
    let color = '#FFFFFF';
    if (variant === 'secondary') {
      color = theme.text;
    } else if (variant === 'outline' || variant === 'ghost') {
      color = theme.text;
    }

    const fontSize = size === 'sm' ? 13 : size === 'lg' ? 16 : 15;

    return {
      color,
      fontSize,
      fontWeight: '600',
    };
  };

  return (
    <TouchableOpacity
      activeOpacity={0.75}
      style={[styles.base, getContainerStyle(), style]}
      onPress={onPress}
      disabled={disabled || loading}
    >
      {loading ? (
        <ActivityIndicator size="small" color={variant === 'outline' ? theme.text : '#FFF'} />
      ) : (
        <>
          {icon}
          <Text style={[getTextStyle(), icon ? styles.textWithIcon : null]}>{title}</Text>
        </>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  base: {
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  textWithIcon: {
    marginLeft: 8,
  },
});
