import React, { createContext, useContext, useEffect, useState } from 'react';
import { Alert } from 'react-native';
import * as Linking from 'expo-linking';
import { SupabaseService } from '../supabase/supabaseClient';
import { CloudSyncService } from '../supabase/CloudSyncService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { TransactionRepository } from '../../modules/transactions/repository';
import { RecurringRepository } from '../../modules/recurrings/repository';
import { RecurringMonthRepository } from '../../modules/recurrings/monthRepository';
import { BudgetRepository } from '../../modules/budgets/repository';
import { GoalRepository } from '../../modules/goals/repository';
import { WorkspaceRepository, DEFAULT_WORKSPACES } from '../../modules/workspaces/repository';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
}

interface AuthContextType {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  signUp: (email: string, password: string, name: string) => Promise<{ success: boolean; requiresEmailConfirmation?: boolean; error?: string }>;
  signIn: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  resendVerificationEmail: (email: string) => Promise<{ success: boolean; error?: string }>;
  resetPassword: (email: string) => Promise<{ success: boolean; error?: string }>;
  updatePassword: (newPassword: string) => Promise<{ success: boolean; error?: string }>;
  signOut: () => Promise<void>;
  deleteAccount: () => Promise<{ success: boolean; error?: string }>;
  skipAuth: () => void;
  isGuest: boolean;
}

const GUEST_MODE_KEY = '@financas:guest_mode';
const LOCAL_PROFILE_KEY = '@financas:local_user_profile';

