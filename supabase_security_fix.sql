-- ==============================================================================
-- CORREÇÃO DE SEGURANÇA (RLS) - APP FINANÇAS
-- Substitui as políticas abertas (USING true) por acesso restrito aos membros de
-- cada espaço e corrige a função de exclusão de conta.
-- Execute este arquivo inteiro no SQL Editor do Supabase. Pode ser executado mais
-- de uma vez sem efeitos colaterais.
-- ==============================================================================

BEGIN;

-- ==============================================================================
-- 1. FUNÇÕES AUXILIARES (usadas pelas políticas)
-- SECURITY DEFINER evita recursão de RLS ao consultar workspace_members.
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.my_email()
RETURNS text
LANGUAGE sql
STABLE
SET search_path = public, pg_temp
AS $$
    SELECT lower(trim(coalesce(auth.jwt() ->> 'email', '')));
$$;

CREATE OR REPLACE FUNCTION public.ws_role(ws text)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
    SELECT m.role
    FROM public.workspace_members m
    WHERE m.workspace_id = ws
      AND public.my_email() <> ''
      AND lower(trim(m.email)) = public.my_email()
    ORDER BY CASE m.role WHEN 'owner' THEN 1 WHEN 'editor' THEN 2 WHEN 'viewer' THEN 3 ELSE 4 END
    LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.is_ws_member(ws text)
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path = public, pg_temp
AS $$
    SELECT coalesce(public.ws_role(ws) IN ('owner', 'editor', 'viewer'), false);
$$;

CREATE OR REPLACE FUNCTION public.can_edit_ws(ws text)
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path = public, pg_temp
AS $$
    SELECT coalesce(public.ws_role(ws) IN ('owner', 'editor'), false);
$$;

CREATE OR REPLACE FUNCTION public.is_ws_owner(ws text)
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path = public, pg_temp
AS $$
    SELECT coalesce(public.ws_role(ws) = 'owner', false);
$$;

