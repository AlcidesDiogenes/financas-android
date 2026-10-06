import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { Workspace, WorkspaceMember, WorkspaceRole } from './types';
import {
  WorkspaceRepository,
  DEFAULT_WORKSPACES,
  getPersonalWorkspaceId,
  createDefaultPersonalWorkspace,
} from './repository';
import { useAuth } from '../../services/auth/AuthContext';
import { SupabaseService } from '../../services/supabase/supabaseClient';
import { TransactionRepository } from '../transactions/repository';
import { RecurringRepository } from '../recurrings/repository';
import { RecurringMonthRepository } from '../recurrings/monthRepository';
import { BudgetRepository } from '../budgets/repository';
import { GoalRepository } from '../goals/repository';

interface WorkspaceContextType {
  workspaces: Workspace[];
  activeWorkspace: Workspace;
  defaultWorkspaceId: string | null;
  setActiveWorkspace: (id: string) => Promise<void>;
  setDefaultWorkspace: (id: string) => Promise<void>;
  createWorkspace: (name: string, description: string, isShared: boolean) => Promise<void>;
  addMember: (workspaceId: string, name: string, email: string, role: WorkspaceRole) => Promise<void>;
  updateMemberRole: (workspaceId: string, memberId: string, role: WorkspaceRole) => Promise<void>;
  approveMember: (workspaceId: string, memberId: string, role: 'editor' | 'viewer') => Promise<void>;
  rejectMember: (workspaceId: string, memberId: string) => Promise<void>;
  removeMember: (workspaceId: string, memberId: string) => Promise<void>;
  renameWorkspace: (workspaceId: string, newName: string) => Promise<void>;
  transferOwnership: (workspaceId: string, newOwnerEmail: string) => Promise<{ success: boolean; message: string }>;
  deleteWorkspace: (workspaceId: string) => Promise<{ success: boolean; message: string }>;
  leaveWorkspace: (workspaceId: string) => Promise<{ success: boolean; message: string }>;
  joinWorkspaceByCode: (inviteCode: string) => Promise<{ success: boolean; message: string }>;
  currentUserRole: WorkspaceRole;
  canEdit: boolean;
  pendingRequestsCount: number;
  refreshWorkspaces: () => Promise<void>;
}

const migrateLocalSoloData = async (personalWsId: string) => {
  try {
    const [txs, recs, months, budgets, goals] = await Promise.all([
      TransactionRepository.getAll(),
      RecurringRepository.getAll(),
      RecurringMonthRepository.getAll(),
      BudgetRepository.getAll(),
      GoalRepository.getAll(),
    ]);

    if (txs.some((t) => t.workspaceId === 'ws-solo')) {
      const updated = txs.map((t) =>
        t.workspaceId === 'ws-solo' ? { ...t, workspaceId: personalWsId } : t
      );
      await TransactionRepository.saveAll(updated);
    }

    if (recs.some((r) => r.workspaceId === 'ws-solo')) {
      const updated = recs.map((r) =>
        r.workspaceId === 'ws-solo' ? { ...r, workspaceId: personalWsId } : r
      );
      await RecurringRepository.saveAll(updated);
    }

    if (months.some((m) => m.workspaceId === 'ws-solo')) {
      const updated = months.map((m) =>
        m.workspaceId === 'ws-solo' ? { ...m, workspaceId: personalWsId } : m
      );
      await RecurringMonthRepository.saveAll(updated);
    }

    if (budgets.some((b) => b.workspaceId === 'ws-solo')) {
      const updated = budgets.map((b) =>
        b.workspaceId === 'ws-solo' ? { ...b, workspaceId: personalWsId } : b
      );
      await BudgetRepository.saveAll(updated);
    }

    if (goals.some((g) => g.workspaceId === 'ws-solo')) {
      const updated = goals.map((g) =>
        g.workspaceId === 'ws-solo' ? { ...g, workspaceId: personalWsId } : g
      );
      await GoalRepository.saveAll(updated);
    }
  } catch {}
};