const clearLocalUserData = async () => {
  try {
    await Promise.all([
      TransactionRepository.saveAll([]),
      RecurringRepository.saveAll([]),
      RecurringMonthRepository.saveAll([]),
      BudgetRepository.saveAll([]),
      GoalRepository.saveAll([]),
      WorkspaceRepository.saveWorkspaces(DEFAULT_WORKSPACES),
      WorkspaceRepository.setActiveWorkspaceId(DEFAULT_WORKSPACES[0].id),
    ]);
  } catch {}
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isGuest, setIsGuest] = useState(false);

  useEffect(() => {
    checkInitialSession();

    // Listener para quando o app for aberto através de um link do Supabase (e-mail)
    const subscription = Linking.addEventListener('url', async ({ url }) => {
      if (url) {
        await handleIncomingDeepLink(url);
      }
    });

    return () => {
      subscription.remove();
    };
  }, []);

  const handleIncomingDeepLink = async (url: string) => {
    try {
      // O Supabase anexa tokens após #access_token=... ou ?code=...
      const client = await SupabaseService.getClient();

      // Se o link contiver hash com tokens (#access_token=...)
      if (url.includes('#access_token=') || url.includes('?code=')) {
        // Obter os parâmetros da URL
        const parsed = Linking.parse(url);
        
        // Verifica se há sessão atualizada
        const { data: { session } } = await client.auth.getSession();
        if (session?.user) {
          const storedProfile = await AsyncStorage.getItem(LOCAL_PROFILE_KEY);
          const name = storedProfile ? JSON.parse(storedProfile).name : session.user.user_metadata?.name || 'Usuário';
          const profile: AuthUser = {
            id: session.user.id,
            email: session.user.email || '',
            name,
          };
          setUser(profile);
          setIsGuest(false);
          await AsyncStorage.removeItem(GUEST_MODE_KEY);
          await AsyncStorage.setItem(LOCAL_PROFILE_KEY, JSON.stringify(profile));

          Alert.alert('Conta Confirmada! 🎉', 'Seu e-mail foi verificado com sucesso. Bem-vindo!');
        }
      }
    } catch {}
  };

  const checkInitialSession = async () => {
    try {
      // Verificar se o app acabou de ser aberto por um deep link inicial
      const initialUrl = await Linking.getInitialURL();
      if (initialUrl) {
        await handleIncomingDeepLink(initialUrl);
      }

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

  const formatAuthError = (msg?: string): string => {
    if (!msg) return 'Ocorreu um erro. Tente novamente.';
    const lower = msg.toLowerCase();
    if (lower.includes('email not confirmed')) {
      return 'E-mail ainda não confirmado. Por favor, verifique sua caixa de entrada (e spam) e clique no link de ativação enviado pelo Supabase.';
    }
    if (lower.includes('invalid login credentials')) {
      return 'E-mail ou senha incorretos.';
    }
    if (lower.includes('user already registered') || lower.includes('already exists')) {
      return 'Este e-mail já está cadastrado. Alterne para a aba "Entrar" e faça seu login.';
    }
    if (lower.includes('password should be at least')) {
      return 'A senha deve ter no mínimo 6 caracteres.';
    }
    if (lower.includes('rate limit')) {
      return 'Muitas tentativas em pouco tempo. Aguarde alguns instantes.';
    }
    if (lower.includes('user not found')) {
      return 'Nenhuma conta cadastrada com este e-mail.';
    }
    return msg;
  };

  const signUp = async (
    email: string,
    password: string,
    name: string
  ): Promise<{ success: boolean; requiresEmailConfirmation?: boolean; error?: string }> => {
    try {
      const client = await SupabaseService.getClient();
      const redirectUrl = Linking.createURL('auth/confirm');

      const { data, error } = await client.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: { name: name.trim() },
          emailRedirectTo: redirectUrl,
        },
      });

      if (error) {
        return { success: false, error: formatAuthError(error.message) };
      }

      // Detecção de e-mail já cadastrado (Supabase anti-enumeration retorna identities: [])
      if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
        return {
          success: false,
          error: 'Este e-mail já está cadastrado. Alterne para a aba "Entrar" para acessar ou redefinir sua senha.',
        };
      }

      // Se o Supabase enviou e-mail de confirmação (novo usuário válido), data.session é null!
      if (data.user && !data.session) {
        return { success: true, requiresEmailConfirmation: true };
      }

      if (data.user && data.session) {
        const profile: AuthUser = {
          id: data.user.id,
          email: data.user.email || email.trim(),
          name: name.trim(),
        };
        setUser(profile);
        setIsGuest(false);
        await AsyncStorage.removeItem(GUEST_MODE_KEY);
        await AsyncStorage.setItem(LOCAL_PROFILE_KEY, JSON.stringify(profile));
        return { success: true, requiresEmailConfirmation: false };
      }

      return { success: true };
    } catch (e: any) {
      return { success: false, error: formatAuthError(e?.message) };
    }
  };

  const resendVerificationEmail = async (
    email: string
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const client = await SupabaseService.getClient();
      const redirectUrl = Linking.createURL('auth/confirm');
      const { error } = await client.auth.resend({
        type: 'signup',
        email: email.trim(),
        options: {
          emailRedirectTo: redirectUrl,
        },
      });
      if (error) {
        return { success: false, error: formatAuthError(error.message) };
      }
      return { success: true };
    } catch (e: any) {
      return { success: false, error: formatAuthError(e?.message) };
    }
  };

  const resetPassword = async (
    email: string
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const client = await SupabaseService.getClient();
      const redirectUrl = Linking.createURL('auth/reset-password');

      const { error } = await client.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: redirectUrl,
      });
      if (error) {
        return { success: false, error: formatAuthError(error.message) };
      }
      return { success: true };
    } catch (e: any) {
      return { success: false, error: formatAuthError(e?.message) };
    }
  };

  const updatePassword = async (
    newPassword: string
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const client = await SupabaseService.getClient();
      const { error } = await client.auth.updateUser({ password: newPassword });
      if (error) {
        return { success: false, error: formatAuthError(error.message) };
      }
      return { success: true };
    } catch (e: any) {
      return { success: false, error: formatAuthError(e?.message) };
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
        return { success: false, error: formatAuthError(error.message) };
      }

      if (data.user) {
        // Ao autenticar em uma conta, limpa cache anterior para receber os dados exclusivos da nuvem
        await clearLocalUserData();

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
      return { success: false, error: formatAuthError(e?.message) };
    }
  };

  const signOut = async () => {
    // 1. Salva e garante que todos os dados locais estejam salvos na nuvem antes de sair
    try {
      await CloudSyncService.syncLocalToCloud();
    } catch {}

    // 2. Desconecta da sessão Supabase
    try {
      const client = await SupabaseService.getClient();
      await client.auth.signOut();
    } catch {}

    // 3. Limpar o cache local para proteger a privacidade entre contas
    await clearLocalUserData();

    setUser(null);
    setIsGuest(false);
    await AsyncStorage.removeItem(GUEST_MODE_KEY);
    await AsyncStorage.removeItem(LOCAL_PROFILE_KEY);
  };

  const deleteAccount = async (): Promise<{ success: boolean; error?: string }> => {
    try {
      const client = await SupabaseService.getClient();

      // 1. Chama a função segura no Supabase para deletar o usuário do auth.users e suas tabelas
      try {
        await client.rpc('delete_user_account');
      } catch (rpcErr) {
        // Fallback caso a procedure RPC ainda não tenha sido criada
        if (user?.email) {
          await client.from('workspace_members').delete().eq('email', user.email.toLowerCase().trim());
        }
      }

      // 2. Logout no Supabase
      try {
        await client.auth.signOut();
      } catch {}

      // 3. Limpar todos os dados locais do aplicativo
      await AsyncStorage.clear();
      await clearLocalUserData();

      setUser(null);
      setIsGuest(false);

      return { success: true };
    } catch (e: any) {
      return { success: false, error: e?.message || 'Falha ao excluir conta.' };
    }
  };

  const skipAuth = async () => {
    // Ao entrar no modo visitante, inicia com base local limpa
    await clearLocalUserData();
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
        resendVerificationEmail,
        resetPassword,
        updatePassword,
        signOut,
        deleteAccount,
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
