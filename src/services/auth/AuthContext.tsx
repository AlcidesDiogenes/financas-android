import React, { createContext, useContext, useEffect, useState } from 'react';
import { SupabaseService } from '../supabase/supabaseClient';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
}

interface AuthContextType {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  signUp: (email: string, password: string, name: string) => Promise<{ success: boolean; error?: string }>;
  signIn: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signOut: () => Promise<void>;
  skipAuth: () => void;
  isGuest: boolean;
}

const GUEST_MODE_KEY = '@financas:guest_mode';
const LOCAL_PROFILE_KEY = '@financas:local_user_profile';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isGuest, setIsGuest] = useState(false);

  useEffect(() => {
    checkInitialSession();
  }, []);

  const checkInitialSession = async () => {
    try {
      // Check if user chose guest mode previously
      const guestVal = await AsyncStorage.getItem(GUEST_MODE_KEY);
      if (guestVal === 'true') {
        setIsGuest(true);
        setIsLoading(false);
        return;
      }

      const client = await SupabaseService.getClient();
      const { data: { session } } = await client.auth.getSession();

      if (session?.user) {
        const storedProfile = await AsyncStorage.getItem(LOCAL_PROFILE_KEY);
        const name = storedProfile ? JSON.parse(storedProfile).name : session.user.user_metadata?.name || 'Usuário';
        setUser({
          id: session.user.id,
          email: session.user.email || '',
          name,
        });
      }
    } catch {
      // In case of error or no network, allow local flow
    } finally {
      setIsLoading(false);
    }
  };

  const signUp = async (
    email: string,
    password: string,
    name: string
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const client = await SupabaseService.getClient();
      const { data, error } = await client.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: { name: name.trim() },
        },
      });

      if (error) {
        return { success: false, error: error.message };
      }

      if (data.user) {
        const profile: AuthUser = {
          id: data.user.id,
          email: data.user.email || email.trim(),
          name: name.trim(),
        };
        setUser(profile);
        setIsGuest(false);
        await AsyncStorage.removeItem(GUEST_MODE_KEY);
        await AsyncStorage.setItem(LOCAL_PROFILE_KEY, JSON.stringify(profile));
        return { success: true };
      }

      return { success: true };
    } catch (e: any) {
      return { success: false, error: e?.message || 'Falha ao criar conta.' };
    }
  };

  const signIn = async (
    email: string,
    password: string
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const client = await SupabaseService.getClient();
      const { data, error } = await client.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        return { success: false, error: error.message };
      }

      if (data.user) {
        const name = data.user.user_metadata?.name || 'Você';
        const profile: AuthUser = {
          id: data.user.id,
          email: data.user.email || email.trim(),
          name,
        };
        setUser(profile);
        setIsGuest(false);
        await AsyncStorage.removeItem(GUEST_MODE_KEY);
        await AsyncStorage.setItem(LOCAL_PROFILE_KEY, JSON.stringify(profile));
        return { success: true };
      }

      return { success: true };
    } catch (e: any) {
      return { success: false, error: e?.message || 'Falha ao entrar.' };
    }
  };

  const signOut = async () => {
    try {
      const client = await SupabaseService.getClient();
      await client.auth.signOut();
    } catch {}
    setUser(null);
    setIsGuest(false);
    await AsyncStorage.removeItem(GUEST_MODE_KEY);
    await AsyncStorage.removeItem(LOCAL_PROFILE_KEY);
  };

  const skipAuth = async () => {
    setIsGuest(true);
    await AsyncStorage.setItem(GUEST_MODE_KEY, 'true');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user || isGuest,
        isLoading,
        signUp,
        signIn,
        signOut,
        skipAuth,
        isGuest,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
