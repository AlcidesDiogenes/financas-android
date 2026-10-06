import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type BottomBarBadgeStyle = 'number' | 'dot' | 'none';

interface BottomBarBadgeContextType {
  badgeStyle: BottomBarBadgeStyle;
  setBadgeStyle: (style: BottomBarBadgeStyle) => Promise<void>;
}

const STORAGE_BADGE_STYLE_KEY = '@financas:bottom_bar_badge_style';

const BottomBarBadgeContext = createContext<BottomBarBadgeContextType | undefined>(undefined);

export const BottomBarBadgeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [badgeStyle, setBadgeStyleState] = useState<BottomBarBadgeStyle>('number');

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_BADGE_STYLE_KEY)
      .then((val) => {
        if (val === 'number' || val === 'dot' || val === 'none') {
          setBadgeStyleState(val);
        }
      })
      .catch(() => {});
  }, []);

  const setBadgeStyle = async (newStyle: BottomBarBadgeStyle) => {
    setBadgeStyleState(newStyle);
    await AsyncStorage.setItem(STORAGE_BADGE_STYLE_KEY, newStyle);
  };

  return (
    <BottomBarBadgeContext.Provider value={{ badgeStyle, setBadgeStyle }}>
      {children}
    </BottomBarBadgeContext.Provider>
  );
};

export const useBottomBarBadge = (): BottomBarBadgeContextType => {
  const context = useContext(BottomBarBadgeContext);
  if (!context) {
    throw new Error('useBottomBarBadge must be used within a BottomBarBadgeProvider');
  }
  return context;
};
