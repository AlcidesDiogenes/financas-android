import React, { createContext, useContext, useEffect, useState } from 'react';
import { Workspace, WorkspaceMember, WorkspaceRole } from './types';
import { WorkspaceRepository, DEFAULT_WORKSPACES } from './repository';
import { useAuth } from '../../services/auth/AuthContext';
import { SupabaseService } from '../../services/supabase/supabaseClient';

interface WorkspaceContextType {
  workspaces: Workspace[];
  activeWorkspace: Workspace;
  setActiveWorkspace: (id: string) => Promise<void>;
  createWorkspace: (name: string, description: string, isShared: boolean) => Promise<void>;
  addMember: (workspaceId: string, name: string, email: string, role: WorkspaceRole) => Promise<void>;
  updateMemberRole: (workspaceId: string, memberId: string, role: WorkspaceRole) => Promise<void>;
  removeMember: (workspaceId: string, memberId: string) => Promise<void>;
  renameWorkspace: (workspaceId: string, newName: string) => Promise<void>;
  deleteWorkspace: (workspaceId: string) => Promise<{ success: boolean; message: string }>;
  joinWorkspaceByCode: (inviteCode: string) => Promise<{ success: boolean; message: string }>;
  currentUserRole: WorkspaceRole;
  canEdit: boolean;
}

const WorkspaceContext = createContext<WorkspaceContextType | undefined>(undefined);

