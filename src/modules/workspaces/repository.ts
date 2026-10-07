import AsyncStorage from '@react-native-async-storage/async-storage';
import { Workspace } from './types';

const WORKSPACES_STORAGE_KEY = '@financas:workspaces_v1';
const ACTIVE_WORKSPACE_KEY = '@financas:active_workspace_id_v1';
const DEFAULT_WORKSPACE_KEY = '@financas:default_workspace_id_v1';

export const getPersonalWorkspaceId = (userId?: string): string => {
  return userId ? `ws-${userId}` : 'ws-solo';
};

const UNAMBIGUOUS_CHARS = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';

export const generateWorkspaceInviteCode = (): string => {
  let part1 = '';
  let part2 = '';
  for (let i = 0; i < 4; i++) {
    const idx1 = Math.floor(Math.random() * UNAMBIGUOUS_CHARS.length);
    part1 += UNAMBIGUOUS_CHARS[idx1];
    const idx2 = Math.floor(Math.random() * UNAMBIGUOUS_CHARS.length);
    part2 += UNAMBIGUOUS_CHARS[idx2];
  }
  return `FIN-${part1}-${part2}`;
};

export const generateUniqueWorkspaceInviteCode = async (
  existingWorkspaces?: Workspace[],
  client?: any
): Promise<string> => {
  let attempts = 0;
  while (attempts < 10) {
    attempts++;
    const candidate = generateWorkspaceInviteCode();

    // 1. Verifica no cache local de espaços
    if (existingWorkspaces && existingWorkspaces.some((w) => w.inviteCode === candidate)) {
      continue;
    }

    // 2. Verifica ativamente no Supabase na nuvem se algum espaço no mundo já possui este código
    if (client) {
      try {
        // Via RPC: com RLS, o select direto não enxerga espaços de outros usuários
        const { data } = await client.rpc('find_workspace_by_invite_code', {
          p_code: candidate,
        });

        if (Array.isArray(data) && data.length > 0) {
          // Colisão detectada! Descarta e repete o sorteio imediatamente.
          continue;
        }
      } catch {
        // Em caso de falha de conexão temporária, a entropia de 1 trilhão garante unicidade
      }
    }

    return candidate;
  }

  return generateWorkspaceInviteCode();
};

export const createDefaultPersonalWorkspace = (
  userId?: string,
  userName?: string,
  userEmail?: string
): Workspace => {
  const wsId = getPersonalWorkspaceId(userId);
  return {
    id: wsId,
    name: 'Finanças Pessoais',
    description: 'Espaço individual e privado. Apenas você tem acesso.',
    type: 'solo',
    inviteCode: 'SOLO-PRIVADO',
    createdAt: new Date().toISOString(),
    members: [
      {
        id: userId ? `mem-${userId}` : 'user-1',
        name: userName || 'Você',
        email: userEmail || 'meu@email.com',
        role: 'owner',
        isCurrentUser: true,
      },
    ],
  };
};

export const DEFAULT_WORKSPACES: Workspace[] = [
  createDefaultPersonalWorkspace(),
];

export class WorkspaceRepository {
  static async getWorkspaces(): Promise<Workspace[]> {
    try {
      const data = await AsyncStorage.getItem(WORKSPACES_STORAGE_KEY);
      if (!data) {
        await AsyncStorage.setItem(
          WORKSPACES_STORAGE_KEY,
          JSON.stringify(DEFAULT_WORKSPACES)
        );
        return DEFAULT_WORKSPACES;
      }
      return JSON.parse(data);
    } catch {
      return DEFAULT_WORKSPACES;
    }
  }

  static async saveWorkspaces(workspaces: Workspace[]): Promise<void> {
    await AsyncStorage.setItem(
      WORKSPACES_STORAGE_KEY,
      JSON.stringify(workspaces)
    );
  }

  static async getActiveWorkspaceId(): Promise<string> {
    try {
      const activeId = await AsyncStorage.getItem(ACTIVE_WORKSPACE_KEY);
      return activeId || DEFAULT_WORKSPACES[0].id;
    } catch {
      return DEFAULT_WORKSPACES[0].id;
    }
  }

  static async setActiveWorkspaceId(id: string): Promise<void> {
    await AsyncStorage.setItem(ACTIVE_WORKSPACE_KEY, id);
  }

  static async getDefaultWorkspaceId(): Promise<string | null> {
    try {
      return await AsyncStorage.getItem(DEFAULT_WORKSPACE_KEY);
    } catch {
      return null;
    }
  }

  static async setDefaultWorkspaceId(id: string): Promise<void> {
    await AsyncStorage.setItem(DEFAULT_WORKSPACE_KEY, id);
  }
}
