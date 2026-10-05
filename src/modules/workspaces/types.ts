export type WorkspaceType = 'solo' | 'shared';
export type WorkspaceRole = 'owner' | 'editor' | 'viewer';

export interface WorkspaceMember {
  id: string;
  name: string;
  email: string;
  role: WorkspaceRole;
  isCurrentUser: boolean;
}

export interface Workspace {
  id: string;
  name: string;
  description: string;
  type: WorkspaceType;
  inviteCode: string;
  createdAt: string;
  members: WorkspaceMember[];
}
