-- Permitir leads sem email (apenas com telefone)
ALTER TABLE public.leads ALTER COLUMN email DROP NOT NULL;