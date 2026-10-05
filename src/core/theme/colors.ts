export interface ThemePalette {
  isDark: boolean;
  background: string;
  surface: string;
  surfaceVariant: string;
  card: string;
  border: string;
  text: string;
  textMuted: string;
  primary: string;
  primaryLight: string;
  success: string;
  successLight: string;
  danger: string;
  dangerLight: string;
  warning: string;
  warningLight: string;
  info: string;
  infoLight: string;
  accent: string;
  tabBar: string;
  tabBarActive: string;
  tabBarInactive: string;
}

export const lightTheme: ThemePalette = {
  isDark: false,
  background: '#F8FAFC',
  surface: '#FFFFFF',
  surfaceVariant: '#F1F5F9',
  card: '#FFFFFF',
  border: '#E2E8F0',
  text: '#0F172A',
  textMuted: '#64748B',
  primary: '#2563EB',
  primaryLight: '#EFF6FF',
  success: '#10B981',
  successLight: '#ECFDF5',
  danger: '#EF4444',
  dangerLight: '#FEF2F2',
  warning: '#F59E0B',
  warningLight: '#FFFBEB',
  info: '#6366F1',
  infoLight: '#EEF2FF',
  accent: '#0D9488',
  tabBar: '#FFFFFF',
  tabBarActive: '#2563EB',
  tabBarInactive: '#94A3B8',
};

export const darkTheme: ThemePalette = {
  isDark: true,
  background: '#0B0F19',
  surface: '#111827',
  surfaceVariant: '#1F2937',
  card: '#151E2E',
  border: '#1F293D',
  text: '#F8FAFC',
  textMuted: '#94A3B8',
  primary: '#3B82F6',
  primaryLight: '#1E293B',
  success: '#10B981',
  successLight: '#064E3B',
  danger: '#EF4444',
  dangerLight: '#451A1A',
  warning: '#F59E0B',
  warningLight: '#452A0A',
  info: '#818CF8',
  infoLight: '#1E1B4B',
  accent: '#14B8A6',
  tabBar: '#0D1322',
  tabBarActive: '#60A5FA',
  tabBarInactive: '#64748B',
};
