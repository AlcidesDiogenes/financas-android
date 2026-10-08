import { SupabaseService } from './supabaseClient';

// Tempo real: escuta as mudanças feitas por outros membros (ou outros aparelhos do mesmo
// usuário) e avisa o app para sincronizar. As regras de acesso (RLS) do banco valem aqui:
// cada usuário só recebe as mudanças dos espaços de que participa.

const DATA_TABLES = ['transactions', 'recurrings', 'recurring_month_records', 'budgets', 'goals'] as const;
const WORKSPACE_TABLES = ['workspaces', 'workspace_members'] as const;

// Espera para agrupar vários avisos seguidos numa única sincronização
const DEBOUNCE_MS = 2000;

export interface RealtimeHandlers {
  onDataChanged: () => void;
  onWorkspacesChanged: () => void;
}

// Inicia a escuta e devolve a função que a encerra.
export async function subscribeToCloudChanges(userId: string, handlers: RealtimeHandlers): Promise<() => void> {
  const client = await SupabaseService.getClient();
  const personalWsId = `ws-${userId}`;
  let dataTimer: ReturnType<typeof setTimeout> | null = null;
  let workspacesTimer: ReturnType<typeof setTimeout> | null = null;

  const scheduleData = () => {
    if (dataTimer) clearTimeout(dataTimer);
    dataTimer = setTimeout(() => {
      dataTimer = null;
      handlers.onDataChanged();
    }, DEBOUNCE_MS);
  };

  const scheduleWorkspaces = () => {
    if (workspacesTimer) clearTimeout(workspacesTimer);
    workspacesTimer = setTimeout(() => {
      workspacesTimer = null;
      handlers.onWorkspacesChanged();
    }, DEBOUNCE_MS);
  };

  let channel = client.channel(`financas-sync-${userId}`);

  for (const table of DATA_TABLES) {
    channel = channel.on('postgres_changes', { event: '*', schema: 'public', table }, scheduleData);
  }

  for (const table of WORKSPACE_TABLES) {
    channel = channel.on('postgres_changes', { event: '*', schema: 'public', table }, (payload) => {
      const row = (payload.new && Object.keys(payload.new).length > 0 ? payload.new : payload.old) as Record<
        string,
        unknown
      >;
      const workspaceId = table === 'workspaces' ? row?.id : row?.workspace_id;
      // O próprio app regrava o espaço pessoal a cada carregamento; reagir a isso
      // recarregaria os espaços em ciclo infinito.
      if (workspaceId === personalWsId) return;
      scheduleWorkspaces();
    });
  }

  channel.subscribe();

  return () => {
    if (dataTimer) clearTimeout(dataTimer);
    if (workspacesTimer) clearTimeout(workspacesTimer);
    client.removeChannel(channel);
  };
}
