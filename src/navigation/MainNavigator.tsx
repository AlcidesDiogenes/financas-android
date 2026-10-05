import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../core/theme/ThemeContext';
import { HomeScreen } from '../screens/HomeScreen';
import { TransactionsScreen } from '../screens/TransactionsScreen';
import { RecurringsScreen } from '../screens/RecurringsScreen';
import { PlanningScreen } from '../screens/PlanningScreen';
import { WorkspacesScreen } from '../screens/WorkspacesScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { Ionicons } from '@expo/vector-icons';

type TabKey = 'home' | 'transactions' | 'recurrings' | 'planning' | 'settings' | 'workspaces';

interface TabConfig {
  key: 'home' | 'transactions' | 'recurrings' | 'planning' | 'settings';
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  activeIcon: keyof typeof Ionicons.glyphMap;
}

const TABS: TabConfig[] = [
  { key: 'home', label: 'Início', icon: 'home-outline', activeIcon: 'home' },
  { key: 'transactions', label: 'Extrato', icon: 'receipt-outline', activeIcon: 'receipt' },
  { key: 'recurrings', label: 'Recorrentes', icon: 'repeat-outline', activeIcon: 'repeat' },
  { key: 'planning', label: 'Planejar', icon: 'pie-chart-outline', activeIcon: 'pie-chart' },
  { key: 'settings', label: 'Ajustes', icon: 'settings-outline', activeIcon: 'settings' },
];

export const MainNavigator: React.FC = () => {
  const { theme } = useTheme();
  const [currentTab, setCurrentTab] = useState<TabKey>('home');

  const renderScreen = () => {
    switch (currentTab) {
      case 'home':
        return (
          <HomeScreen
            onNavigateToTransactions={() => setCurrentTab('transactions')}
            onNavigateToRecurrings={() => setCurrentTab('recurrings')}
            onNavigateToPlanning={() => setCurrentTab('planning')}
            onNavigateToWorkspaces={() => setCurrentTab('workspaces')}
            onNavigateToSettings={() => setCurrentTab('settings')}
          />
        );
      case 'transactions':
        return <TransactionsScreen />;
      case 'recurrings':
        return <RecurringsScreen />;
      case 'planning':
        return <PlanningScreen />;
      case 'settings':
        return <SettingsScreen />;
      case 'workspaces':
        return (
          <View style={{ flex: 1 }}>
            {/* Header with back to home button */}
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingHorizontal: 16,
                paddingVertical: 12,
                borderBottomWidth: 1,
                borderBottomColor: theme.border,
                backgroundColor: theme.surface,
              }}
            >
              <TouchableOpacity
                onPress={() => setCurrentTab('home')}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                style={{ flexDirection: 'row', alignItems: 'center' }}
              >
                <Ionicons name="arrow-back" size={22} color={theme.primary} />
                <Text style={{ marginLeft: 6, fontSize: 15, fontWeight: '600', color: theme.primary }}>
                  Voltar ao Início
                </Text>
              </TouchableOpacity>
            </View>
            <WorkspacesScreen />
          </View>
        );
      default:
        return null;
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.content}>{renderScreen()}</View>

      {/* Modern Bottom Navigation Bar */}
      <View
        style={[
          styles.bottomBar,
          {
            backgroundColor: theme.tabBar,
            borderTopColor: theme.border,
          },
        ]}
      >
        {TABS.map((tab) => {
          const isActive = currentTab === tab.key;
          return (
            <TouchableOpacity
              key={tab.key}
              style={styles.tabBtn}
              onPress={() => setCurrentTab(tab.key)}
              activeOpacity={0.7}
            >
              <Ionicons
                name={isActive ? tab.activeIcon : tab.icon}
                size={22}
                color={isActive ? theme.tabBarActive : theme.tabBarInactive}
              />
              <Text
                style={[
                  styles.tabLabel,
                  {
                    color: isActive ? theme.tabBarActive : theme.tabBarInactive,
                    fontWeight: isActive ? '700' : '500',
                  },
                ]}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  bottomBar: {
    flexDirection: 'row',
    height: 64,
    borderTopWidth: 1,
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 8,
  },
  tabBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    paddingVertical: 6,
  },
  tabLabel: {
    fontSize: 10,
    marginTop: 4,
  },
});
