import React from 'react';
import { View, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { useTheme } from '../theme/ThemeContext';

interface ProgressBarProps {
  progress: number; // 0 to 1 (or > 1 for overflow)
  color?: string;
  height?: number;
  style?: StyleProp<ViewStyle>;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  progress,
  color,
  height = 8,
  style,
}) => {
  const { theme } = useTheme();

  const clampedProgress = Math.min(Math.max(progress, 0), 1);
  const isOver = progress > 1;

  const barColor = isOver
    ? theme.danger
    : color || (clampedProgress >= 0.85 ? theme.warning : theme.primary);

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.surfaceVariant,
          height,
          borderRadius: height / 2,
        },
        style,
      ]}
    >
      <View
        style={[
          styles.fill,
          {
            width: `${clampedProgress * 100}%`,
            backgroundColor: barColor,
            borderRadius: height / 2,
          },
        ]}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
  },
});
