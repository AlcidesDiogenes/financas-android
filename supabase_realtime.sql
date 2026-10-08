-- ==============================================================================
-- TEMPO REAL (REALTIME) - APP FINANÇAS
-- Garante que as tabelas do app estejam na publicação do Realtime do Supabase.
-- As regras de acesso (RLS) valem também para o tempo real: cada usuário só recebe
-- as mudanças dos espaços de que participa. Pode ser executado mais de uma vez.
-- ==============================================================================

DO $$
DECLARE
    t text;
BEGIN
    FOREACH t IN ARRAY ARRAY['workspaces', 'workspace_members', 'transactions', 'recurrings',
                             'recurring_month_records', 'budgets', 'goals', 'goal_transactions']
    LOOP
        IF NOT EXISTS (
            SELECT 1 FROM pg_publication_tables
            WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = t
        ) THEN
            EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', t);
        END IF;
    END LOOP;
END;
$$;

-- Conferência: deve listar as 8 tabelas
SELECT tablename
FROM pg_publication_tables
WHERE pubname = 'supabase_realtime' AND schemaname = 'public'
ORDER BY tablename;