export const WorkspaceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [workspaces, setWorkspaces] = useState<Workspace[]>(DEFAULT_WORKSPACES);
  const [activeWorkspaceId, setActiveWorkspaceIdState] = useState<string>(DEFAULT_WORKSPACES[0].id);

  useEffect(() => {
    loadWorkspaces();
  }, [user?.email]);

  const loadWorkspaces = async () => {
    // No modo offline, permite apenas o espaço pessoal solo
    if (!user) {
      const soloList = DEFAULT_WORKSPACES;
      setWorkspaces(soloList);
      setActiveWorkspaceIdState(soloList[0].id);
      return;
    }

    let list = await WorkspaceRepository.getWorkspaces();
    const activeId = await WorkspaceRepository.getActiveWorkspaceId();

    // If user is authenticated, check for email invitations in Supabase
    if (user?.email) {
      try {
        const client = await SupabaseService.getClient();
        const { data: memberRows } = await client
          .from('workspace_members')
          .select('workspace_id, role, name, email')
          .eq('email', user.email.toLowerCase().trim());

        if (memberRows && memberRows.length > 0) {
          const workspaceIds = memberRows.map((m) => m.workspace_id);
          const { data: remoteWorkspaces } = await client
            .from('workspaces')
            .select('*')
            .in('id', workspaceIds);

          if (remoteWorkspaces) {
            remoteWorkspaces.forEach((rw) => {
              const alreadyHas = list.some((w) => w.id === rw.id);
              if (!alreadyHas) {
                const memberInfo = memberRows.find((m) => m.workspace_id === rw.id);
                const role: WorkspaceRole = (memberInfo?.role as WorkspaceRole) || 'editor';

                list.push({
                  id: rw.id,
                  name: rw.name,
                  description: rw.description || '',
                  type: rw.type as any,
                  inviteCode: rw.invite_code || '',
                  createdAt: rw.created_at,
                  members: [
                    {
                      id: `member-${user.id}`,
                      name: user.name || 'Você',
                      email: user.email,
                      role,
                      isCurrentUser: true,
                    },
                  ],
                });
              }
            });
            await WorkspaceRepository.saveWorkspaces(list);
          }
        }
      } catch {}
    }

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

  const currentMember = activeWorkspace.members.find(
    (m) => m.isCurrentUser || (user?.email && m.email.toLowerCase() === user.email.toLowerCase())
  );
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
    const ownerEmail = user?.email || 'meu@email.com';
    const ownerName = user?.name || 'Você';

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
          name: ownerName,
          email: ownerEmail,
          role: 'owner',
          isCurrentUser: true,
        },
      ],
    };

    const updated = [...workspaces, newWs];
    setWorkspaces(updated);
    await WorkspaceRepository.saveWorkspaces(updated);
    await setActiveWorkspace(newWs.id);

    // Save to cloud in background
    try {
      const client = await SupabaseService.getClient();
      await client.from('workspaces').upsert({
        id: newWs.id,
        name: newWs.name,
        description: newWs.description,
        type: newWs.type,
        invite_code: newWs.inviteCode,
        created_at: newWs.createdAt,
      });
      await client.from('workspace_members').upsert({
        id: `mem-${newWs.id}-owner`,
        workspace_id: newWs.id,
        email: ownerEmail.toLowerCase(),
        name: ownerName,
        role: 'owner',
      });
    } catch {}
  };

  const addMember = async (
    workspaceId: string,
    name: string,
    email: string,
    role: WorkspaceRole
  ) => {
    const cleanEmail = email.trim().toLowerCase();
    const newMember: WorkspaceMember = {
      id: `user-${Date.now()}`,
      name: name.trim(),
      email: cleanEmail,
      role,
      isCurrentUser: false,
    };

    const updated = workspaces.map((w) => {
      if (w.id === workspaceId) {
        return {
          ...w,
          members: [...w.members, newMember],
        };
      }
      return w;
    });

    setWorkspaces(updated);
    await WorkspaceRepository.saveWorkspaces(updated);

    // Persist invitation in Supabase so the recipient gets connected when logging in
    try {
      const client = await SupabaseService.getClient();
      await client.from('workspace_members').upsert({
        id: newMember.id,
        workspace_id: workspaceId,
        email: cleanEmail,
        name: name.trim(),
        role,
      });
    } catch {}
  };

  const updateMemberRole = async (
    workspaceId: string,
    memberId: string,
    role: WorkspaceRole
  ) => {
    let targetMember: WorkspaceMember | undefined;

    const updated = workspaces.map((w) => {
      if (w.id === workspaceId) {
        return {
          ...w,
          members: w.members.map((m) => {
            if (m.id === memberId) {
              targetMember = { ...m, role };
              return targetMember;
            }
            return m;
          }),
        };
      }
      return w;
    });

    setWorkspaces(updated);
    await WorkspaceRepository.saveWorkspaces(updated);

    if (targetMember) {
      try {
        const client = await SupabaseService.getClient();
        await client.from('workspace_members').update({ role }).eq('id', memberId);
      } catch {}
    }
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

    try {
      const client = await SupabaseService.getClient();
      await client.from('workspace_members').delete().eq('id', memberId);
    } catch {}
  };

  const renameWorkspace = async (workspaceId: string, newName: string) => {
    if (!newName.trim()) return;
    const cleanName = newName.trim();

    const updated = workspaces.map((w) => {
      if (w.id === workspaceId) {
        return { ...w, name: cleanName };
      }
      return w;
    });

    setWorkspaces(updated);
    await WorkspaceRepository.saveWorkspaces(updated);

    try {
      const client = await SupabaseService.getClient();
      await client.from('workspaces').update({ name: cleanName }).eq('id', workspaceId);
    } catch {}
  };

  const deleteWorkspace = async (
    workspaceId: string
  ): Promise<{ success: boolean; message: string }> => {
    const target = workspaces.find((w) => w.id === workspaceId);
    if (!target) {
      return { success: false, message: 'Espaço não encontrado.' };
    }

    // Regra estrita: O espaço pessoal (solo) nunca pode ser excluído
    if (target.id === 'ws-solo' || target.type === 'solo') {
      return { success: false, message: 'O espaço pessoal não pode ser excluído.' };
    }

    const updated = workspaces.filter((w) => w.id !== workspaceId);
    if (updated.length === 0) {
      return { success: false, message: 'Não é possível excluir o único espaço restante.' };
    }

    // Se o espaço excluído era o ativo, muda para o espaço solo ou o primeiro restante
    if (activeWorkspaceId === workspaceId) {
      const fallback = updated.find((w) => w.id === 'ws-solo') || updated[0];
      await setActiveWorkspace(fallback.id);
    }

    setWorkspaces(updated);
    await WorkspaceRepository.saveWorkspaces(updated);

    try {
      const client = await SupabaseService.getClient();
      await client.from('workspace_members').delete().eq('workspace_id', workspaceId);
      await client.from('workspaces').delete().eq('id', workspaceId);
    } catch {}

    return { success: true, message: 'Espaço excluído com sucesso.' };
  };

  const joinWorkspaceByCode = async (
    inviteCode: string
  ): Promise<{ success: boolean; message: string }> => {
    if (!user) {
      return { success: false, message: 'Para entrar em um espaço compartilhado, faça login ou crie uma conta gratuita.' };
    }

    try {
      const client = await SupabaseService.getClient();
      const code = inviteCode.trim().toUpperCase();

      const { data, error } = await client
        .from('workspaces')
        .select('*')
        .eq('invite_code', code)
        .single();

      if (error || !data) {
        return { success: false, message: 'Código de convite não encontrado.' };
      }

      const alreadyExists = workspaces.some((w) => w.id === data.id);
      if (alreadyExists) {
        await setActiveWorkspace(data.id);
        return { success: true, message: 'Você já faz parte deste espaço!' };
      }

      const joinedWs: Workspace = {
        id: data.id,
        name: data.name,
        description: data.description || '',
        type: data.type as any,
        inviteCode: data.invite_code,
        createdAt: data.created_at,
        members: [
          {
            id: `user-${Date.now()}`,
            name: user?.name || 'Você',
            email: user?.email || 'meu@email.com',
            role: 'editor',
            isCurrentUser: true,
          },
        ],
      };

      const updated = [...workspaces, joinedWs];
      setWorkspaces(updated);
      await WorkspaceRepository.saveWorkspaces(updated);
      await setActiveWorkspace(joinedWs.id);

      // Register membership in Supabase
      if (user?.email) {
        await client.from('workspace_members').upsert({
          id: `mem-${Date.now()}`,
          workspace_id: data.id,
          email: user.email.toLowerCase().trim(),
          name: user.name || 'Você',
          role: 'editor',
        });
      }

      return { success: true, message: `Conectado com sucesso ao espaço "${data.name}"!` };
    } catch (e: any) {
      return { success: false, message: e?.message || 'Erro ao conectar ao espaço.' };
    }
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
        renameWorkspace,
        deleteWorkspace,
        joinWorkspaceByCode,
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
