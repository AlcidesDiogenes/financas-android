import React, { useState, useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ThemeProvider, useTheme } from './src/core/theme/ThemeContext';
import { PrivacyProvider } from './src/core/theme/PrivacyContext';
import { BottomBarBadgeProvider } from './src/core/theme/BottomBarBadgeContext';
import { SwipeActionProvider } from './src/core/theme/SwipeActionContext';
import { AuthProvider, useAuth } from './src/services/auth/AuthContext';
import { SecurityProvider } from './src/services/security/SecurityContext';
import { WorkspaceProvider } from './src/modules/workspaces/WorkspaceContext';
import { FinanceProvider } from './src/modules/FinanceContext';
import { MainNavigator } from './src/navigation/MainNavigator';
import { AuthScreen } from './src/screens/AuthScreen';
import { OnboardingScreen, ONBOARDING_COMPLETED_KEY } from './src/screens/OnboardingScreen';

import { WhatsNewModal } from './src/core/components/WhatsNewModal';
import { APP_VERSION_CONFIG, RELEASE_HISTORY, ReleaseNote } from './src/core/version';

const LAST_SEEN_VERSION_KEY = '@financas:last_seen_app_version';

const MainAppContent: React.FC = () => {
  const { isDark } = useTheme();
  const { user } = useAuth();
  const [onboardingDone, setOnboardingDone] = useState<boolean | null>(null);

  // Estados do Modal de Novidades (What's New)
  const [showWhatsNew, setShowWhatsNew] = useState(false);
  const [previousVersion, setPreviousVersion] = useState<string | null>(null);
  const [relevantReleaseNotes, setRelevantReleaseNotes] = useState<ReleaseNote[]>([]);

  const onboardingKey = user?.id
    ? `@financas:onboarding_v1_0_completed_${user.id}`
    : '@financas:onboarding_v1_0_completed_guest';

  useEffect(() => {
    checkOnboarding();
  }, [onboardingKey]);

  const checkOnboarding = async () => {
    try {
      const val = await AsyncStorage.getItem(onboardingKey);
      const isDone = val === 'true';
      setOnboardingDone(isDone);
      if (isDone) {
        checkAppUpdateNotes();
      }
    } catch {
      setOnboardingDone(true);
      checkAppUpdateNotes();
    }
  };

  const checkAppUpdateNotes = async () => {
    try {
      const lastSeen = await AsyncStorage.getItem(LAST_SEEN_VERSION_KEY);
      const currentVer = APP_VERSION_CONFIG.version;

      if (!lastSeen) {
        // Primeiro acesso do usuário com o sistema de notas de versão
        await AsyncStorage.setItem(LAST_SEEN_VERSION_KEY, currentVer);
      } else if (lastSeen !== currentVer) {
        // Versão mudou! Usuário acabou de atualizar o app.
        setPreviousVersion(lastSeen);

        // Filtra todas as notas entre a versão antiga e a nova
        const lastSeenIdx = RELEASE_HISTORY.findIndex((r) => r.version === lastSeen);
        let notesToShow: ReleaseNote[] = [];
        if (lastSeenIdx > 0) {
          notesToShow = RELEASE_HISTORY.slice(0, lastSeenIdx);
        } else {
          // Se a versão antiga for mais antiga que o histórico ou não encontrada, mostra a mais recente
          notesToShow = [RELEASE_HISTORY[0]];
        }

        setRelevantReleaseNotes(notesToShow);
        setShowWhatsNew(true);
      }
    } catch {}
  };

  const handleCloseWhatsNew = async () => {
    setShowWhatsNew(false);
    try {
      await AsyncStorage.setItem(LAST_SEEN_VERSION_KEY, APP_VERSION_CONFIG.version);
    } catch {}
  };

  const handleFinish = async () => {
    try {
      await AsyncStorage.setItem(onboardingKey, 'true');
      await AsyncStorage.setItem(LAST_SEEN_VERSION_KEY, APP_VERSION_CONFIG.version);
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
      <WhatsNewModal
        visible={showWhatsNew}
        onClose={handleCloseWhatsNew}
        previousVersion={previousVersion}
        releaseNotes={relevantReleaseNotes}
      />
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
          <BottomBarBadgeProvider>
            <SwipeActionProvider>
              <AuthProvider>
                <SecurityProvider>
                  <ThemedApp />
                </SecurityProvider>
              </AuthProvider>
            </SwipeActionProvider>
          </BottomBarBadgeProvider>
        </PrivacyProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
