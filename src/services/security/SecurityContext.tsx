import React, { createContext, useContext, useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
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

export const SecurityProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { theme } = useTheme();
  const [isBiometricsEnabled, setIsBiometricsEnabled] = useState(false);
  const [isHardwareSupported, setIsHardwareSupported] = useState(false);
  const [isLocked, setIsLocked] = useState(false);

  useEffect(() => {
    checkSupportAndLock();
  }, []);

  const checkSupportAndLock = async () => {
    const supported = await BiometricsService.isHardwareSupported();
    setIsHardwareSupported(supported);
    if (supported) {
      const enabled = await BiometricsService.isBiometricsEnabled();
      setIsBiometricsEnabled(enabled);
      if (enabled) {
        setIsLocked(true);
        // Prompt unlock immediately
        const success = await BiometricsService.authenticate();
        if (success) {
          setIsLocked(false);
        }
      }
    }
  };

  const unlockApp = async () => {
    const success = await BiometricsService.authenticate();
    if (success) {
      setIsLocked(false);
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
      {isLocked ? (
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
