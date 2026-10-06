-- ==============================================================================
-- SCHEMA DO BANCO DE DADOS (SUPABASE POSTGRESQL) - APP FINANÇAS
-- Copie e cole este código no SQL Editor do seu projeto no Supabase (supabase.com)
-- ==============================================================================

-- 1. Tabela de Espaços de Trabalho (Workspaces)
CREATE TABLE IF NOT EXISTS public.workspaces (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    type TEXT NOT NULL DEFAULT 'solo', -- 'solo' ou 'shared'
    invite_code TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 1.1 Tabela de Membros dos Espaços (Vinculação por E-mail)
CREATE TABLE IF NOT EXISTS public.workspace_members (
    id TEXT PRIMARY KEY,
    workspace_id TEXT REFERENCES public.workspaces(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'editor', -- 'owner', 'editor', 'viewer'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Tabela de Transações (Receitas e Despesas)
CREATE TABLE IF NOT EXISTS public.transactions (
    id TEXT PRIMARY KEY,
    workspace_id TEXT REFERENCES public.workspaces(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    amount NUMERIC(12, 2) NOT NULL,
    type TEXT NOT NULL, -- 'income' ou 'expense'
    category TEXT NOT NULL,
    date TIMESTAMP WITH TIME ZONE NOT NULL,
    notes TEXT,
    created_by TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Tabela de Débitos e Proventos Recorrentes (Contas Fixas / Rendas / Assinaturas)
CREATE TABLE IF NOT EXISTS public.recurrings (
    id TEXT PRIMARY KEY,
    workspace_id TEXT REFERENCES public.workspaces(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    amount NUMERIC(12, 2) NOT NULL,
    type TEXT NOT NULL DEFAULT 'expense', -- 'expense' ou 'income'
    category TEXT NOT NULL,
    frequency TEXT NOT NULL DEFAULT 'monthly',
    due_day INTEGER NOT NULL,
    is_paid_current_month BOOLEAN DEFAULT FALSE,
    reminder_enabled BOOLEAN DEFAULT TRUE,
    assigned_to TEXT,
    start_date TEXT, -- Vigência inicial 'AAAA-MM'
    end_date TEXT,   -- Vigência final 'AAAA-MM'
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3.1 Tabela de Faturas e Pagamentos por Competência de Recorrentes
CREATE TABLE IF NOT EXISTS public.recurring_month_records (
    id TEXT PRIMARY KEY,
    recurring_id TEXT REFERENCES public.recurrings(id) ON DELETE CASCADE,
    workspace_id TEXT REFERENCES public.workspaces(id) ON DELETE CASCADE,
    month INTEGER NOT NULL,
    year INTEGER NOT NULL,
    amount NUMERIC(12, 2) NOT NULL,
    is_paid BOOLEAN DEFAULT FALSE,
    paid_at TIMESTAMP WITH TIME ZONE,
    transaction_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(recurring_id, month, year)
);

-- 4. Tabela de Orçamentos (Tetos de Gastos por Categoria)
CREATE TABLE IF NOT EXISTS public.budgets (
    id TEXT PRIMARY KEY,
    workspace_id TEXT REFERENCES public.workspaces(id) ON DELETE CASCADE,
    category TEXT NOT NULL,
    limit_amount NUMERIC(12, 2) NOT NULL,
    month INTEGER NOT NULL,
    year INTEGER NOT NULL,
    start_date TEXT,
    end_date TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Tabela de Metas Financeiras (Goals)
CREATE TABLE IF NOT EXISTS public.goals (
    id TEXT PRIMARY KEY,
    workspace_id TEXT REFERENCES public.workspaces(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    target_amount NUMERIC(12, 2) NOT NULL,
    current_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
    deadline_date TIMESTAMP WITH TIME ZONE NOT NULL,
    icon TEXT NOT NULL,
    color TEXT NOT NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==============================================================================
-- POLÍTICAS DE ACESSO (RLS - ROW LEVEL SECURITY)
-- Permite que o app leia e salve dados utilizando a chave pública (publishable)
-- ==============================================================================
ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recurrings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recurring_month_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Permitir workspaces" ON public.workspaces;
DROP POLICY IF EXISTS "Permitir workspace_members" ON public.workspace_members;
DROP POLICY IF EXISTS "Permitir transactions" ON public.transactions;
DROP POLICY IF EXISTS "Permitir recurrings" ON public.recurrings;
DROP POLICY IF EXISTS "Permitir recurring_month_records" ON public.recurring_month_records;
DROP POLICY IF EXISTS "Permitir budgets" ON public.budgets;
DROP POLICY IF EXISTS "Permitir goals" ON public.goals;

CREATE POLICY "Permitir workspaces" ON public.workspaces FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Permitir workspace_members" ON public.workspace_members FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Permitir transactions" ON public.transactions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Permitir recurrings" ON public.recurrings FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Permitir recurring_month_records" ON public.recurring_month_records FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Permitir budgets" ON public.budgets FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Permitir goals" ON public.goals FOR ALL USING (true) WITH CHECK (true);

-- ==============================================================================
-- HABILITAR TEMPO REAL (REALTIME REPLICATION)
-- Permite que quando uma pessoa cadastrar uma conta, atualize na hora no outro celular
-- ==============================================================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.workspaces;
ALTER PUBLICATION supabase_realtime ADD TABLE public.workspace_members;
ALTER PUBLICATION supabase_realtime ADD TABLE public.transactions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.recurrings;
ALTER PUBLICATION supabase_realtime ADD TABLE public.recurring_month_records;
ALTER PUBLICATION supabase_realtime ADD TABLE public.budgets;
ALTER PUBLICATION supabase_realtime ADD TABLE public.goals;

-- ==============================================================================
-- FUNÇÃO RPC: EXCLUSÃO DEFINITIVA DE CONTA (LGPD / PRIVACIDADE)
-- Permite que o próprio usuário autenticado exclua sua conta em auth.users e todos os dados
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.delete_user_account()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    current_uid UUID;
    user_email_val TEXT;
BEGIN
    current_uid := auth.uid();
    IF current_uid IS NULL THEN
        RAISE EXCEPTION 'Não autenticado';
    END IF;

    -- Obter e-mail do usuário
    SELECT email INTO user_email_val FROM auth.users WHERE id = current_uid;

    -- 1. Excluir dados do workspace solo deste usuário (ws-<uid> e ws-solo)
    DELETE FROM public.transactions WHERE workspace_id IN ('ws-' || current_uid::text, 'ws-solo');
    DELETE FROM public.recurrings WHERE workspace_id IN ('ws-' || current_uid::text, 'ws-solo');
    DELETE FROM public.recurring_month_records WHERE workspace_id IN ('ws-' || current_uid::text, 'ws-solo');
    DELETE FROM public.budgets WHERE workspace_id IN ('ws-' || current_uid::text, 'ws-solo');
    DELETE FROM public.goals WHERE workspace_id IN ('ws-' || current_uid::text, 'ws-solo');
    DELETE FROM public.workspaces WHERE id IN ('ws-' || current_uid::text, 'ws-solo');

    -- 2. Remover associações de membros em workspaces compartilhados
    IF user_email_val IS NOT NULL THEN
        DELETE FROM public.workspace_members WHERE LOWER(email) = LOWER(user_email_val);
    END IF;

    -- 2.1 Excluir workspaces que ficaram sem nenhum membro restante
    DELETE FROM public.workspaces 
    WHERE id NOT IN (SELECT DISTINCT workspace_id FROM public.workspace_members);

    -- 3. Excluir o usuário definitivamente da tabela auth.users do Supabase
    DELETE FROM auth.users WHERE id = current_uid;
END;
$$;
