import { createClient, SupabaseClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const DEFAULT_SUPABASE_URL = 'https://uxflydckwwegjocrgbnl.supabase.co';
export const DEFAULT_SUPABASE_ANON_KEY = 'sb_publishable_50BZoDF0Zswkz45RoMFKwg_AVORtMXE';

const SUPABASE_URL_KEY = '@financas:supabase_url';
const SUPABASE_ANON_KEY = '@financas:supabase_anon_key';

let cachedClient: SupabaseClient | null = null;

export class SupabaseService {
  static async getCredentials(): Promise<{ url: string; anonKey: string }> {
    try {
      const url = await AsyncStorage.getItem(SUPABASE_URL_KEY);
      const anonKey = await AsyncStorage.getItem(SUPABASE_ANON_KEY);
      return {
        url: url || DEFAULT_SUPABASE_URL,
        anonKey: anonKey || DEFAULT_SUPABASE_ANON_KEY,
      };
    } catch {
      return {
        url: DEFAULT_SUPABASE_URL,
        anonKey: DEFAULT_SUPABASE_ANON_KEY,
      };
    }
  }

  static async setCredentials(url: string, anonKey: string): Promise<void> {
    await AsyncStorage.setItem(SUPABASE_URL_KEY, url.trim());
    await AsyncStorage.setItem(SUPABASE_ANON_KEY, anonKey.trim());
    cachedClient = createClient(url.trim(), anonKey.trim(), {
      auth: {
        storage: AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
    });
  }

  static async clearCredentials(): Promise<void> {
    await AsyncStorage.removeItem(SUPABASE_URL_KEY);
    await AsyncStorage.removeItem(SUPABASE_ANON_KEY);
    cachedClient = null;
  }

  static async getClient(): Promise<SupabaseClient> {
    if (cachedClient) return cachedClient;
    const creds = await this.getCredentials();
    cachedClient = createClient(creds.url, creds.anonKey, {
      auth: {
        storage: AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
    });
    return cachedClient;
  }
}
