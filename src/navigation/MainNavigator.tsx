import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../core/theme/ThemeContext';
import { useFinance } from '../modules/FinanceContext';
import { isRecurringActiveInMonth } from '../modules/recurrings/types';
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
  const { theme, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const {
    recurrings,
    budgetProgressList,
    selectedMonth,
    selectedYear,
  } = useFinance();

  const [currentTab, setCurrentTab] = useState<TabKey>('home');
  const [previousTab, setPreviousTab] = useState<TabKey>('home');

  // Badge: Pending recurrings count in active month
  const pendingRecurringsCount = useMemo(() => {
    return recurrings.filter(
      (r) =>
        isRecurringActiveInMonth(r, selectedMonth, selectedYear) &&
        !r.isPaidCurrentMonth &&
        (r.type === 'expense' || !r.type)
    ).length;
  }, [recurrings, selectedMonth, selectedYear]);

  // Badge: Over-budget alert
  const hasOverBudget = useMemo(() => {
    return budgetProgressList.some((b) => b.percentage >= 100);
  }, [budgetProgressList]);

  const navigateToWorkspaces = (from: TabKey) => {
    setPreviousTab(from);
    setCurrentTab('workspaces');
  };

  const renderScreen = () => {
    switch (currentTab) {
      case 'home':
        return (
          <HomeScreen
            onNavigateToTransactions={() => setCurrentTab('transactions')}
            onNavigateToRecurrings={() => setCurrentTab('recurrings')}
            onNavigateToPlanning={() => setCurrentTab('planning')}
            onNavigateToWorkspaces={() => navigateToWorkspaces('home')}
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
        return (
          <SettingsScreen
            onNavigateToWorkspaces={() => navigateToWorkspaces('settings')}
          />
        );
      case 'workspaces':
        return (
          <View style={{ flex: 1 }}>
            {/* Header with back button */}
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
                onPress={() => setCurrentTab(previousTab || 'home')}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                style={{ flexDirection: 'row', alignItems: 'center' }}
              >
                <Ionicons name="arrow-back" size={22} color={theme.primary} />
                <Text
                  style={{
                    marginLeft: 6,
                    fontSize: 15,
                    fontWeight: '600',
                    color: theme.primary,
                  }}
                >
                  Voltar
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
    <SafeAreaView
      edges={['top']}
      style={[styles.container, { backgroundColor: theme.background }]}
    >
      <View style={styles.content}>{renderScreen()}</View>

      {/* Floating Island Bottom Navigation Bar */}
      <View
        style={[
          styles.bottomBarContainer,
          { marginBottom: Math.max(insets.bottom, 10) },
        ]}
      >
        <View
          style={[
            styles.bottomBar,
            {
              backgroundColor: isDark ? theme.surface : '#FFFFFF',
              borderColor: theme.border,
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
                <View style={styles.iconContainer}>
                  <Ionicons
                    name={isActive ? tab.activeIcon : tab.icon}
                    size={isActive ? 23 : 21}
                    color={isActive ? theme.primary : theme.textMuted}
                  />

                  {/* Recurrings Pending Badge */}
                  {tab.key === 'recurrings' && pendingRecurringsCount > 0 && (
                    <View style={styles.badgeBadge}>
                      <Text style={styles.badgeBadgeText}>
                        {pendingRecurringsCount > 9 ? '9+' : pendingRecurringsCount}
                      </Text>
                    </View>
                  )}

                  {/* Over-Budget Alert Badge */}
                  {tab.key === 'planning' && hasOverBudget && (
                    <View style={styles.badgeDot} />
                  )}
                </View>

                <Text
                  style={[
                    styles.tabLabel,
                    {
                      color: isActive ? theme.primary : theme.textMuted,
                      fontWeight: isActive ? '700' : '500',
                    },
                  ]}
                  numberOfLines={1}
                >
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
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
  // Floating Island Bottom Bar
  bottomBarContainer: {
    paddingHorizontal: 16,
    backgroundColor: 'transparent',
    paddingTop: 4,
  },
  bottomBar: {
    flexDirection: 'row',
    height: 62,
    borderRadius: 24,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 6,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
  },
  tabBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    paddingVertical: 4,
  },
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 32,
    position: 'relative',
    paddingVertical: 2,
  },
  tabLabel: {
    fontSize: 10,
    marginTop: 2,
    letterSpacing: 0.1,
  },
  // Badges
  badgeBadge: {
    position: 'absolute',
    top: -3,
    right: -8,
    backgroundColor: '#EF4444',
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  badgeBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '800',
    lineHeight: 11,
  },
  badgeDot: {
    position: 'absolute',
    top: 0,
    right: -4,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#F59E0B',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
});