CREATE OR REPLACE FUNCTION public.ws_has_members(ws text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
    SELECT EXISTS (SELECT 1 FROM public.workspace_members m WHERE m.workspace_id = ws);
$$;

CREATE OR REPLACE FUNCTION public.ws_is_shared(ws text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
    SELECT EXISTS (SELECT 1 FROM public.workspaces w WHERE w.id = ws AND w.type <> 'solo');
$$;

-- ==============================================================================
-- 2. BUSCA DE ESPAÇO POR CÓDIGO DE CONVITE
-- Quem ainda não é membro não enxerga a tabela workspaces; esta função devolve
-- apenas id, nome e tipo do espaço dono do código informado.
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.find_workspace_by_invite_code(p_code text)
RETURNS TABLE (id text, name text, type text)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Não autenticado';
    END IF;

    RETURN QUERY
    SELECT w.id, w.name, w.type
    FROM public.workspaces w
    WHERE w.invite_code = upper(trim(p_code))
      AND w.invite_code <> 'SOLO-PRIVADO'
    LIMIT 1;
END;
$$;

REVOKE ALL ON FUNCTION public.find_workspace_by_invite_code(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.find_workspace_by_invite_code(text) TO authenticated;

-- ==============================================================================
-- 3. REPARO: garante um membro 'owner' em cada espaço pessoal (ws-<uuid>)
-- Sem isso, espaços pessoais antigos sem dono ficariam invisíveis.
-- ==============================================================================
INSERT INTO public.workspace_members (id, workspace_id, email, name, role)
SELECT
    'mem-' || w.id || '-owner',
    w.id,
    lower(trim(u.email)),
    coalesce(u.raw_user_meta_data ->> 'name', 'Você'),
    'owner'
FROM public.workspaces w
JOIN auth.users u ON w.id = 'ws-' || u.id::text
WHERE u.email IS NOT NULL
  AND NOT EXISTS (
      SELECT 1 FROM public.workspace_members m
      WHERE m.workspace_id = w.id AND m.role = 'owner'
  )
ON CONFLICT (id) DO UPDATE SET role = 'owner', email = EXCLUDED.email;

-- ==============================================================================
-- 4. POLÍTICAS DE ACESSO (RLS)
-- ==============================================================================
ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recurrings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recurring_month_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;

-- Remove todas as políticas existentes destas tabelas (inclusive as abertas "Permitir ...")
DO $$
DECLARE
    pol record;
BEGIN
    FOR pol IN
        SELECT schemaname, tablename, policyname
        FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename IN ('workspaces', 'workspace_members', 'transactions', 'recurrings',
                            'recurring_month_records', 'budgets', 'goals')
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', pol.policyname, pol.schemaname, pol.tablename);
    END LOOP;
END;
$$;

-- 4.1 workspaces
CREATE POLICY "ws_select_membros" ON public.workspaces
    FOR SELECT TO authenticated
    USING (public.is_ws_member(id));

-- Qualquer usuário logado cria espaços, mas um id no formato pessoal (ws-<uuid>)
-- só pode ser o do próprio usuário.
CREATE POLICY "ws_insert_logado" ON public.workspaces
    FOR INSERT TO authenticated
    WITH CHECK (
        id <> 'ws-solo'
        AND (
            id = 'ws-' || auth.uid()::text
            OR id !~* '^ws-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
        )
    );

CREATE POLICY "ws_update_dono" ON public.workspaces
    FOR UPDATE TO authenticated
    USING (public.is_ws_owner(id))
    WITH CHECK (public.is_ws_owner(id));

CREATE POLICY "ws_delete_dono" ON public.workspaces
    FOR DELETE TO authenticated
    USING (public.is_ws_owner(id));

-- 4.2 workspace_members
CREATE POLICY "mem_select" ON public.workspace_members
    FOR SELECT TO authenticated
    USING (lower(trim(email)) = public.my_email() OR public.is_ws_member(workspace_id));

CREATE POLICY "mem_insert" ON public.workspace_members
    FOR INSERT TO authenticated
    WITH CHECK (
        -- Dono adiciona qualquer pessoa
        public.is_ws_owner(workspace_id)
        -- Usuário pede entrada em espaço compartilhado (fica pendente até aprovação)
        OR (
            role = 'pending'
            AND lower(trim(email)) = public.my_email()
            AND public.ws_is_shared(workspace_id)
        )
        -- Criador se registra como dono de um espaço ainda sem membros, ou do próprio espaço pessoal
        OR (
            role = 'owner'
            AND public.my_email() <> ''
            AND lower(trim(email)) = public.my_email()
            AND (
                NOT public.ws_has_members(workspace_id)
                OR workspace_id = 'ws-' || auth.uid()::text
            )
        )
    );

CREATE POLICY "mem_update_dono" ON public.workspace_members
    FOR UPDATE TO authenticated
    USING (public.is_ws_owner(workspace_id))
    WITH CHECK (public.is_ws_owner(workspace_id));

-- Dono remove membros; qualquer membro pode remover a si mesmo (sair do espaço)
CREATE POLICY "mem_delete" ON public.workspace_members
    FOR DELETE TO authenticated
    USING (public.is_ws_owner(workspace_id) OR lower(trim(email)) = public.my_email());

-- 4.3 Tabelas de dados: membros leem; owner/editor escrevem
DO $$
DECLARE
    t text;
BEGIN
    FOREACH t IN ARRAY ARRAY['transactions', 'recurrings', 'recurring_month_records', 'budgets', 'goals']
    LOOP
        EXECUTE format(
            'CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING (public.is_ws_member(workspace_id))',
            t || '_select_membros', t);
        EXECUTE format(
            'CREATE POLICY %I ON public.%I FOR INSERT TO authenticated WITH CHECK (public.can_edit_ws(workspace_id))',
            t || '_insert_editores', t);
        EXECUTE format(
            'CREATE POLICY %I ON public.%I FOR UPDATE TO authenticated USING (public.can_edit_ws(workspace_id)) WITH CHECK (public.can_edit_ws(workspace_id))',
            t || '_update_editores', t);
        EXECUTE format(
            'CREATE POLICY %I ON public.%I FOR DELETE TO authenticated USING (public.can_edit_ws(workspace_id))',
            t || '_delete_editores', t);
    END LOOP;
END;
$$;

-- ==============================================================================
-- 5. FUNÇÃO RPC: EXCLUSÃO DEFINITIVA DE CONTA (LGPD)
-- - Apaga apenas o espaço pessoal do próprio usuário (nunca o 'ws-solo' legado).
-- - Espaços compartilhados em que ele é o único dono: o membro aprovado mais
--   antigo vira dono; sem outros membros, o espaço e seus dados são apagados.
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.delete_user_account()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    current_uid UUID;
    user_email_val TEXT;
    personal_ws TEXT;
    ws RECORD;
    heir_id TEXT;
BEGIN
    current_uid := auth.uid();
    IF current_uid IS NULL THEN
        RAISE EXCEPTION 'Não autenticado';
    END IF;

    personal_ws := 'ws-' || current_uid::text;
    SELECT lower(trim(email)) INTO user_email_val FROM auth.users WHERE id = current_uid;

    -- 1. Espaço pessoal deste usuário
    DELETE FROM public.recurring_month_records WHERE workspace_id = personal_ws;
    DELETE FROM public.transactions WHERE workspace_id = personal_ws;
    DELETE FROM public.recurrings WHERE workspace_id = personal_ws;
    DELETE FROM public.budgets WHERE workspace_id = personal_ws;
    DELETE FROM public.goals WHERE workspace_id = personal_ws;
    DELETE FROM public.workspace_members WHERE workspace_id = personal_ws;
    DELETE FROM public.workspaces WHERE id = personal_ws;

    IF user_email_val IS NOT NULL AND user_email_val <> '' THEN
        -- 2. Espaços compartilhados em que o usuário é dono
        FOR ws IN
            SELECT DISTINCT m.workspace_id
            FROM public.workspace_members m
            WHERE lower(trim(m.email)) = user_email_val
              AND m.role = 'owner'
              AND m.workspace_id IS NOT NULL
        LOOP
            -- Já existe outro dono: nada a fazer
            IF EXISTS (
                SELECT 1 FROM public.workspace_members o
                WHERE o.workspace_id = ws.workspace_id
                  AND o.role = 'owner'
                  AND lower(trim(o.email)) <> user_email_val
            ) THEN
                CONTINUE;
            END IF;

            heir_id := NULL;
            SELECT o.id INTO heir_id
            FROM public.workspace_members o
            WHERE o.workspace_id = ws.workspace_id
              AND o.role IN ('editor', 'viewer')
              AND lower(trim(o.email)) <> user_email_val
            ORDER BY o.created_at ASC NULLS LAST, o.id
            LIMIT 1;

            IF heir_id IS NOT NULL THEN
                UPDATE public.workspace_members SET role = 'owner' WHERE id = heir_id;
            ELSE
                DELETE FROM public.recurring_month_records WHERE workspace_id = ws.workspace_id;
                DELETE FROM public.transactions WHERE workspace_id = ws.workspace_id;
                DELETE FROM public.recurrings WHERE workspace_id = ws.workspace_id;
                DELETE FROM public.budgets WHERE workspace_id = ws.workspace_id;
                DELETE FROM public.goals WHERE workspace_id = ws.workspace_id;
                DELETE FROM public.workspace_members WHERE workspace_id = ws.workspace_id;
                DELETE FROM public.workspaces WHERE id = ws.workspace_id;
            END IF;
        END LOOP;

        -- 3. Remove todas as associações restantes deste e-mail
        DELETE FROM public.workspace_members WHERE lower(trim(email)) = user_email_val;
    END IF;

    -- 4. Exclui o usuário da autenticação
    DELETE FROM auth.users WHERE id = current_uid;
END;
$$;

REVOKE ALL ON FUNCTION public.delete_user_account() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.delete_user_account() TO authenticated;

COMMIT;

-- ==============================================================================
-- 6. CONFERÊNCIA: espaços que continuam sem dono (ficarão invisíveis no app)
-- Se esta consulta retornar linhas, envie o resultado para análise.
-- ==============================================================================
SELECT w.id, w.name, w.type, w.created_at
FROM public.workspaces w
WHERE NOT EXISTS (
    SELECT 1 FROM public.workspace_members m
    WHERE m.workspace_id = w.id AND m.role = 'owner'
);
