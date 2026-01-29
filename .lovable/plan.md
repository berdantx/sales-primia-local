
# Plano: Exportação de Leads em Segundo Plano com Notificações

## Visão Geral da Solução

A ideia é excelente e resolve definitivamente o problema de timeout! Vamos implementar um sistema onde:

1. **O usuário solicita a exportação** → O sistema inicia o processamento em segundo plano
2. **Edge Function processa os dados** → Carrega os leads em lotes e salva o CSV no Storage
3. **Notificação aparece** → Quando pronto, o ícone de sino mostra um badge vermelho
4. **Download disponível** → O usuário clica e baixa o arquivo completo

```text
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  Usuário clica  │────▶│  Edge Function   │────▶│  Storage (CSV)  │
│  "Exportar"     │     │  (background)    │     │  arquivo salvo  │
└─────────────────┘     └────────┬─────────┘     └────────┬────────┘
                                 │                        │
                                 ▼                        ▼
                        ┌──────────────────┐     ┌─────────────────┐
                        │  Tabela exports  │────▶│  Notificação    │
                        │  status: ready   │     │  no Header      │
                        └──────────────────┘     └─────────────────┘
```

---

## O Que Será Implementado

### 1. Nova Tabela no Banco: `export_jobs`
Registra cada solicitação de exportação com status e caminho do arquivo:

| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | uuid | ID único |
| user_id | uuid | Quem solicitou |
| client_id | uuid | Cliente filtrado (opcional) |
| export_type | text | 'leads', 'transactions', etc. |
| status | text | 'pending', 'processing', 'ready', 'error' |
| file_path | text | Caminho no Storage |
| file_name | text | Nome do arquivo para download |
| total_records | int | Total de registros exportados |
| filters | jsonb | Filtros aplicados (datas, etc.) |
| created_at | timestamp | Data da solicitação |
| completed_at | timestamp | Data de conclusão |
| error_message | text | Mensagem de erro (se houver) |

### 2. Nova Edge Function: `export-leads-background`
- Recebe os filtros (cliente, datas, etc.)
- Cria registro na tabela `export_jobs` com status 'pending'
- Retorna imediatamente para o usuário (não bloqueia)
- Usa `EdgeRuntime.waitUntil()` para processar em segundo plano
- Busca leads em lotes de 500 (evita timeout)
- Gera CSV com BOM para Excel
- Salva no bucket `exports` do Storage
- Atualiza status para 'ready' quando terminar

### 3. Novo Bucket no Storage: `exports`
- Armazena os arquivos CSV gerados
- URLs assinadas com expiração de 24h para download seguro
- Política de limpeza automática após 7 dias

### 4. Sistema de Notificações no Header
- Badge vermelho no ícone de sino quando há exports prontos
- Dropdown mostrando lista de exportações recentes
- Botão de download para cada arquivo pronto
- Indicador de progresso para exports em andamento

### 5. Atualização da Página de Leads
- Botão "Exportar" agora inicia o job em segundo plano
- Toast informando "Exportação iniciada! Você será notificado quando estiver pronta."
- Não trava a interface

---

## Fluxo do Usuário

1. **Usuário clica em "Exportar CSV"**
   - Toast aparece: "Exportação iniciada! Você será notificado quando estiver pronta."
   - Pode continuar navegando normalmente

2. **Processamento em segundo plano** (30 segundos a 2 minutos)
   - Edge Function busca todos os ~47k leads
   - Gera arquivo CSV
   - Salva no Storage

3. **Notificação aparece**
   - Badge vermelho no sino do Header
   - Dropdown mostra: "Leads exportados (47.058 registros) - Baixar"

4. **Download**
   - Clique gera URL assinada
   - Download inicia automaticamente
   - Arquivo some da lista após 24h

---

## Arquivos a Serem Criados/Modificados

| Arquivo | Ação |
|---------|------|
| `supabase/functions/export-leads-background/index.ts` | Criar |
| `src/components/layout/NotificationsDropdown.tsx` | Criar |
| `src/hooks/useExportJobs.ts` | Criar |
| `src/components/layout/Header.tsx` | Modificar |
| `src/pages/Leads.tsx` | Modificar |

---

## Detalhes Técnicos

### Edge Function com Background Task

```typescript
// Padrão para não bloquear a resposta
Deno.serve(async (req) => {
  // Cria o job no banco
  const job = await createExportJob(filters);
  
  // Inicia processamento em background
  EdgeRuntime.waitUntil(processExport(job.id, filters));
  
  // Retorna imediatamente
  return new Response(JSON.stringify({ 
    message: 'Exportação iniciada',
    jobId: job.id 
  }));
});
```

### Polling para Atualização de Status

O componente de notificações fará polling a cada 10 segundos para verificar se há exports prontos:

```typescript
const { data: pendingExports } = useQuery({
  queryKey: ['export-jobs'],
  queryFn: fetchExportJobs,
  refetchInterval: 10000, // 10 segundos
});
```

### Limpeza Automática

Uma função SQL agendada pode limpar arquivos antigos:
- Exports com mais de 7 dias são deletados
- Previne acúmulo de arquivos no Storage

---

## Benefícios

- **Sem timeout**: Processamento não depende da conexão do usuário
- **UX fluida**: Usuário não fica esperando, pode continuar trabalhando
- **Escalável**: Funciona para 50k, 100k, 500k leads
- **Histórico**: Lista de exportações recentes sempre disponível
- **Seguro**: URLs assinadas com expiração

Essa solução é robusta e segue os padrões já existentes no seu projeto (como o sistema de backup).
