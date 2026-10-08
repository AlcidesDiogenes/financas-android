import { createClient, SupabaseClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const DEFAULT_SUPABASE_URL = 'https://uxflydckwwegjocrgbnl.supabase.co';
export const DEFAULT_SUPABASE_ANON_KEY = 'sb_publishable_50BZoDF0Zswkz45RoMFKwg_AVORtMXE';

// Guarda a promessa (e não o cliente pronto): chamadas simultâneas na abertura do app
// compartilham a mesma instância, evitando várias sessões disputando a renovação do token.
let clientPromise: Promise<SupabaseClient> | null = null;

export class SupabaseService {
  static getClient(): Promise<SupabaseClient> {
    if (!clientPromise) {
      clientPromise = Promise.resolve(
        createClient(DEFAULT_SUPABASE_URL, DEFAULT_SUPABASE_ANON_KEY, {
          auth: {
            storage: AsyncStorage,
            autoRefreshToken: true,
            persistSession: true,
            detectSessionInUrl: false,
            // PKCE: o link do e-mail traz só um código, que só vira sessão no aparelho que
            // pediu o e-mail (ele guarda o segredo). Um link gerado por outra pessoa não loga aqui.
            flowType: 'pkce',
          },
        })
      );
    }
    return clientPromise;
  }
}
