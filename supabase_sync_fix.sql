-- ==============================================================================
-- CORREÇÃO DE SINCRONIZAÇÃO (NÍVEL 2) - APP FINANÇAS
-- Acrescenta as colunas que o app passou a enviar e garante as colunas de controle.
-- Apenas ADD COLUMN IF NOT EXISTS: seguro para qualquer versão do app e pode ser
-- executado mais de uma vez.
-- ==============================================================================

BEGIN;

-- Campos que antes ficavam só no aparelho
ALTER TABLE public.recurrings   ADD COLUMN IF NOT EXISTS is_paused BOOLEAN DEFAULT FALSE;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS assigned_to TEXT;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS is_recurring_generated BOOLEAN DEFAULT FALSE;

-- Colunas de controle usadas pela sincronização (o app não tem mais envio "sem updated_at")
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
ALTER TABLE public.recurrings   ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
ALTER TABLE public.recurrings   ADD COLUMN IF NOT EXISTS start_date TEXT;
ALTER TABLE public.recurrings   ADD COLUMN IF NOT EXISTS end_date TEXT;
ALTER TABLE public.recurring_month_records ADD COLUMN IF NOT EXISTS year_month TEXT;
ALTER TABLE public.recurring_month_records ADD COLUMN IF NOT EXISTS amount NUMERIC(12, 2);
ALTER TABLE public.recurring_month_records ADD COLUMN IF NOT EXISTS transaction_id TEXT;
ALTER TABLE public.recurring_month_records ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
ALTER TABLE public.budgets      ADD COLUMN IF NOT EXISTS start_date TEXT;
ALTER TABLE public.budgets      ADD COLUMN IF NOT EXISTS end_date TEXT;
ALTER TABLE public.budgets      ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
ALTER TABLE public.goals        ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

COMMIT;

-- Conferência: deve listar as 3 colunas novas
SELECT table_name, column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND (table_name, column_name) IN (
      ('recurrings', 'is_paused'),
      ('transactions', 'assigned_to'),
      ('transactions', 'is_recurring_generated')
  )
ORDER BY table_name, column_name;
