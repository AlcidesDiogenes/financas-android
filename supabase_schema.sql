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
-- Aqui o RLS é apenas ligado (sem políticas = nenhum acesso). As políticas por
-- membro do espaço, as funções auxiliares e a função de exclusão de conta ficam em
-- supabase_security_fix.sql, que deve ser executado logo após este arquivo.
-- ==============================================================================
ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recurrings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recurring_month_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;


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
-- 6. ATUALIZAÇÕES DEFENSIVAS DE COLUNAS E ÍNDICES DE ALTA PERFORMANCE
-- ==============================================================================
-- Garantir tabela recurring_month_records caso tenha sido omitida em versões antigas
CREATE TABLE IF NOT EXISTS public.recurring_month_records (
    id TEXT PRIMARY KEY,
    recurring_id TEXT,
    workspace_id TEXT,
    month INTEGER NOT NULL DEFAULT EXTRACT(MONTH FROM CURRENT_DATE),
    year INTEGER NOT NULL DEFAULT EXTRACT(YEAR FROM CURRENT_DATE),
    amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
    is_paid BOOLEAN DEFAULT FALSE,
    paid_at TIMESTAMP WITH TIME ZONE,
    transaction_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Garantir colunas de controle e datas em todas as tabelas
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

ALTER TABLE public.recurrings ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
ALTER TABLE public.recurrings ADD COLUMN IF NOT EXISTS start_date TEXT;
ALTER TABLE public.recurrings ADD COLUMN IF NOT EXISTS end_date TEXT;

ALTER TABLE public.recurring_month_records ADD COLUMN IF NOT EXISTS month INTEGER DEFAULT EXTRACT(MONTH FROM CURRENT_DATE);
ALTER TABLE public.recurring_month_records ADD COLUMN IF NOT EXISTS year INTEGER DEFAULT EXTRACT(YEAR FROM CURRENT_DATE);
ALTER TABLE public.recurring_month_records ADD COLUMN IF NOT EXISTS year_month TEXT;
ALTER TABLE public.recurring_month_records ADD COLUMN IF NOT EXISTS amount NUMERIC(12, 2);
ALTER TABLE public.recurring_month_records ADD COLUMN IF NOT EXISTS transaction_id TEXT;
ALTER TABLE public.recurring_month_records ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

ALTER TABLE public.budgets ADD COLUMN IF NOT EXISTS month INTEGER DEFAULT EXTRACT(MONTH FROM CURRENT_DATE);
ALTER TABLE public.budgets ADD COLUMN IF NOT EXISTS year INTEGER DEFAULT EXTRACT(YEAR FROM CURRENT_DATE);
ALTER TABLE public.budgets ADD COLUMN IF NOT EXISTS start_date TEXT;
ALTER TABLE public.budgets ADD COLUMN IF NOT EXISTS end_date TEXT;
ALTER TABLE public.budgets ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

ALTER TABLE public.goals ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Índices de busca rápida (garante velocidade sem depender de colunas ausentes)
CREATE INDEX IF NOT EXISTS idx_transactions_workspace_date ON public.transactions(workspace_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_recurrings_workspace ON public.recurrings(workspace_id);
CREATE INDEX IF NOT EXISTS idx_recurring_month_records_workspace ON public.recurring_month_records(workspace_id);
CREATE INDEX IF NOT EXISTS idx_budgets_workspace ON public.budgets(workspace_id);
CREATE INDEX IF NOT EXISTS idx_goals_workspace ON public.goals(workspace_id);
CREATE INDEX IF NOT EXISTS idx_workspace_members_email ON public.workspace_members(email);
CREATE INDEX IF NOT EXISTS idx_workspaces_invite_code ON public.workspaces(invite_code);
CREATE UNIQUE INDEX IF NOT EXISTS idx_workspaces_invite_code_unique ON public.workspaces(invite_code) WHERE invite_code IS NOT NULL AND invite_code != 'SOLO-PRIVADO';


