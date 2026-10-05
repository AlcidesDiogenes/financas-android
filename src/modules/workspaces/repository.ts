import AsyncStorage from '@react-native-async-storage/async-storage';
import { Workspace } from './types';

const WORKSPACES_STORAGE_KEY = '@financas:workspaces_v1';
const ACTIVE_WORKSPACE_KEY = '@financas:active_workspace_id_v1';

export const DEFAULT_WORKSPACES: Workspace[] = [
  {
    id: 'ws-solo',
    name: 'Finanças Pessoais',
    description: 'Espaço individual e privado. Apenas você tem acesso.',
    type: 'solo',
    inviteCode: 'SOLO-PRIVADO',
    createdAt: new Date().toISOString(),
    members: [
      {
        id: 'user-1',
        name: 'Você',
        email: 'meu@email.com',
        role: 'owner',
        isCurrentUser: true,
      },
    ],
  },
  {
    id: 'ws-shared',
    name: 'Orçamento Compartilhado',
    description: 'Espaço compartilhado para casal / família com sincronização.',
    type: 'shared',
    inviteCode: 'FIN-7842',
    createdAt: new Date().toISOString(),
    members: [
      {
        id: 'user-1',
        name: 'Você',
        email: 'meu@email.com',
        role: 'owner',
        isCurrentUser: true,
      },
      {
        id: 'user-2',
        name: 'Parceiro(a)',
        email: 'parceiro@email.com',
        role: 'editor', // can view and edit
        isCurrentUser: false,
      },
    ],
  },
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
}
