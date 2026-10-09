import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  Animated,
  ActivityIndicator,
  StatusBar,
} from 'react-native';
import { useTheme } from '../theme/ThemeContext';

interface AppSplashScreenProps {
  visible: boolean;
  statusText?: string;
  onAnimationFinish?: () => void;
}

export const AppSplashScreen: React.FC<AppSplashScreenProps> = ({
  visible,
  statusText = 'Preparando seu espaço financeiro...',
  onAnimationFinish,
}) => {
  const { theme, isDark } = useTheme();
  const [shouldRender, setShouldRender] = useState(true);

  const opacityAnim = useRef(new Animated.Value(1)).current;
  const scaleAnim = useRef(new Animated.Value(0.96)).current;

  useEffect(() => {
    // Animação inicial de entrada sutil do logo
    Animated.spring(scaleAnim, {
      toValue: 1,
      friction: 7,
      tension: 40,
      useNativeDriver: true,
    }).start();
  }, []);

  useEffect(() => {
    if (!visible) {
      // Fade out suave quando o app termina a carga
      Animated.timing(opacityAnim, {
        toValue: 0,
        duration: 350,
        useNativeDriver: true,
      }).start(() => {
        setShouldRender(false);
        onAnimationFinish?.();
      });
    }
  }, [visible, onAnimationFinish]);

  if (!shouldRender) {
    return null;
  }

  return (
    <Animated.View
      pointerEvents={visible ? 'auto' : 'none'}
      style={[
        styles.container,
        {
          backgroundColor: theme.background,
          opacity: opacityAnim,
        },
      ]}
    >
      <StatusBar
        backgroundColor={theme.background}
        barStyle={isDark ? 'light-content' : 'dark-content'}
      />

      <Animated.View
        style={[
          styles.contentWrapper,
          {
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        {/* Ícone com borda e sombra elegante */}
        <View
          style={[
            styles.logoContainer,
            {
              backgroundColor: theme.surface,
              borderColor: theme.border,
              shadowColor: isDark ? '#000000' : '#1E293B',
            },
          ]}
        >
          <Image
            source={require('../../../assets/icon.png')}
            style={styles.logoImage}
            resizeMode="cover"
          />
        </View>

        {/* Nome do Aplicativo */}
        <Text style={[styles.brandName, { color: theme.text }]}>Finduo</Text>

        {/* Subtítulo / Slogan */}
        <Text style={[styles.brandTagline, { color: theme.textMuted }]}>
          Finanças compartilhadas e individuais
        </Text>
      </Animated.View>

      {/* Footer com Spinner e Status */}
      <View style={styles.footerContainer}>
        <ActivityIndicator size="small" color={theme.primary} />
        <Text style={[styles.statusText, { color: theme.textMuted }]}>
          {statusText}
        </Text>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 99999,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 10,
  },
  contentWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  logoContainer: {
    width: 104,
    height: 104,
    borderRadius: 26,
    overflow: 'hidden',
    borderWidth: 1,
    marginBottom: 20,
    elevation: 8,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoImage: {
    width: '100%',
    height: '100%',
  },
  brandName: {
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: 0.4,
    marginBottom: 6,
    textAlign: 'center',
  },
  brandTagline: {
    fontSize: 13,
    fontWeight: '500',
    letterSpacing: 0.2,
    textAlign: 'center',
    maxWidth: 260,
  },
  footerContainer: {
    position: 'absolute',
    bottom: 56,
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
    letterSpacing: 0.1,
  },
});
