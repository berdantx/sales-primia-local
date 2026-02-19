
# Completar Backup da Estrutura do Banco de Dados

## Status Atual
- Edge Function `export-schema` existe mas usa RPC inexistente (`execute_readonly_query`)
- Funcao do banco `get_database_schema()` nao foi criada (migracao nao executou)
- Hook `useClientSideBackup.ts` nao integra o schema
- Dashboard nao tem opcao de incluir estrutura

## Passos para Completar

### 1. Criar funcao do banco `get_database_schema()` (migracao SQL)
Funcao que consulta o catalogo do PostgreSQL e retorna JSON com:
- Tabelas e colunas (nome, tipo, nullable, default)
- Indexes
- Politicas RLS (nome, tabela, comando, expressao)
- Status de RLS por tabela
- Funcoes publicas (nome, argumentos, definicao)
- Triggers
- Foreign keys

### 2. Reescrever Edge Function `supabase/functions/export-schema/index.ts`
Simplificar para apenas:
- Validar autenticacao do usuario
- Chamar `adminClient.rpc('get_database_schema')`
- Retornar o resultado

Isso elimina todas as queries individuais e a dependencia do RPC `execute_readonly_query` que nao existe.

### 3. Atualizar `src/hooks/useClientSideBackup.ts`
- Adicionar parametro `includeSchema?: boolean` ao `startBackup`
- Se `includeSchema` for true, chamar `supabase.functions.invoke('export-schema')` antes de iniciar a exportacao de dados
- Incluir resultado na chave `schema` do JSON final
- Adicionar status "Exportando estrutura do banco..." no progresso

### 4. Atualizar `src/pages/BackupDashboard.tsx`
- Adicionar checkbox "Incluir estrutura do banco de dados" (marcado por padrao)
- Passar `includeSchema` para o `startBackup`
- Mostrar etapa de schema no indicador de progresso

## Estrutura final do JSON de backup

```text
{
  "backup_info": { ... },
  "schema": {                         // Novo - opcional
    "exported_at": "2026-02-19T...",
    "tables": [...],
    "indexes": [...],
    "rls_policies": [...],
    "functions": [...],
    "triggers": [...],
    "foreign_keys": [...]
  },
  "data": { ... }
}
```

## Arquivos alterados
1. Migracao SQL -- criar funcao `get_database_schema()`
2. `supabase/functions/export-schema/index.ts` -- simplificar para usar RPC
3. `src/hooks/useClientSideBackup.ts` -- integrar chamada de schema
4. `src/pages/BackupDashboard.tsx` -- adicionar checkbox de estrutura
