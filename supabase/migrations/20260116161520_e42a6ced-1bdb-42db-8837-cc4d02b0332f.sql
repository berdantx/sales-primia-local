-- Inserir configuração para controle de cadastro (desabilitado por padrão)
INSERT INTO public.app_settings (key, value, updated_by)
VALUES ('signup_enabled', 'false', NULL)
ON CONFLICT (key) DO NOTHING;