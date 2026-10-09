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
import { WorkspaceProvider, useWorkspace } from './src/modules/workspaces/WorkspaceContext';
import { FinanceProvider, useFinance } from './src/modules/FinanceContext';
import { MainNavigator } from './src/navigation/MainNavigator';
import { AuthScreen } from './src/screens/AuthScreen';
import { OnboardingScreen, ONBOARDING_COMPLETED_KEY } from './src/screens/OnboardingScreen';

import { WhatsNewModal } from './src/core/components/WhatsNewModal';
import { AppSplashScreen } from './src/core/components/AppSplashScreen';
import { ResetPasswordModal } from './src/screens/settings/components/ResetPasswordModal';
import { ErrorBoundary } from './src/core/components/ErrorBoundary';
import { APP_VERSION_CONFIG, RELEASE_HISTORY, ReleaseNote } from './src/core/version';

const LAST_SEEN_VERSION_KEY = '@financas:last_seen_app_version';

const MainAppContent: React.FC = () => {
  const { isDark } = useTheme();
  const { user } = useAuth();
  const { isWorkspacesReady } = useWorkspace();
  const { isFinanceReady } = useFinance();
  const [onboardingDone, setOnboardingDone] = useState<boolean | null>(null);
  const [minSplashTimeDone, setMinSplashTimeDone] = useState(false);
  const [splashFinished, setSplashFinished] = useState(false);

  // Estados do Modal de Novidades (What's New)
  const [showWhatsNew, setShowWhatsNew] = useState(false);
  const [previousVersion, setPreviousVersion] = useState<string | null>(null);
  const [relevantReleaseNotes, setRelevantReleaseNotes] = useState<ReleaseNote[]>([]);

  useEffect(() => {
    // Duração mínima agradável para exibir a marca Finduo (850ms)
    const timer = setTimeout(() => {
      setMinSplashTimeDone(true);
    }, 850);
    return () => clearTimeout(timer);
  }, []);

  const isAppReady = Boolean(isWorkspacesReady && isFinanceReady && minSplashTimeDone);

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

        // Regra de consolidação: considera apenas uma única nota consolidada (a mais recente instalada)
        const notesToShow = [RELEASE_HISTORY[0]];

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
    return <AppSplashScreen visible={true} />;
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
      {!splashFinished && (
        <AppSplashScreen
          visible={!isAppReady}
          onAnimationFinish={() => setSplashFinished(true)}
        />
      )}
    </>
  );
};

const ThemedApp: React.FC = () => {
  const { isDark } = useTheme();
  const { isAuthenticated, isLoading, isPasswordRecovery, setIsPasswordRecovery } = useAuth();

  if (isLoading) {
    return <AppSplashScreen visible={true} />;
  }

  return (
    <>
      {!isAuthenticated ? (
        <>
          <StatusBar style={isDark ? 'light' : 'dark'} />
          <AuthScreen />
        </>
      ) : (
        <WorkspaceProvider>
          <FinanceProvider>
            <MainAppContent />
          </FinanceProvider>
        </WorkspaceProvider>
      )}

      {/* Modal Global de Redefinição de Senha via Link Seguro */}
      <ResetPasswordModal
        visible={isPasswordRecovery}
        onClose={() => setIsPasswordRecovery(false)}
      />
    </>
  );
};

export default function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        {/* Erro inesperado ao desenhar qualquer tela mostra uma tela amigável, não a tela em branco */}
        <ErrorBoundary>
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
        </ErrorBoundary>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
