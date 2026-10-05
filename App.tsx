import React, { useState, useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ThemeProvider, useTheme } from './src/core/theme/ThemeContext';
import { PrivacyProvider } from './src/core/theme/PrivacyContext';
import { AuthProvider, useAuth } from './src/services/auth/AuthContext';
import { SecurityProvider } from './src/services/security/SecurityContext';
import { WorkspaceProvider } from './src/modules/workspaces/WorkspaceContext';
import { FinanceProvider } from './src/modules/FinanceContext';
import { MainNavigator } from './src/navigation/MainNavigator';
import { AuthScreen } from './src/screens/AuthScreen';
import { OnboardingScreen, ONBOARDING_COMPLETED_KEY } from './src/screens/OnboardingScreen';

const MainAppContent: React.FC = () => {
  const { isDark } = useTheme();
  const { user } = useAuth();
  const [onboardingDone, setOnboardingDone] = useState<boolean | null>(null);

  const onboardingKey = user?.id
    ? `@financas:onboarding_completed_${user.id}`
    : '@financas:onboarding_completed_guest';

  useEffect(() => {
    checkOnboarding();
  }, [onboardingKey]);

  const checkOnboarding = async () => {
    try {
      const val = await AsyncStorage.getItem(onboardingKey);
      setOnboardingDone(val === 'true');
    } catch {
      setOnboardingDone(true);
    }
  };

  const handleFinish = async () => {
    try {
      await AsyncStorage.setItem(onboardingKey, 'true');
    } catch {}
    setOnboardingDone(true);
  };

  if (onboardingDone === null) {
    return null;
  }

  if (!onboardingDone) {
    return (
      <>
        <StatusBar style={isDark ? 'light' : 'dark'} />
        <OnboardingScreen onFinish={handleFinish} />
      </>
    );
  }

  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <MainNavigator />
    </>
  );
};

const ThemedApp: React.FC = () => {
  const { isDark } = useTheme();
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return null;
  }

  if (!isAuthenticated) {
    return (
      <>
        <StatusBar style={isDark ? 'light' : 'dark'} />
        <AuthScreen />
      </>
    );
  }

  return (
    <WorkspaceProvider>
      <FinanceProvider>
        <MainAppContent />
      </FinanceProvider>
    </WorkspaceProvider>
  );
};

export default function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <PrivacyProvider>
          <AuthProvider>
            <SecurityProvider>
              <ThemedApp />
            </SecurityProvider>
          </AuthProvider>
        </PrivacyProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
