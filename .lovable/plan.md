
# Corrigir Download de Backup

## Problema Identificado
A funcao de backup nao esta respondendo corretamente. O erro "Failed to send a request to the Edge Function" indica que a funcao nao consegue ser alcancada pelo navegador, provavelmente por headers CORS incompletos.

## Causa Raiz
Os headers CORS na funcao `export-backup` estao incompletos. Faltam headers obrigatorios que o cliente Supabase envia automaticamente:
- `x-supabase-client-platform`
- `x-supabase-client-platform-version`
- `x-supabase-client-runtime`
- `x-supabase-client-runtime-version`

## Solucao

### Passo 1: Atualizar CORS Headers
Arquivo: `supabase/functions/export-backup/index.ts`

Substituir os headers CORS atuais:
```typescript
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};
```

### Passo 2: Re-deploy da funcao
Fazer o deploy da funcao `export-backup` para aplicar as correcoes.

### Impacto
- Nenhuma mudanca no frontend ou na logica de backup
- Apenas correcao de headers e re-deploy
- O download deve iniciar automaticamente apos a correcao
