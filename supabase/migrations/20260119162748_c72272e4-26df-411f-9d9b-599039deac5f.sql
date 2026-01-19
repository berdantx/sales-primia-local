-- Primeiro, remover a política restritiva existente
DROP POLICY IF EXISTS "Authenticated users can view app settings" ON public.app_settings;

-- Criar política permissiva para leitura pública (para que o branding funcione na página de login)
CREATE POLICY "Anyone can view app settings" 
ON public.app_settings 
FOR SELECT 
USING (true);