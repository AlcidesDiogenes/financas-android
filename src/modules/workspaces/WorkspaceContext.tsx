import React, { createContext, useContext, useEffect, useState } from 'react';
import { Workspace, WorkspaceMember, WorkspaceRole } from './types';
import { WorkspaceRepository, DEFAULT_WORKSPACES } from './repository';

interface WorkspaceContextType {
  workspaces: Workspace[];
  activeWorkspace: Workspace;
  setActiveWorkspace: (id: string) => Promise<void>;
  createWorkspace: (name: string, description: string, isShared: boolean) => Promise<void>;
  addMember: (workspaceId: string, name: string, email: string, role: WorkspaceRole) => Promise<void>;
  updateMemberRole: (workspaceId: string, memberId: string, role: WorkspaceRole) => Promise<void>;
  removeMember: (workspaceId: string, memberId: string) => Promise<void>;
  currentUserRole: WorkspaceRole;
  canEdit: boolean;
}

const WorkspaceContext = createContext<WorkspaceContextType | undefined>(undefined);

export const WorkspaceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [workspaces, setWorkspaces] = useState<Workspace[]>(DEFAULT_WORKSPACES);
  const [activeWorkspaceId, setActiveWorkspaceIdState] = useState<string>(DEFAULT_WORKSPACES[0].id);

  useEffect(() => {
    loadWorkspaces();
  }, []);

  const loadWorkspaces = async () => {
    const list = await WorkspaceRepository.getWorkspaces();
    const activeId = await WorkspaceRepository.getActiveWorkspaceId();
    setWorkspaces(list);
    const found = list.find((w) => w.id === activeId);
    if (found) {
      setActiveWorkspaceIdState(found.id);
    } else if (list.length > 0) {
      setActiveWorkspaceIdState(list[0].id);
    }
  };

  const activeWorkspace =
    workspaces.find((w) => w.id === activeWorkspaceId) || workspaces[0] || DEFAULT_WORKSPACES[0];

  const currentMember = activeWorkspace.members.find((m) => m.isCurrentUser);
  const currentUserRole: WorkspaceRole = currentMember ? currentMember.role : 'owner';
  const canEdit = currentUserRole === 'owner' || currentUserRole === 'editor';

  const setActiveWorkspace = async (id: string) => {
    setActiveWorkspaceIdState(id);
    await WorkspaceRepository.setActiveWorkspaceId(id);
  };

  const createWorkspace = async (
    name: string,
    description: string,
    isShared: boolean
  ) => {
    const newWs: Workspace = {
      id: `ws-${Date.now()}`,
      name,
      description,
      type: isShared ? 'shared' : 'solo',
      inviteCode: `FIN-${Math.floor(1000 + Math.random() * 9000)}`,
      createdAt: new Date().toISOString(),
      members: [
        {
          id: `user-${Date.now()}`,
          name: 'Você',
          email: 'meu@email.com',
          role: 'owner',
          isCurrentUser: true,
        },
      ],
    };

    const updated = [...workspaces, newWs];
    setWorkspaces(updated);
    await WorkspaceRepository.saveWorkspaces(updated);
    await setActiveWorkspace(newWs.id);
  };

  const addMember = async (
    workspaceId: string,
    name: string,
    email: string,
    role: WorkspaceRole
  ) => {
    const updated = workspaces.map((w) => {
      if (w.id === workspaceId) {
        const newMember: WorkspaceMember = {
          id: `user-${Date.now()}`,
          name,
          email,
          role,
          isCurrentUser: false,
        };
        return {
          ...w,
          members: [...w.members, newMember],
        };
      }
      return w;
    });

    setWorkspaces(updated);
    await WorkspaceRepository.saveWorkspaces(updated);
  };

  const updateMemberRole = async (
    workspaceId: string,
    memberId: string,
    role: WorkspaceRole
  ) => {
    const updated = workspaces.map((w) => {
      if (w.id === workspaceId) {
        return {
          ...w,
          members: w.members.map((m) => (m.id === memberId ? { ...m, role } : m)),
        };
      }
      return w;
    });

    setWorkspaces(updated);
    await WorkspaceRepository.saveWorkspaces(updated);
  };

  const removeMember = async (workspaceId: string, memberId: string) => {
    const updated = workspaces.map((w) => {
      if (w.id === workspaceId) {
        return {
          ...w,
          members: w.members.filter((m) => m.id !== memberId),
        };
      }
      return w;
    });

    setWorkspaces(updated);
    await WorkspaceRepository.saveWorkspaces(updated);
  };

  return (
    <WorkspaceContext.Provider
      value={{
        workspaces,
        activeWorkspace,
        setActiveWorkspace,
        createWorkspace,
        addMember,
        updateMemberRole,
        removeMember,
        currentUserRole,
        canEdit,
      }}
    >
      {children}
    </WorkspaceContext.Provider>
  );
};

export const useWorkspace = (): WorkspaceContextType => {
  const context = useContext(WorkspaceContext);
  if (!context) {
    throw new Error('useWorkspace must be used within a WorkspaceProvider');
  }
  return context;
};
