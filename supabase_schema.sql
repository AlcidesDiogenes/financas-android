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

-- 3. Tabela de Débitos Recorrentes (Contas Fixas / Assinaturas)
CREATE TABLE IF NOT EXISTS public.recurrings (
    id TEXT PRIMARY KEY,
    workspace_id TEXT REFERENCES public.workspaces(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    amount NUMERIC(12, 2) NOT NULL,
    category TEXT NOT NULL,
    frequency TEXT NOT NULL DEFAULT 'monthly',
    due_day INTEGER NOT NULL,
    is_paid_current_month BOOLEAN DEFAULT FALSE,
    reminder_enabled BOOLEAN DEFAULT TRUE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Tabela de Orçamentos (Tetos de Gastos por Categoria)
CREATE TABLE IF NOT EXISTS public.budgets (
    id TEXT PRIMARY KEY,
    workspace_id TEXT REFERENCES public.workspaces(id) ON DELETE CASCADE,
    category TEXT NOT NULL,
    limit_amount NUMERIC(12, 2) NOT NULL,
    month INTEGER NOT NULL,
    year INTEGER NOT NULL,
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
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recurrings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Permitir workspaces" ON public.workspaces;
DROP POLICY IF EXISTS "Permitir transactions" ON public.transactions;
DROP POLICY IF EXISTS "Permitir recurrings" ON public.recurrings;
DROP POLICY IF EXISTS "Permitir budgets" ON public.budgets;
DROP POLICY IF EXISTS "Permitir goals" ON public.goals;

CREATE POLICY "Permitir workspaces" ON public.workspaces FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Permitir transactions" ON public.transactions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Permitir recurrings" ON public.recurrings FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Permitir budgets" ON public.budgets FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Permitir goals" ON public.goals FOR ALL USING (true) WITH CHECK (true);

-- ==============================================================================
-- HABILITAR TEMPO REAL (REALTIME REPLICATION)
-- Permite que quando uma pessoa cadastrar uma conta, atualize na hora no outro celular
-- ==============================================================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.workspaces;
ALTER PUBLICATION supabase_realtime ADD TABLE public.transactions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.recurrings;
ALTER PUBLICATION supabase_realtime ADD TABLE public.budgets;
ALTER PUBLICATION supabase_realtime ADD TABLE public.goals;