const WorkspaceContext = createContext<WorkspaceContextType | undefined>(undefined);

export const WorkspaceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [workspaces, setWorkspaces] = useState<Workspace[]>(DEFAULT_WORKSPACES);
  const [activeWorkspaceId, setActiveWorkspaceIdState] = useState<string>(DEFAULT_WORKSPACES[0].id);
  const [defaultWorkspaceId, setDefaultWorkspaceIdState] = useState<string | null>(null);
  const isInitializedRef = useRef(false);

  useEffect(() => {
    loadWorkspaces();

    // Atualiza espaços e solicitações pendentes ao voltar para o app
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        loadWorkspaces();
      }
    });

    // Polling suave a cada 20s para capturar novos pedidos de entrada em tempo real
    let timer: ReturnType<typeof setInterval> | null = null;
    if (user?.id) {
      timer = setInterval(() => {
        loadWorkspaces();
      }, 20000);
    }

    return () => {
      subscription.remove();
      if (timer) clearInterval(timer);
    };
  }, [user?.id, user?.email]);

  const loadWorkspaces = async () => {
    const isInitialBoot = !isInitializedRef.current;
    isInitializedRef.current = true;

    // No modo offline, permite apenas o espaço pessoal solo
    if (!user) {
      const soloList = [createDefaultPersonalWorkspace()];
      setWorkspaces(soloList);
      setActiveWorkspaceIdState(soloList[0].id);
      return;
    }

    const personalWsId = getPersonalWorkspaceId(user.id);
    let list = await WorkspaceRepository.getWorkspaces();

    // 1. Assegura que o espaço pessoal do usuário autenticado é ws-${user.id} e privado
    const personalWs = createDefaultPersonalWorkspace(user.id, user.name, user.email);

    // Filtra apenas o 'ws-solo' genérico legado
    // Mantém o espaço pessoal principal E todos os outros espaços criados pelo usuário
    const otherWorkspaces = list.filter((w) => w.id !== 'ws-solo' && w.id !== personalWsId);
    list = [personalWs, ...otherWorkspaces];

    // Migra itens locais que estavam vinculados ao antigo 'ws-solo' para o personalWsId deste usuário
    await migrateLocalSoloData(personalWsId);
    await WorkspaceRepository.saveWorkspaces(list);

    // Registra/garante o espaço pessoal deste usuário no Supabase
    try {
      const client = await SupabaseService.getClient();
      await client.from('workspaces').upsert({
        id: personalWsId,
        name: personalWs.name,
        description: personalWs.description,
        type: 'solo',
        invite_code: null,
        created_at: personalWs.createdAt,
      });
      await client.from('workspace_members').upsert({
        id: `mem-${personalWsId}-owner`,
        workspace_id: personalWsId,
        email: user.email.toLowerCase().trim(),
        name: user.name || 'Você',
        role: 'owner',
      });
    } catch {}

    // 2. Busca convites e espaços no Supabase
    if (user?.email) {
      try {
        const client = await SupabaseService.getClient();
        const userEmail = user.email.toLowerCase().trim();
        const { data: memberRows } = await client
          .from('workspace_members')
          .select('workspace_id, role, name, email')
          .eq('email', userEmail);

        if (memberRows) {
          // Filtra espaços aos quais o usuário pertence na nuvem e já foi aprovado
          const approvedCloudWsIds = memberRows
            .filter((m) => m.role !== 'pending')
            .map((m) => m.workspace_id)
            .filter((id) => id !== personalWsId && !id.startsWith('ws-solo'));

          // Remove da lista local apenas espaços de TERCEIROS dos quais o usuário foi removido/rejeitado
          // NUNCA remove espaços criados localmente pelo próprio usuário onde ele é o proprietário (owner)!
          list = list.filter((w) => {
            if (w.id === personalWsId) return true;
            const isLocalOwner = w.members.some(
              (m) =>
                m.role === 'owner' &&
                (m.isCurrentUser || (m.email && m.email.toLowerCase().trim() === userEmail))
            );
            if (isLocalOwner) return true;
            return approvedCloudWsIds.includes(w.id);
          });

          if (approvedCloudWsIds.length > 0) {
            const [remoteWorkspacesRes, allMembersRes] = await Promise.all([
              client.from('workspaces').select('*').in('id', approvedCloudWsIds),
              client.from('workspace_members').select('*').in('workspace_id', approvedCloudWsIds),
            ]);

            const remoteWorkspaces = remoteWorkspacesRes.data;
            const allMembers = allMembersRes.data || [];

            if (remoteWorkspaces) {
              remoteWorkspaces.forEach((rw) => {
                const alreadyHas = list.some((w) => w.id === rw.id);
                const wsMembersFromCloud: WorkspaceMember[] = allMembers
                  .filter((m) => m.workspace_id === rw.id)
                  .map((m) => ({
                    id: m.id,
                    name: m.name,
                    email: m.email,
                    role: m.role as WorkspaceRole,
                    isCurrentUser: m.email?.toLowerCase().trim() === userEmail,
                  }));

                if (!alreadyHas) {
                  list.push({
                    id: rw.id,
                    name: rw.name,
                    description: rw.description || '',
                    type: rw.type || 'shared',
                    inviteCode: rw.invite_code || '',
                    createdAt: rw.created_at,
                    members: wsMembersFromCloud,
                  });
                } else {
                  // Atualiza lista de membros do espaço já existente
                  const existingIdx = list.findIndex((w) => w.id === rw.id);
                  if (existingIdx >= 0 && wsMembersFromCloud.length > 0) {
                    list[existingIdx] = {
                      ...list[existingIdx],
                      members: wsMembersFromCloud,
                    };
                  }
                }
              });
              await WorkspaceRepository.saveWorkspaces(list);
            }
          }
        }
      } catch {}
    }

    setWorkspaces(list);

    // Carrega o espaço padrão configurado pelo usuário
    const savedDefaultId = await WorkspaceRepository.getDefaultWorkspaceId();
    const effectiveDefaultId = savedDefaultId === 'ws-solo' ? personalWsId : savedDefaultId;
    if (savedDefaultId === 'ws-solo') {
      await WorkspaceRepository.setDefaultWorkspaceId(personalWsId);
    }
    setDefaultWorkspaceIdState(effectiveDefaultId);

    // PRESERVAÇÃO RIGOROSA DO ESPAÇO ATIVO:
    // O usuário NUNCA deve ser retirado do espaço em que está navegando no momento!
    const rawActiveId = await WorkspaceRepository.getActiveWorkspaceId();
    const effectiveActiveId = rawActiveId === 'ws-solo' ? personalWsId : rawActiveId;

    setActiveWorkspaceIdState((currentId) => {
      // 1. Se o espaço em que o usuário está atualmente na memória continua existindo na lista, MANTENHA-O!
      if (currentId && list.some((w) => w.id === currentId)) {
        return currentId;
      }
      // 2. Se o espaço ativo persistido no armazenamento local existe na lista, mantenha-o!
      if (effectiveActiveId && list.some((w) => w.id === effectiveActiveId)) {
        return effectiveActiveId;
      }
      // 3. APENAS na primeira inicialização do app (boot frio): se houver um padrão definido, use-o
      if (isInitialBoot && effectiveDefaultId && list.some((w) => w.id === effectiveDefaultId)) {
        WorkspaceRepository.setActiveWorkspaceId(effectiveDefaultId).catch(() => {});
        return effectiveDefaultId;
      }
      // 4. Fallback seguro para o primeiro espaço da lista
      const fallbackId = list[0]?.id || personalWsId;
      WorkspaceRepository.setActiveWorkspaceId(fallbackId).catch(() => {});
      return fallbackId;
    });
  };

  const activeWorkspace =
    workspaces.find((w) => w.id === activeWorkspaceId) || workspaces[0] || DEFAULT_WORKSPACES[0];

  const currentMember = activeWorkspace.members.find(
    (m) => m.isCurrentUser || (user?.email && m.email.toLowerCase() === user.email.toLowerCase())
  );
  const currentUserRole: WorkspaceRole = currentMember ? currentMember.role : 'owner';
  const canEdit = currentUserRole === 'owner' || currentUserRole === 'editor';

  const pendingRequestsCount = workspaces
    .filter((w) => {
      const myMem = w.members.find(
        (m) => m.email.toLowerCase().trim() === user?.email?.toLowerCase().trim()
      );
      return myMem?.role === 'owner';
    })
    .reduce((acc, w) => acc + w.members.filter((m) => m.role === 'pending').length, 0);

  const setActiveWorkspace = async (id: string) => {
    setActiveWorkspaceIdState(id);
    await WorkspaceRepository.setActiveWorkspaceId(id);
  };

  const setDefaultWorkspace = async (id: string) => {
    setDefaultWorkspaceIdState(id);
    await WorkspaceRepository.setDefaultWorkspaceId(id);
    await setActiveWorkspace(id);
  };

  const createWorkspace = async (
    name: string,
    description: string,
    isShared: boolean
  ) => {
    const ownerEmail = user?.email || 'meu@email.com';
    const ownerName = user?.name || 'Você';

    const randomSuffix = Math.random().toString(36).substring(2, 8);
    const newWs: Workspace = {
      id: `ws-${Date.now()}-${randomSuffix}`,
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

    const currentList = await WorkspaceRepository.getWorkspaces();
    const updated = [...currentList.filter((w) => w.id !== newWs.id), newWs];
    setWorkspaces(updated);
    await WorkspaceRepository.saveWorkspaces(updated);
    await setActiveWorkspace(newWs.id);

    // Salva na nuvem no Supabase
    try {
      const client = await SupabaseService.getClient();
      await Promise.all([
        client.from('workspaces').upsert({
          id: newWs.id,
          name: newWs.name,
          description: newWs.description,
          type: newWs.type,
          invite_code: newWs.inviteCode,
          created_at: newWs.createdAt,
        }),
        client.from('workspace_members').upsert({
          id: `mem-${newWs.id}-owner`,
          workspace_id: newWs.id,
          email: ownerEmail.toLowerCase().trim(),
          name: ownerName,
          role: 'owner',
        }),
      ]);
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

  const approveMember = async (
    workspaceId: string,
    memberId: string,
    newRole: 'editor' | 'viewer' = 'editor'
  ) => {
    const updated = workspaces.map((w) => {
      if (w.id === workspaceId) {
        return {
          ...w,
          members: w.members.map((m) =>
            m.id === memberId ? { ...m, role: newRole as WorkspaceRole } : m
          ),
        };
      }
      return w;
    });

    setWorkspaces(updated);
    await WorkspaceRepository.saveWorkspaces(updated);

    try {
      const client = await SupabaseService.getClient();
      await client.from('workspace_members').update({ role: newRole }).eq('id', memberId);
    } catch {}
  };

  const rejectMember = async (workspaceId: string, memberId: string) => {
    await removeMember(workspaceId, memberId);
  };

  const removeMember = async (workspaceId: string, memberId: string) => {
    const targetWs = workspaces.find((w) => w.id === workspaceId);
    const targetMem = targetWs?.members.find((m) => m.id === memberId);

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
      if (targetMem?.email) {
        await client
          .from('workspace_members')
          .delete()
          .eq('workspace_id', workspaceId)
          .eq('email', targetMem.email.toLowerCase().trim());
      }
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

  const transferOwnership = async (
    workspaceId: string,
    newOwnerEmail: string
  ): Promise<{ success: boolean; message: string }> => {
    const cleanEmail = newOwnerEmail.trim().toLowerCase();
    const targetWs = workspaces.find((w) => w.id === workspaceId);
    if (!targetWs) {
      return { success: false, message: 'Espaço não encontrado.' };
    }

    const newOwnerMember = targetWs.members.find(
      (m) => m.email.toLowerCase().trim() === cleanEmail
    );
    if (!newOwnerMember) {
      return { success: false, message: 'O novo proprietário deve ser membro do espaço.' };
    }

    const updated = workspaces.map((w) => {
      if (w.id === workspaceId) {
        return {
          ...w,
          members: w.members.map((m) => {
            if (m.email.toLowerCase().trim() === cleanEmail) {
              return { ...m, role: 'owner' as WorkspaceRole };
            }
            if (m.role === 'owner') {
              return { ...m, role: 'editor' as WorkspaceRole };
            }
            return m;
          }),
        };
      }
      return w;
    });

    setWorkspaces(updated);
    await WorkspaceRepository.saveWorkspaces(updated);

    try {
      const client = await SupabaseService.getClient();
      // Atualiza o novo dono
      await client
        .from('workspace_members')
        .update({ role: 'owner' })
        .eq('workspace_id', workspaceId)
        .eq('email', cleanEmail);

      // Rebaixa o antigo dono para editor
      if (user?.email) {
        await client
          .from('workspace_members')
          .update({ role: 'editor' })
          .eq('workspace_id', workspaceId)
          .eq('email', user.email.toLowerCase().trim());
      }
    } catch {}

    return { success: true, message: `Propriedade transferida com sucesso para ${newOwnerMember.name}!` };
  };

  const deleteWorkspace = async (
    workspaceId: string
  ): Promise<{ success: boolean; message: string }> => {
    const target = workspaces.find((w) => w.id === workspaceId);
    if (!target) {
      return { success: false, message: 'Espaço não encontrado.' };
    }

    // Regra estrita: O espaço pessoal (solo) nunca pode ser excluído
    const personalWsId = user?.id ? getPersonalWorkspaceId(user.id) : 'ws-solo';
    if (target.id === 'ws-solo' || target.type === 'solo' || target.id === personalWsId) {
      return { success: false, message: 'O espaço pessoal não pode ser excluído.' };
    }

    // Regra de Segurança: Apenas o Proprietário pode apagar o espaço
    const isOwner = target.members.some(
      (m) =>
        m.role === 'owner' &&
        (m.isCurrentUser || (user?.email && m.email.toLowerCase() === user.email.toLowerCase()))
    );
    if (!isOwner) {
      return {
        success: false,
        message: 'Apenas o proprietário do espaço tem permissão para excluí-lo. Você pode sair do espaço a qualquer momento.',
      };
    }

    const updated = workspaces.filter((w) => w.id !== workspaceId);
    if (updated.length === 0) {
      return { success: false, message: 'Não é possível excluir o único espaço restante.' };
    }

    // Se o espaço excluído era o ativo, muda para o espaço solo ou o primeiro restante
    if (activeWorkspaceId === workspaceId) {
      const fallback = updated.find((w) => w.type === 'solo' || w.id === personalWsId) || updated[0];
      await setActiveWorkspace(fallback.id);
    }

    setWorkspaces(updated);
    await WorkspaceRepository.saveWorkspaces(updated);

    try {
      const client = await SupabaseService.getClient();
      // Exclui todos os dados associados a este espaço compartilhado no Supabase
      await Promise.all([
        client.from('transactions').delete().eq('workspace_id', workspaceId),
        client.from('recurrings').delete().eq('workspace_id', workspaceId),
        client.from('recurring_month_records').delete().eq('workspace_id', workspaceId),
        client.from('budgets').delete().eq('workspace_id', workspaceId),
        client.from('goals').delete().eq('workspace_id', workspaceId),
        client.from('workspace_members').delete().eq('workspace_id', workspaceId),
        client.from('workspaces').delete().eq('id', workspaceId),
      ]);
    } catch {}

    return { success: true, message: 'Espaço e todos os seus dados foram excluídos com sucesso.' };
  };

  const leaveWorkspace = async (
    workspaceId: string
  ): Promise<{ success: boolean; message: string }> => {
    const target = workspaces.find((w) => w.id === workspaceId);
    if (!target) {
      return { success: false, message: 'Espaço não encontrado.' };
    }

    const personalWsId = user?.id ? getPersonalWorkspaceId(user.id) : 'ws-solo';
    if (target.id === 'ws-solo' || target.type === 'solo' || target.id === personalWsId) {
      return { success: false, message: 'Você não pode sair do seu espaço pessoal.' };
    }

    // Identifica o membro atual
    const userEmail = user?.email?.toLowerCase().trim() || '';
    const currentMem = target.members.find(
      (m) => m.isCurrentUser || (userEmail && m.email.toLowerCase() === userEmail)
    );

    if (currentMem?.role === 'owner') {
      return {
        success: false,
        message: 'Como proprietário, você não pode sair do espaço. Transfira a propriedade para outro membro antes de sair ou exclua o espaço.',
      };
    }

    // Remove localmente o espaço da lista do usuário convidado
    const updated = workspaces.filter((w) => w.id !== workspaceId);
    if (activeWorkspaceId === workspaceId) {
      const fallback = updated.find((w) => w.type === 'solo' || w.id === personalWsId) || updated[0];
      await setActiveWorkspace(fallback.id);
    }

    setWorkspaces(updated);
    await WorkspaceRepository.saveWorkspaces(updated);

    // Remove o usuário da tabela de membros na nuvem
    try {
      const client = await SupabaseService.getClient();
      if (currentMem?.id) {
        await client.from('workspace_members').delete().eq('id', currentMem.id);
      } else if (userEmail) {
        await client
          .from('workspace_members')
          .delete()
          .eq('workspace_id', workspaceId)
          .eq('email', userEmail);
      }
    } catch {}

    return { success: true, message: `Você saiu do espaço "${target.name}" com sucesso.` };
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

      if (data.type === 'solo') {
        return { success: false, message: 'Espaços pessoais são 100% privados e não aceitam novos membros.' };
      }

      const alreadyExists = workspaces.some((w) => w.id === data.id);
      if (alreadyExists) {
        await setActiveWorkspace(data.id);
        return { success: true, message: 'Você já faz parte deste espaço!' };
      }

      const userEmail = user.email.toLowerCase().trim();

      // Verifica se o usuário já tem registro de membro ou solicitação para este espaço no Supabase
      const { data: existingMember } = await client
        .from('workspace_members')
        .select('*')
        .eq('workspace_id', data.id)
        .eq('email', userEmail)
        .maybeSingle();

      if (existingMember) {
        if (existingMember.role === 'pending') {
          return {
            success: true,
            message: `Você já enviou uma solicitação para entrar em "${data.name}". Aguarde o proprietário aprovar seu acesso! ⏳`,
          };
        }
        return { success: true, message: `Você já faz parte do espaço "${data.name}"!` };
      }

      // Registra a solicitação como PENDENTE na nuvem para aprovação do proprietário
      const reqId = `req-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      await client.from('workspace_members').insert({
        id: reqId,
        workspace_id: data.id,
        email: userEmail,
        name: user.name || 'Usuário',
        role: 'pending',
      });

      return {
        success: true,
        message: `Solicitação enviada com sucesso para "${data.name}"! 🎉 O proprietário precisa aprovar sua entrada e definir sua permissão antes que os dados sejam liberados.`,
      };
    } catch (e: any) {
      return { success: false, message: e?.message || 'Erro ao conectar ao espaço.' };
    }
  };

  return (
    <WorkspaceContext.Provider
      value={{
        workspaces,
        activeWorkspace,
        defaultWorkspaceId,
        setActiveWorkspace,
        setDefaultWorkspace,
        createWorkspace,
        addMember,
        updateMemberRole,
        approveMember,
        rejectMember,
        removeMember,
        renameWorkspace,
        transferOwnership,
        deleteWorkspace,
        leaveWorkspace,
        joinWorkspaceByCode,
        currentUserRole,
        canEdit,
        pendingRequestsCount,
        refreshWorkspaces: loadWorkspaces,
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
