-- Adicionar coluna de progresso
ALTER TABLE export_jobs ADD COLUMN IF NOT EXISTS progress integer DEFAULT 0;

-- Limpar jobs travados existentes
UPDATE export_jobs 
SET status = 'error', 
    error_message = 'Timeout: job cancelado automaticamente',
    completed_at = NOW()
WHERE status IN ('pending', 'processing') 
  AND created_at < NOW() - INTERVAL '5 minutes';