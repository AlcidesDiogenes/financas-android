import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { AppState, View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { BiometricsService } from './BiometricsService';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../core/theme/ThemeContext';

interface SecurityContextType {
  isBiometricsEnabled: boolean;
  isHardwareSupported: boolean;
  toggleBiometrics: () => Promise<boolean>;
  isLocked: boolean;
  unlockApp: () => Promise<void>;
}

const SecurityContext = createContext<SecurityContextType | undefined>(undefined);

// Tempo em segundo plano a partir do qual o app volta a pedir a biometria.
// O próprio diálogo de biometria e o compartilhamento de arquivos mandam o app para o
// segundo plano por instantes; o limite evita um ciclo de bloqueios.
const RELOCK_AFTER_BACKGROUND_MS = 30 * 1000;

export const SecurityProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { theme } = useTheme();
  const [isBiometricsEnabled, setIsBiometricsEnabled] = useState(false);
  const [isHardwareSupported, setIsHardwareSupported] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  // Enquanto verifica a preferência de biometria, não mostra os dados (evita o "flash" antes do bloqueio)
  const [isChecking, setIsChecking] = useState(true);
  const isBiometricsEnabledRef = useRef(false);
  const isAuthenticatingRef = useRef(false);
  const backgroundAtRef = useRef<number | null>(null);

  useEffect(() => {
    checkSupportAndLock();
  }, []);

  useEffect(() => {
    isBiometricsEnabledRef.current = isBiometricsEnabled;
  }, [isBiometricsEnabled]);

  // Volta a bloquear quando o app retorna depois de um tempo em segundo plano
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'background') {
        if (!isAuthenticatingRef.current) backgroundAtRef.current = Date.now();
        return;
      }
      if (nextState !== 'active') return;

      const backgroundAt = backgroundAtRef.current;
      backgroundAtRef.current = null;
      if (
        isBiometricsEnabledRef.current &&
        backgroundAt !== null &&
        Date.now() - backgroundAt >= RELOCK_AFTER_BACKGROUND_MS
      ) {
        setIsLocked(true);
        unlockApp();
      }
    });
    return () => subscription.remove();
  }, []);

  const checkSupportAndLock = async () => {
    try {
      const supported = await BiometricsService.isHardwareSupported();
      setIsHardwareSupported(supported);
      if (supported) {
        const enabled = await BiometricsService.isBiometricsEnabled();
        setIsBiometricsEnabled(enabled);
        isBiometricsEnabledRef.current = enabled;
        if (enabled) {
          setIsLocked(true);
          setIsChecking(false);
          // Prompt unlock immediately
          await unlockApp();
        }
      }
    } finally {
      setIsChecking(false);
    }
  };

  const unlockApp = async () => {
    if (isAuthenticatingRef.current) return;
    isAuthenticatingRef.current = true;
    try {
      const success = await BiometricsService.authenticate();
      if (success) {
        setIsLocked(false);
      }
    } finally {
      isAuthenticatingRef.current = false;
    }
  };

  const toggleBiometrics = async (): Promise<boolean> => {
    if (!isHardwareSupported) return false;
    const nextState = !isBiometricsEnabled;
    if (nextState) {
      // Must authenticate first before enabling
      const success = await BiometricsService.authenticate('Confirme sua biometria para ativar a proteção');
      if (!success) return false;
    }
    await BiometricsService.setBiometricsEnabled(nextState);
    setIsBiometricsEnabled(nextState);
    return true;
  };

  return (
    <SecurityContext.Provider
      value={{
        isBiometricsEnabled,
        isHardwareSupported,
        toggleBiometrics,
        isLocked,
        unlockApp,
      }}
    >
      {isChecking ? (
        <View style={[styles.lockScreen, { backgroundColor: theme.background }]} />
      ) : isLocked ? (
        <View style={[styles.lockScreen, { backgroundColor: theme.background }]}>
          <View style={[styles.lockIconCircle, { backgroundColor: theme.surfaceVariant }]}>
            <Ionicons name="finger-print" size={64} color={theme.primary} />
          </View>
          <Text style={[styles.lockTitle, { color: theme.text }]}>Finanças Bloqueado</Text>
          <Text style={[styles.lockSubtitle, { color: theme.textMuted }]}>
            Autentique-se com sua digital para continuar
          </Text>

          <TouchableOpacity
            style={[styles.unlockBtn, { backgroundColor: theme.primary }]}
            onPress={unlockApp}
            activeOpacity={0.8}
          >
            <Ionicons name="key-outline" size={20} color="#FFF" />
            <Text style={styles.unlockBtnText}>Desbloquear App</Text>
          </TouchableOpacity>
        </View>
      ) : (
        children
      )}
    </SecurityContext.Provider>
  );
};

export const useSecurity = (): SecurityContextType => {
  const context = useContext(SecurityContext);
  if (!context) {
    throw new Error('useSecurity must be used within a SecurityProvider');
  }
  return context;
};

const styles = StyleSheet.create({
  lockScreen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  lockIconCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  lockTitle: {
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 8,
  },
  lockSubtitle: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 32,
  },
  unlockBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 14,
  },
  unlockBtnText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
    marginLeft: 8,
  },
});
