
# Backup Client-Side (Processamento no Navegador)

## Ideia
Seguir o mesmo padrao do `useClientSideExport` que ja existe para leads: o navegador busca os dados tabela por tabela, em lotes de 1000, monta o JSON final localmente e faz o download. Sem depender de Edge Function, sem timeout.

## Como Funciona Hoje (problema)
1. Frontend chama Edge Function `export-backup`
2. Edge Function busca TODAS as tabelas com `service_role`
3. Monta um JSON enorme na memoria do servidor
4. Retorna tudo de uma vez
5. Timeout de 60s estoura antes de terminar

## Como Vai Funcionar (solucao)
1. Frontend busca cada tabela diretamente via `supabase.from(tabela).select('*')` com paginacao
2. O RLS filtra automaticamente (master ve tudo, user ve so seus clientes)
3. Progresso visual em tempo real (tabela X de Y, registro Z de W)
4. Monta o JSON no browser e faz download como arquivo
5. Registra o log no `backup_logs` ao final

## Detalhes Tecnicos

### Novo hook: `src/hooks/useClientSideBackup.ts`

Inspirado no `useClientSideExport`, com:

- Lista de tabelas para exportar (mesma lista do `AVAILABLE_TABLES`)
- Loop por cada tabela, buscando em lotes de 1000 via `supabase.from(table).select('*').range(offset, offset+999)`
- Progresso granular: qual tabela esta processando, quantos registros ja buscou
- Cancelamento a qualquer momento via `useRef`
- Ao final, monta o objeto JSON com metadados e faz download via `Blob` + `URL.createObjectURL`
- Registra o resultado em `backup_logs` via insert direto

Estados de progresso:
```text
idle -> counting -> exporting (tabela por tabela) -> generating -> complete
                                                                -> error
                                                                -> cancelled
```

### Atualizar `src/pages/BackupDashboard.tsx`

- Substituir a chamada `supabase.functions.invoke('export-backup')` pelo novo hook `useClientSideBackup`
- Adicionar barra de progresso mostrando:
  - Tabela atual (ex: "Exportando transactions... 3/21")
  - Registros processados na tabela atual
  - Percentual geral
- Botao de cancelar durante a exportacao
- Manter todo o restante (KPIs, historico, health check)

### Edge Function `export-backup`

- Manter como esta (nao remover) para uso futuro ou via API
- Nenhuma alteracao necessaria

### Fluxo de Dados

```text
Browser                          Supabase (RLS)
  |                                   |
  |-- select * from transactions ---->|
  |<---- lote 1 (1000 registros) -----|
  |<---- lote 2 (1000 registros) -----|
  |<---- lote 3 (909 registros)  -----|
  |                                   |
  |-- select * from eduzz_trans ----->|
  |<---- lote 1 (1000 registros) -----|
  |<---- ...                     -----|
  |                                   |
  | (repete para cada tabela)         |
  |                                   |
  |-- insert into backup_logs ------->|
  |                                   |
  [download JSON via Blob]
```

### Vantagens
- Sem timeout (nao depende de Edge Function)
- Progresso visual em tempo real
- Pode cancelar a qualquer momento
- RLS aplicado automaticamente (seguranca mantida)
- Mesmo padrao ja usado na exportacao de leads

### Arquivos Alterados
1. **Criar** `src/hooks/useClientSideBackup.ts` - hook com toda a logica de exportacao client-side
2. **Editar** `src/pages/BackupDashboard.tsx` - usar o novo hook, adicionar barra de progresso e botao cancelar
