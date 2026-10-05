import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider, useTheme } from './src/core/theme/ThemeContext';
import { PrivacyProvider } from './src/core/theme/PrivacyContext';
import { SecurityProvider } from './src/services/security/SecurityContext';
import { WorkspaceProvider } from './src/modules/workspaces/WorkspaceContext';
import { FinanceProvider } from './src/modules/FinanceContext';
import { MainNavigator } from './src/navigation/MainNavigator';

const ThemedApp: React.FC = () => {
  const { isDark } = useTheme();

  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <WorkspaceProvider>
        <FinanceProvider>
          <MainNavigator />
        </FinanceProvider>
      </WorkspaceProvider>
    </>
  );
};

export default function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <PrivacyProvider>
          <SecurityProvider>
            <ThemedApp />
          </SecurityProvider>
        </PrivacyProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
