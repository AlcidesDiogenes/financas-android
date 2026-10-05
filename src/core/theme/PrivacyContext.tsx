import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface PrivacyContextType {
  isPrivacyMode: boolean;
  togglePrivacyMode: () => void;
  formatPrivateCurrency: (amount: number, formattedValue: string) => string;
}

const STORAGE_PRIVACY_KEY = '@financas:privacy_mode';

const PrivacyContext = createContext<PrivacyContextType | undefined>(undefined);

export const PrivacyProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isPrivacyMode, setIsPrivacyMode] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_PRIVACY_KEY).then((val) => {
      if (val === 'true') setIsPrivacyMode(true);
    }).catch(() => {});
  }, []);

  const togglePrivacyMode = async () => {
    const nextVal = !isPrivacyMode;
    setIsPrivacyMode(nextVal);
    await AsyncStorage.setItem(STORAGE_PRIVACY_KEY, String(nextVal));
  };

  const formatPrivateCurrency = (_amount: number, formattedValue: string): string => {
    if (isPrivacyMode) {
      return 'R$ •••••';
    }
    return formattedValue;
  };

  return (
    <PrivacyContext.Provider
      value={{
        isPrivacyMode,
        togglePrivacyMode,
        formatPrivateCurrency,
      }}
    >
      {children}
    </PrivacyContext.Provider>
  );
};

export const usePrivacy = (): PrivacyContextType => {
  const context = useContext(PrivacyContext);
  if (!context) {
    throw new Error('usePrivacy must be used within a PrivacyProvider');
  }
  return context;
};
