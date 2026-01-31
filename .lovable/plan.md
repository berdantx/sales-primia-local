
# Plano: Otimização da Exportação de Leads para Grandes Volumes

## Problema Identificado

A exportação de leads está travando em bases com mais de 50.000 registros porque:
1. A Edge Function atinge o limite de CPU (2 segundos de CPU / ~150s wall-clock)
2. Quando o timeout ocorre, o job fica preso em status "processing" para sempre
3. Todo o processamento ocorre em memória antes do upload

## Estratégia de Solução

Implementar **streaming progressivo** e **detecção de timeout** para garantir que:
- Grandes volumes sejam processados em chunks menores
- Jobs travados sejam automaticamente marcados como erro
- O progresso seja atualizado durante o processamento

## Mudanças Propostas

### 1. Edge Function (export-leads-background)

| Aspecto | Atual | Novo |
|---------|-------|------|
| Processamento | Carrega tudo em memória | Processa em batches de 5.000 |
| Timeout | Silencioso | Detecta e marca como erro |
| Progresso | Nenhum | Atualiza % no banco |
| Upload | Um único arquivo | Stream incremental |
| Limite | Sem limite | Aviso para >50k leads |

**Otimizações:**
- Usar batches menores (5.000 em vez de 1.000 para menos queries)
- Gerar CSV em chunks e fazer upload incremental
- Adicionar timeout safety (marcar erro se demorar >120s)
- Atualizar progresso no banco a cada batch

### 2. Tabela export_jobs

Adicionar campo para rastrear progresso:

```sql
ALTER TABLE export_jobs
ADD COLUMN progress integer DEFAULT 0;
```

### 3. Hook useExportJobs

- Exibir progresso durante processamento
- Mostrar % ao invés de apenas "processando"

### 4. Interface (ExportLeadsDialog)

- Mostrar estimativa de tempo para grandes exportações
- Aviso quando período selecionado pode ter muitos leads

## Detalhes Técnicos

### Nova Lógica de Processamento (Edge Function)

```text
1. Iniciar job → status: "processing"
2. Contar total de leads (query rápida)
3. Se total > 100.000:
   → Avisar que exportação pode demorar
4. Loop de processamento:
   a. Buscar batch de 5.000 leads
   b. Gerar CSV do batch
   c. Acumular em chunks
   d. Atualizar progresso: (processados / total) * 100
5. Upload do CSV completo
6. status: "ready"
```

### Detecção de Timeout

```typescript
const TIMEOUT_MS = 110_000; // 110 segundos (margem de segurança)
const startTime = Date.now();

// A cada batch, verificar tempo
if (Date.now() - startTime > TIMEOUT_MS) {
  throw new Error('Timeout: exportação interrompida por limite de tempo');
}
```

### Limpeza de Jobs Travados

Adicionar verificação no hook para marcar jobs antigos (>5 min processando) como erro.

## Arquivos a Modificar

| Arquivo | Mudança |
|---------|---------|
| `supabase/functions/export-leads-background/index.ts` | Otimização de processamento e timeout |
| `src/hooks/useExportJobs.ts` | Mostrar progresso e limpar jobs travados |
| `src/components/leads/ExportLeadsDialog.tsx` | Aviso para grandes volumes |

## Migração de Banco

```sql
-- Adicionar coluna de progresso
ALTER TABLE export_jobs ADD COLUMN IF NOT EXISTS progress integer DEFAULT 0;

-- Limpar jobs travados existentes
UPDATE export_jobs 
SET status = 'error', 
    error_message = 'Timeout: job cancelado automaticamente',
    completed_at = NOW()
WHERE status IN ('pending', 'processing') 
  AND created_at < NOW() - INTERVAL '5 minutes';
```

## Fluxo Visual do Usuário

```text
┌─────────────────────────────────────────────┐
│  Exportar Leads                        [X]  │
├─────────────────────────────────────────────┤
│                                             │
│  📅 Período: Todo o período             ▼   │
│                                             │
│  ⚠️ Exportações grandes podem demorar       │
│     alguns minutos                          │
│                                             │
│  ☑ Excluir leads de teste                   │
│                                             │
│            [Cancelar]  [Exportar Leads]     │
└─────────────────────────────────────────────┘

Após iniciar:
┌─────────────────────────────────────────────┐
│  🔔 Notificações                            │
├─────────────────────────────────────────────┤
│  📄 leads-2026-01-31.csv                    │
│     ⏳ Processando... 45%                   │
│     ░░░░░░░░░░████████░░░░░░                │
└─────────────────────────────────────────────┘
```

## Resultado Esperado

- Exportações de até 100k leads funcionarão sem travar
- Usuário verá progresso em tempo real
- Jobs travados serão automaticamente limpos
- Interface avisará sobre exportações grandes
